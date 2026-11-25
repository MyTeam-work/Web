import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, ExternalLink, ImageOff, Phone, RefreshCw, X } from 'lucide-react';
import { adminListOrders, adminReviewOrder, errorMessage, getImage } from '../../api.js';
import { ROUTES, copyText, haptic, openTelegramLink, showToast, tg } from '../../store.js';
import { formatAmount, formatDateFa, formatPrice, toFaDigits } from '../../lib/fa.js';
import { StatusBadge } from './AdminOrders.jsx';

// Which buttons each status offers (same matrix as the bot keyboard in lib/keyboards.js).
const ACTIONS_BY_STATUS = {
  receipt_review: ['approve', 'reject', 'cancel'],
  paid: ['processing', 'cancel'],
  processing: ['shipped', 'cancel'],
  awaiting_receipt: ['cancel'],
  rejected: ['cancel'],
};

const ACTION_UI = {
  approve: { label: 'تأیید پرداخت', cls: 'btn-navy' },
  reject: {
    label: 'رد رسید',
    cls: 'btn-outline',
    confirm: 'رسید رد شود؟ مشتری می‌تواند رسید جدید بفرستد.',
  },
  processing: { label: 'شروع پردازش', cls: 'btn-navy' },
  shipped: { label: 'ارسال شد', cls: 'btn-navy' },
  cancel: {
    label: 'لغو سفارش',
    cls: 'btn-outline text-red',
    confirm: 'سفارش لغو می‌شود و موجودی کالاها برمی‌گردد. ادامه می‌دهید؟',
  },
};

function confirmDialog(message) {
  return new Promise((resolve) => {
    const app = tg();
    if (app && typeof app.showConfirm === 'function') {
      try {
        app.showConfirm(message, (ok) => resolve(Boolean(ok)));
        return;
      } catch {
        /* fall back to window.confirm */
      }
    }
    resolve(window.confirm(message));
  });
}

// Money shown in the order currency, with the other currency underneath when it exists.
function MoneyLine({ label, money, currency, strong }) {
  const other = currency === 'AFN' ? 'IRT' : 'AFN';
  const main = formatPrice(money, currency) || formatPrice(money, 'IRT') || '-';
  const second = formatPrice(money, other);
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className={strong ? 'font-bold' : 'text-muted'}>{label}</dt>
      <dd className="text-end">
        <span className={strong ? 'font-extrabold' : 'font-medium'}>{main}</span>
        {second && second !== main ? <span className="block text-xs text-muted">{second}</span> : null}
      </dd>
    </div>
  );
}

function CopyRow({ label, value, children }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="flex items-start justify-between gap-2">
        <span className="min-w-0 whitespace-pre-line break-words font-medium">{children || value}</span>
        <button
          type="button"
          className="tap -my-2 inline-flex shrink-0 items-center justify-center rounded-full text-muted"
          aria-label={`کپی ${label}`}
          onClick={() => copyText(value, `${label} کپی شد`)}
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
      </dd>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [receipt, setReceipt] = useState({ status: 'idle', src: null });
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId < 1) {
      setState({ loading: false, data: null, error: 'سفارش پیدا نشد.' });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    adminListOrders({ id: orderId })
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((err) => alive && setState((s) => ({ ...s, loading: false, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [orderId, reloadKey]);

  const fileId = (state.data && state.data.order && state.data.order.receiptFileId) || null;
  useEffect(() => {
    if (!fileId) {
      setReceipt({ status: 'idle', src: null });
      return undefined;
    }
    let alive = true;
    setReceipt({ status: 'loading', src: null });
    getImage(fileId, 'full')
      .then((src) => alive && setReceipt({ status: 'ready', src }))
      .catch(() => alive && setReceipt({ status: 'error', src: null }));
    return () => {
      alive = false;
    };
  }, [fileId]);

  const run = async (action) => {
    if (busy) return;
    const ui = ACTION_UI[action];
    if (ui.confirm && !(await confirmDialog(ui.confirm))) return;
    setBusy(action);
    try {
      const res = await adminReviewOrder({ orderId, action, note: note.trim() || undefined });
      haptic('success');
      showToast(res && res.notified === false ? 'وضعیت به‌روز شد، اما پیام به مشتری نرسید' : 'وضعیت سفارش به‌روز شد');
      setNote('');
    } catch (err) {
      haptic('error');
      showToast(errorMessage(err));
    } finally {
      setBusy('');
      setReloadKey((k) => k + 1);
    }
  };

  const { loading, data, error } = state;
  const order = data && data.order;
  const items = (data && data.items) || [];
  const customer = data && data.customer;
  const actions = (order && ACTIONS_BY_STATUS[order.status]) || [];

  return (
    <div className="shell py-6 lg:py-10">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={ROUTES.adminOrders} className="text-sm text-muted">
            سفارش‌ها
          </Link>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold">
            <span dir="ltr" className="truncate">
              {order ? order.code : 'جزئیات سفارش'}
            </span>
            {order ? <StatusBadge status={order.status} /> : null}
          </h1>
          {order ? <p className="text-sm text-muted">{formatDateFa(order.createdAt, true)}</p> : null}
        </div>
        <button
          type="button"
          className="btn btn-outline tap"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          aria-label="بارگذاری دوباره"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <div role="alert" className="card mb-4 p-4 text-sm text-red">
          {error}
        </div>
      ) : null}

      {loading && !order ? <div className="skeleton h-72 rounded-card" /> : null}

      {order ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <section aria-label="اقلام سفارش" className="card p-4">
              <h2 className="mb-3 font-extrabold">اقلام سفارش</h2>
              <ul className="divide-y divide-ink/10">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {it.nameFa} <span className="text-muted">× {toFaDigits(it.qty)}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {[it.size ? `سایز ${it.size}` : '', it.color ? `رنگ ${it.color}` : ''].filter(Boolean).join(' · ') ||
                          'بدون سایز و رنگ'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {formatPrice(it.unitPrice, order.currency) || formatPrice(it.unitPrice, 'IRT')}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3 text-sm">
                <MoneyLine label="جمع اقلام" money={order.subtotal} currency={order.currency} />
                <MoneyLine label="هزینه ارسال" money={order.shipping} currency={order.currency} />
                <MoneyLine label="مبلغ کل" money={order.total} currency={order.currency} />
                <div className="flex items-center justify-between gap-3 rounded-photo bg-navy-700 px-4 py-3 text-white">
                  <dt className="font-bold">مبلغ قابل پرداخت</dt>
                  <dd className="text-lg font-extrabold">{formatAmount(order.payAmount, order.currency)}</dd>
                </div>
              </dl>
            </section>

            <section aria-label="رسید پرداخت" className="card p-4">
              <h2 className="mb-3 font-extrabold">رسید پرداخت</h2>
              {!order.receiptFileId ? (
                <p className="text-sm text-muted">هنوز رسیدی ارسال نشده است.</p>
              ) : receipt.status === 'loading' ? (
                <div className="skeleton h-64 rounded-photo" />
              ) : receipt.status === 'ready' ? (
                <>
                  <button
                    type="button"
                    className="block w-full overflow-hidden rounded-photo bg-tile"
                    onClick={() => setZoom(true)}
                    aria-label="بزرگ‌نمایی رسید"
                  >
                    <img src={receipt.src} alt="رسید پرداخت مشتری" className="mx-auto max-h-96 w-auto object-contain" />
                  </button>
                  {order.receiptAt ? (
                    <p className="mt-2 text-xs text-muted">ارسال‌شده در {formatDateFa(order.receiptAt, true)}</p>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-photo bg-page p-6 text-center text-sm text-muted">
                  <ImageOff className="size-6" aria-hidden="true" />
                  تصویر رسید بارگذاری نشد. می‌توانید آن را در پیام ربات ببینید.
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-5">
            <section aria-label="اطلاعات مشتری" className="card p-4">
              <h2 className="mb-3 font-extrabold">مشتری</h2>
              <dl className="flex flex-col gap-3 text-sm">
                <CopyRow label="نام" value={order.customerName} />
                <CopyRow label="تلفن" value={order.phone}>
                  <a href={`tel:${order.phone}`} dir="ltr" className="inline-flex items-center gap-1.5 underline">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {order.phone}
                  </a>
                </CopyRow>
                <CopyRow label="آدرس" value={order.address} />
                {order.note ? (
                  <div>
                    <dt className="text-xs text-muted">توضیحات مشتری</dt>
                    <dd className="whitespace-pre-line break-words font-medium">{order.note}</dd>
                  </div>
                ) : null}
                {customer ? (
                  <div>
                    <dt className="text-xs text-muted">تلگرام</dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      {customer.username ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 font-medium underline"
                          onClick={() => openTelegramLink(`https://t.me/${customer.username}`)}
                        >
                          <span dir="ltr">@{customer.username}</span>
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <span dir="ltr" className="text-muted">
                          ID {customer.tgId}
                        </span>
                      )}
                      {customer.isBlocked ? (
                        <span className="rounded-full bg-red/10 px-2 py-0.5 text-xs font-bold text-red">ربات را بلاک کرده</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {actions.length ? (
              <section aria-label="تغییر وضعیت" className="card p-4">
                <h2 className="mb-3 font-extrabold">تغییر وضعیت</h2>
                <label htmlFor="admin-note" className="mb-1 block text-xs text-muted">
                  یادداشت برای مشتری (اختیاری، همراه پیام وضعیت ارسال می‌شود)
                </label>
                <textarea
                  id="admin-note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mb-3 w-full rounded-photo border border-ink/15 bg-white p-3 text-sm"
                  placeholder="مثلاً: رسید ناخوانا است، لطفاً دوباره بفرستید."
                />
                <div className="flex flex-col gap-2">
                  {actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={`btn w-full ${ACTION_UI[action].cls}`}
                      disabled={Boolean(busy)}
                      onClick={() => run(action)}
                    >
                      {busy === action ? 'در حال انجام…' : ACTION_UI[action].label}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <p className="card p-4 text-sm text-muted">این سفارش به وضعیت نهایی رسیده و دکمه‌ای ندارد.</p>
            )}

            {order.adminNote ? (
              <section aria-label="یادداشت مدیر" className="card p-4 text-sm">
                <h2 className="mb-1 font-extrabold">آخرین یادداشت مدیر</h2>
                <p className="whitespace-pre-line break-words text-muted">{order.adminNote}</p>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {zoom && receipt.src ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="رسید پرداخت"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            className="tap absolute end-4 top-[calc(1rem_+_var(--safe-top))] inline-flex items-center justify-center rounded-full bg-white/90 text-ink"
            aria-label="بستن"
            onClick={() => setZoom(false)}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <img src={receipt.src} alt="رسید پرداخت مشتری" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
