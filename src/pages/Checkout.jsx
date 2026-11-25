// Checkout: customer details -> placeOrder -> payment destination (per chosen currency) -> receipt upload.
// All amounts come from the server (Money / pay.amount); the client never converts currencies.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, ImagePlus, ShoppingBag } from 'lucide-react';
import { errorMessage, placeOrder, prepareImage, submitReceipt } from '../api.js';
import Img from '../components/Img.jsx';
import { Price } from '../components/ProductCard.jsx';
import { ROUTES, clearCart, copyText, haptic, showToast, tg, useCart, useCurrency, useMainButton } from '../store.js';
import { currencyLabel, formatAmount, toEnDigits, toFaDigits } from '../lib/fa.js';
import { summarize, useCartProducts } from './Cart.jsx';

const inputCls =
  'h-12 w-full rounded-xl border bg-white px-3 text-base text-ink outline-none transition-colors focus:border-navy-700';

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function CopyRow({ label, value, shown, ltr = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-page p-3">
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className={`mt-0.5 break-all text-base font-extrabold text-ink ${ltr ? 'text-left' : ''}`} dir={ltr ? 'ltr' : undefined}>
          {shown ?? value}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-outline shrink-0"
        onClick={() => {
          haptic('light');
          copyText(value, 'کپی شد');
        }}
        aria-label={`کپی ${label}`}
      >
        <Copy className="size-4" aria-hidden="true" />
        کپی
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="shell flex flex-col items-center py-16 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-tile text-muted">
        <ShoppingBag className="size-9" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-ink">سبد خرید شما خالی است</h1>
      <p className="mt-2 text-sm text-muted">برای ثبت سفارش ابتدا محصولی به سبد اضافه کنید.</p>
      <Link to={ROUTES.home} className="btn btn-navy mt-6">
        مشاهده محصولات
        <ArrowLeft className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

const FIELD_NAMES = ['name', 'phone', 'address', 'note'];
const FIELD_MESSAGES = {
  name: 'نام و نام خانوادگی را وارد کنید (حداقل ۲ حرف).',
  phone: 'شماره تماس معتبر وارد کنید (۸ تا ۱۵ رقم).',
  address: 'نشانی کامل را وارد کنید (حداقل ۱۰ حرف).',
  note: 'توضیحات نامعتبر است.',
};

function receiptErrorMessage(err) {
  switch (err && err.code) {
    case 'TOO_LARGE':
      return 'حجم تصویر زیاد است؛ تصویر کوچک‌تری انتخاب کنید.';
    case 'BAD_STATE':
      return 'برای این سفارش دیگر نمی‌توان رسید فرستاد.';
    case 'NOT_FOUND':
      return 'سفارش پیدا نشد.';
    case 'STORAGE_ERROR':
      return 'ذخیره رسید انجام نشد؛ دوباره تلاش کنید.';
    default:
      return errorMessage(err);
  }
}

export default function Checkout() {
  const cart = useCart();
  const { currency, canUseAfn, set: setCurrency } = useCurrency();
  const { status, map, ready } = useCartProducts(cart.items);
  const summary = useMemo(() => summarize(cart.items, map, currency), [cart.items, map, currency]);

  const [stage, setStage] = useState('form'); // 'form' | 'pay' | 'done'
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [receiptError, setReceiptError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef(null);

  const inTelegram = Boolean(tg() && tg().initData);
  const loading = status === 'loading' && !ready;
  const cartEmpty = cart.items.length === 0;

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate() {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = FIELD_MESSAGES.name;
    const phone = toEnDigits(form.phone).replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phone)) errs.phone = FIELD_MESSAGES.phone;
    if (form.address.trim().length < 10) errs.address = FIELD_MESSAGES.address;
    return errs;
  }

  function handleOrderError(err) {
    const code = err && err.code;
    const params = (err && err.params) || {};
    let text;
    if (code === 'NOT_FOUND' && params.productId !== undefined) {
      cart.items.filter((l) => String(l.productId) === String(params.productId)).forEach((l) => cart.remove(l.key));
      text = 'یکی از کالاها دیگر موجود نیست و از سبد حذف شد. سبد را بررسی کنید.';
    } else if (code === 'OUT_OF_STOCK') {
      const p = map[Number(params.productId)];
      text = p ? `موجودی «${p.nameFa}» کافی نیست. تعداد را کم کنید یا آن را حذف کنید.` : 'موجودی یکی از کالاها کافی نیست.';
    } else if (code === 'INVALID_INPUT' && FIELD_NAMES.includes(err.field)) {
      setErrors((e) => ({ ...e, [err.field]: FIELD_MESSAGES[err.field] }));
      text = FIELD_MESSAGES[err.field];
    } else if (code === 'INVALID_INPUT') {
      text = 'اطلاعات سبد خرید نیاز به بررسی دارد؛ به سبد بازگردید و دوباره تلاش کنید.';
    } else if (code === 'PAYMENT_UNAVAILABLE') {
      text = `پرداخت با ${currencyLabel(currency)} هنوز توسط فروشگاه تنظیم نشده است. ارز دیگری را انتخاب کنید یا بعداً تلاش کنید.`;
    } else if (code === 'TOO_MANY_PENDING') {
      text = 'شما چند سفارش بدون رسید دارید. ابتدا از بخش «سفارش‌های من» برای آن‌ها رسید بفرستید یا منتظر بررسی بمانید.';
    } else if (code === 'CURRENCY_UNAVAILABLE') {
      setCurrency('IRT');
      text = 'قیمت افغانی فعلاً فعال نیست؛ ارز روی تومان گذاشته شد. دوباره ثبت سفارش را بزنید.';
    } else {
      text = errorMessage(err);
    }
    setAlert(text);
    haptic('error');
  }

  async function submitOrder() {
    if (busy || stage !== 'form') return;
    setAlert('');
    const errs = validate();
    setErrors(errs);
    const first = FIELD_NAMES.find((k) => errs[k]);
    if (first) {
      haptic('error');
      const node = document.getElementById(`co-${first}`);
      if (node) node.focus();
      return;
    }
    if (!ready || summary.missing || summary.hasOut) {
      setAlert('سبد خرید نیاز به بررسی دارد؛ کالاهای ناموجود را حذف کنید.');
      return;
    }
    setBusy(true);
    try {
      const res = await placeOrder({
        items: cart.items.map((l) => ({ productId: Number(l.productId), qty: l.qty, size: l.size, color: l.color })),
        currency,
        name: form.name.trim(),
        phone: toEnDigits(form.phone).trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
      });
      clearCart();
      setOrder(res);
      setStage('pay');
      haptic('success');
      window.scrollTo({ top: 0 });
    } catch (err) {
      handleOrderError(err);
    } finally {
      setBusy(false);
    }
  }

  async function pickReceipt(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setReceiptError('');
    setPreparing(true);
    try {
      setReceipt(await prepareImage(file, { maxSide: 1600, quality: 0.7 }));
    } catch (err) {
      setReceipt(null);
      setReceiptError(receiptErrorMessage(err));
    } finally {
      setPreparing(false);
    }
  }

  async function sendReceipt() {
    if (busy || !order || !receipt) return;
    setBusy(true);
    setReceiptError('');
    try {
      await submitReceipt({ orderId: order.orderId, imageBase64: receipt.imageBase64, mime: receipt.mime });
      setStage('done');
      haptic('success');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setReceiptError(receiptErrorMessage(err));
      haptic('error');
    } finally {
      setBusy(false);
    }
  }

  // Telegram MainButton (hidden outside Telegram, where the in-page button is shown instead).
  useMainButton({
    text: stage === 'form' ? 'ثبت سفارش' : 'ارسال رسید',
    onClick: stage === 'form' ? submitOrder : sendReceipt,
    visible: inTelegram && stage !== 'done' && !(stage === 'form' && cartEmpty),
    loading: busy,
    disabled: stage === 'form' ? loading : !receipt,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // ---- stage: done ----
  if (stage === 'done') {
    return (
      <div className="shell flex flex-col items-center py-14 text-center">
        <CheckCircle2 className="size-16 text-navy-700" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-ink">رسید شما ارسال شد</h1>
        <p className="mt-2 max-w-sm text-sm leading-7 text-muted">
          پس از بررسی پرداخت توسط فروشگاه، وضعیت سفارش <span className="font-bold text-ink">{toFaDigits(order.code)}</span> را همین‌جا در ربات به شما اطلاع می‌دهیم.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={ROUTES.orders} className="btn btn-navy">
            سفارش‌های من
          </Link>
          <Link to={ROUTES.home} className="btn btn-outline">
            ادامه خرید
          </Link>
        </div>
      </div>
    );
  }

  // ---- stage: pay ----
  if (stage === 'pay' && order) {
    const pay = order.pay;
    const isAfn = order.currency === 'AFN';
    return (
      <div className="shell py-4 lg:py-8">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="card p-5 text-center">
            <CheckCircle2 className="mx-auto size-12 text-navy-700" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-extrabold text-ink">سفارش شما ثبت شد</h1>
            <p className="mt-1 text-sm text-muted">
              کد سفارش: <span className="font-bold text-ink">{toFaDigits(order.code)}</span>
            </p>
          </div>

          <section className="card space-y-3 p-4">
            <h2 className="text-base font-extrabold text-ink">پرداخت</h2>
            <p className="text-sm leading-7 text-muted">
              مبلغ زیر را به {isAfn ? 'حساب افغانی' : 'کارت'} واریز کنید و تصویر رسید را بفرستید. تا ارسال رسید، موجودی کالاها برای شما نگه داشته می‌شود.
            </p>
            <CopyRow label="مبلغ قابل پرداخت" value={String(pay.amount)} shown={formatAmount(pay.amount, order.currency)} />
            <CopyRow
              label={isAfn ? 'شماره حساب / کیف پول' : 'شماره کارت'}
              value={String(pay.number)}
              shown={toFaDigits(pay.number)}
              ltr
            />
            {pay.holder && (
              <p className="text-sm text-ink">
                <span className="text-muted">به نام: </span>
                <span className="font-bold">{pay.holder}</span>
                {pay.bank ? <span className="text-muted"> · {pay.bank}</span> : null}
              </p>
            )}
            {pay.note && <p className="rounded-xl bg-page p-3 text-sm leading-7 text-ink">{pay.note}</p>}
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="text-base font-extrabold text-ink">ارسال رسید</h2>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickReceipt} />
            {receipt ? (
              <div className="flex items-start gap-3">
                <img src={receipt.previewUrl} alt="پیش‌نمایش رسید" className="h-40 w-32 shrink-0 rounded-photo object-cover ring-1 ring-black/10" />
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted">تصویر رسید آماده ارسال است.</p>
                  <button type="button" className="btn btn-outline" disabled={busy || preparing} onClick={() => fileRef.current && fileRef.current.click()}>
                    تغییر تصویر
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={preparing}
                onClick={() => fileRef.current && fileRef.current.click()}
                className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-black/15 bg-page text-sm text-muted"
              >
                <ImagePlus className="size-7" aria-hidden="true" />
                {preparing ? 'در حال آماده‌سازی تصویر...' : 'انتخاب تصویر رسید'}
              </button>
            )}
            {receiptError && (
              <p className="text-sm text-red" role="alert">
                {receiptError}
              </p>
            )}
            {!inTelegram && (
              <button type="button" className="btn btn-navy w-full" disabled={!receipt || busy} onClick={sendReceipt}>
                {busy ? 'در حال ارسال...' : 'ارسال رسید'}
              </button>
            )}
            <p className="text-xs leading-6 text-muted">
              اگر الان رسید ندارید، می‌توانید بعداً از بخش{' '}
              <Link to={ROUTES.orders} className="font-bold text-navy-700">
                سفارش‌های من
              </Link>{' '}
              آن را بفرستید.
            </p>
          </section>
        </div>
      </div>
    );
  }

  // ---- stage: form ----
  if (cartEmpty) return <EmptyState />;

  return (
    <div className="shell py-4 lg:py-8">
      <h1 className="mb-4 text-xl font-extrabold text-ink lg:text-2xl">ثبت سفارش</h1>

      {alert && (
        <div className="card mb-4 border border-red/30 p-4 text-sm leading-7 text-red" role="alert">
          {alert}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-4">
          <section className="card space-y-4 p-4">
            <h2 className="text-base font-extrabold text-ink">اطلاعات تحویل</h2>
            <Field id="co-name" label="نام و نام خانوادگی" error={errors.name}>
              <input
                id="co-name"
                className={`${inputCls} ${errors.name ? 'border-red' : 'border-black/10'}`}
                autoComplete="name"
                maxLength={80}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </Field>
            <Field id="co-phone" label="شماره تماس" error={errors.phone} hint="برای هماهنگی ارسال، مثلاً ۰۹۱۲۳۴۵۶۷۸۹">
              <input
                id="co-phone"
                className={`${inputCls} ${errors.phone ? 'border-red' : 'border-black/10'}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Field>
            <Field id="co-address" label="نشانی کامل" error={errors.address}>
              <textarea
                id="co-address"
                className={`${inputCls} h-auto min-h-24 py-2.5 ${errors.address ? 'border-red' : 'border-black/10'}`}
                rows={3}
                autoComplete="street-address"
                maxLength={500}
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
            </Field>
            <Field id="co-note" label="توضیحات (اختیاری)" error={errors.note}>
              <textarea
                id="co-note"
                className={`${inputCls} h-auto min-h-20 py-2.5 ${errors.note ? 'border-red' : 'border-black/10'}`}
                rows={2}
                maxLength={500}
                value={form.note}
                onChange={(e) => setField('note', e.target.value)}
              />
            </Field>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="text-base font-extrabold text-ink">واحد پرداخت</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="واحد پرداخت">
              {['IRT', 'AFN'].map((code) => {
                const disabled = code === 'AFN' && !canUseAfn;
                const active = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => setCurrency(code)}
                    className={`tap flex min-h-14 flex-col items-center justify-center rounded-xl border px-3 text-sm font-bold transition-colors ${
                      active ? 'border-navy-700 bg-navy-700 text-white' : 'border-black/10 bg-white text-ink'
                    } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    {currencyLabel(code)}
                    {disabled && <span className="text-[11px] font-normal">نرخ ثبت نشده</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-6 text-muted">مبلغ نهایی و مقصد پرداخت بعد از ثبت سفارش نمایش داده می‌شود.</p>
          </section>
        </div>

        <aside className="card p-4 lg:sticky lg:top-24">
          <h2 className="text-base font-extrabold text-ink">خلاصه سفارش</h2>
          <ul className="mt-3 space-y-2.5">
            {summary.rows.map(({ item, product }) => (
              <li key={item.key} className="flex items-center gap-3">
                {product ? (
                  <Img image={product.cover} alt={product.nameFa} className="aspect-[4/5] w-11 shrink-0 rounded-lg" />
                ) : (
                  <div className="skeleton aspect-[4/5] w-11 shrink-0 rounded-lg" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{product ? product.nameFa : '...'}</p>
                  <p className="text-xs text-muted">
                    {toFaDigits(item.qty)} عدد{item.size ? ` · ${item.size}` : ''}
                    {item.color ? ` · ${item.color}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3 text-sm">
            <span className="text-muted">جمع کالاها</span>
            {loading ? <span className="skeleton h-5 w-24 rounded-full" /> : <Price money={summary.total} currency={summary.shown} />}
          </div>
          <p className="mt-2 text-xs leading-6 text-muted">هزینه ارسال را سرور هنگام ثبت اضافه می‌کند.</p>

          {!inTelegram && (
            <button type="button" className="btn btn-navy mt-4 w-full" disabled={busy || loading} onClick={submitOrder}>
              {busy ? 'در حال ثبت...' : 'ثبت سفارش'}
            </button>
          )}
          <Link to={ROUTES.cart} className="mt-3 block text-center text-sm font-medium text-navy-700">
            بازگشت به سبد خرید
          </Link>
        </aside>
      </div>
    </div>
  );
}
