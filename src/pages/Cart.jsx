// Cart page. Names, photos and prices always come from the server (listProducts { ids });
// the cart in localStorage only keeps { productId, qty, size, color }.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { errorMessage, listProducts } from '../api.js';
import Img from '../components/Img.jsx';
import { Price } from '../components/ProductCard.jsx';
import { ROUTES, haptic, showToast, useCart, useCurrency } from '../store.js';
import { formatPrice, moneyValue, toFaDigits } from '../lib/fa.js';

const MAX_QTY = 20;

/** Loads the products of the cart lines. Returns { status: 'loading'|'ready'|'error', map, error }. */
export function useCartProducts(items, tick = 0) {
  const idsKey = useMemo(() => {
    const ids = items.map((l) => Number(l.productId)).filter((n) => Number.isInteger(n) && n > 0);
    return [...new Set(ids)].sort((a, b) => a - b).join(',');
  }, [items]);
  const [state, setState] = useState({ status: 'loading', map: {}, key: '', error: null });

  useEffect(() => {
    if (!idsKey) {
      setState({ status: 'ready', map: {}, key: '', error: null });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    listProducts({ ids: idsKey.split(',').map(Number), limit: 50 })
      .then((res) => {
        if (!alive) return;
        const map = {};
        for (const p of (res && res.items) || []) map[p.id] = p;
        setState({ status: 'ready', map, key: idsKey, error: null });
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', map: {}, key: idsKey, error });
      });
    return () => {
      alive = false;
    };
  }, [idsKey, tick]);

  return { status: state.status, map: state.map, error: state.error, ready: state.status === 'ready' && state.key === idsKey };
}

/**
 * Rows + display total. total = Money built from the server's Money values (only multiplied by qty,
 * never converted). shown = currency actually used for display ('IRT' when AFN is missing somewhere).
 */
export function summarize(items, map, currency) {
  const rows = items.map((item) => ({ item, product: map[Number(item.productId)] || null }));
  const known = rows.filter((r) => r.product);
  const sum = (code) => known.reduce((s, r) => s + (moneyValue(r.product.price, code) ?? 0) * r.item.qty, 0);
  const afnComplete = known.length > 0 && known.every((r) => moneyValue(r.product.price, 'AFN') !== null);
  const total = { irt: sum('IRT'), afn: afnComplete ? sum('AFN') : null };
  return {
    rows,
    total,
    shown: currency === 'AFN' && total.afn === null ? 'IRT' : currency,
    hasOut: known.some((r) => !r.product.inStock),
    missing: rows.some((r) => !r.product),
  };
}

export function lineMoney(money, qty) {
  return { irt: money.irt * qty, afn: typeof money.afn === 'number' ? money.afn * qty : null };
}

function EmptyCart() {
  return (
    <div className="shell flex flex-col items-center py-16 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-tile text-muted">
        <ShoppingBag className="size-9" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-ink">سبد خرید شما خالی است</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">از میان محصولات فروشگاه، چیزی که می‌پسندید را به سبد اضافه کنید.</p>
      <Link to={ROUTES.home} className="btn btn-navy mt-6">
        مشاهده محصولات
        <ArrowLeft className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function LineSkeleton() {
  return (
    <li className="card flex gap-3 p-3" aria-hidden="true">
      <div className="skeleton aspect-[4/5] w-20 rounded-photo sm:w-24" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-5 w-1/2 rounded-full" />
      </div>
    </li>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const cart = useCart();
  const { currency } = useCurrency();
  const [tick, setTick] = useState(0);
  const { status, map, ready, error } = useCartProducts(cart.items, tick);
  const summary = useMemo(() => summarize(cart.items, map, currency), [cart.items, map, currency]);
  const notified = useRef(false);

  // Products that were deleted or hidden since they were added: drop them and tell the customer.
  useEffect(() => {
    if (!ready) return;
    const gone = cart.items.filter((l) => !map[Number(l.productId)]);
    if (gone.length === 0) return;
    gone.forEach((l) => cart.remove(l.key));
    if (!notified.current) {
      notified.current = true;
      showToast('برخی کالاها دیگر موجود نیستند و از سبد حذف شدند');
    }
  }, [ready, map, cart.items]);

  if (cart.items.length === 0) return <EmptyCart />;

  const loading = status === 'loading' && !ready;
  const canContinue = ready && !summary.hasOut && !summary.missing && cart.items.length > 0;

  return (
    <div className="shell py-4 lg:py-8">
      <h1 className="mb-4 flex items-baseline gap-2 text-xl font-extrabold text-ink lg:text-2xl">
        سبد خرید
        <span className="text-sm font-medium text-muted">({toFaDigits(cart.count)} کالا)</span>
      </h1>

      {status === 'error' && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
          <p className="text-sm text-ink">{errorMessage(error)}</p>
          <button type="button" className="btn btn-navy" onClick={() => setTick((n) => n + 1)}>
            تلاش دوباره
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="space-y-3">
          {summary.rows.map(({ item, product }) => {
            if (!product) return loading ? <LineSkeleton key={item.key} /> : null;
            const unit = formatPrice(product.price, summary.shown);
            return (
              <li key={item.key} className="card flex gap-3 p-3">
                <Link to={ROUTES.product(product.id)} className="shrink-0" aria-label={product.nameFa}>
                  <Img image={product.cover} alt={product.nameFa} dim={!product.inStock} className="aspect-[4/5] w-20 rounded-photo sm:w-24" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={ROUTES.product(product.id)} className="line-clamp-2 text-sm font-medium text-ink">
                      {product.nameFa}
                    </Link>
                    <button
                      type="button"
                      className="tap -me-2 -mt-2 inline-flex shrink-0 items-center justify-center text-muted hover:text-red"
                      aria-label={`حذف ${product.nameFa} از سبد`}
                      onClick={() => {
                        cart.remove(item.key);
                        haptic('soft');
                      }}
                    >
                      <Trash2 className="size-[18px]" aria-hidden="true" />
                    </button>
                  </div>

                  {(item.size || item.color) && (
                    <p className="mt-0.5 text-xs text-muted">
                      {item.size ? `سایز: ${item.size}` : ''}
                      {item.size && item.color ? ' · ' : ''}
                      {item.color ? `رنگ: ${item.color}` : ''}
                    </p>
                  )}
                  {!product.inStock && <p className="mt-1 text-xs font-bold text-red">این کالا فعلاً ناموجود است؛ از سبد حذفش کنید.</p>}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                    <div className="inline-flex items-center rounded-full border border-black/10 bg-white" role="group" aria-label="تعداد">
                      <button
                        type="button"
                        className="tap inline-flex items-center justify-center rounded-full"
                        aria-label="کم کردن تعداد"
                        disabled={item.qty <= 1}
                        onClick={() => cart.setQty(item.key, item.qty - 1)}
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold text-ink" aria-live="polite">
                        {toFaDigits(item.qty)}
                      </span>
                      <button
                        type="button"
                        className="tap inline-flex items-center justify-center rounded-full"
                        aria-label="زیاد کردن تعداد"
                        disabled={item.qty >= MAX_QTY}
                        onClick={() => cart.setQty(item.key, item.qty + 1)}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="text-end">
                      <Price money={lineMoney(product.price, item.qty)} currency={summary.shown} />
                      {item.qty > 1 && unit && <div className="text-[11px] text-muted">هر عدد: {unit}</div>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card p-4 lg:sticky lg:top-24">
          <h2 className="text-base font-extrabold text-ink">خلاصه سفارش</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">تعداد کالا</dt>
              <dd className="font-bold text-ink">{toFaDigits(cart.count)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">جمع کالاها</dt>
              <dd>{loading ? <span className="skeleton inline-block h-5 w-24 rounded-full align-middle" /> : <Price money={summary.total} currency={summary.shown} />}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-6 text-muted">هزینه ارسال و مبلغ نهایی هنگام ثبت سفارش توسط سرور محاسبه می‌شود.</p>

          <button type="button" className="btn btn-navy mt-4 w-full" disabled={!canContinue} onClick={() => navigate(ROUTES.checkout)}>
            ادامه و ثبت سفارش
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          {summary.hasOut && <p className="mt-2 text-xs text-red">برای ادامه، کالاهای ناموجود را از سبد حذف کنید.</p>}
          <Link to={ROUTES.home} className="mt-3 block text-center text-sm font-medium text-navy-700">
            ادامه خرید
          </Link>
        </aside>
      </div>
    </div>
  );
}
