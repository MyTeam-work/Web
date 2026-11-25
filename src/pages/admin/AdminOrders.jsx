import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { adminListOrders, errorMessage } from '../../api.js';
import { ROUTES } from '../../store.js';
import { formatDateFa, formatPrice, toFaDigits } from '../../lib/fa.js';

const PAGE_SIZE = 20;

const TONES = {
  navy: 'bg-navy-700/10 text-navy-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red/10 text-red',
};

// Same keys as lib/orders.js STATUS_LABEL_FA.
const STATUS = {
  awaiting_receipt: { label: 'در انتظار رسید', tone: 'navy' },
  receipt_review: { label: 'در حال بررسی پرداخت', tone: 'navy' },
  paid: { label: 'پرداخت تأیید شد', tone: 'green' },
  rejected: { label: 'رسید رد شد', tone: 'red' },
  processing: { label: 'در حال پردازش', tone: 'navy' },
  shipped: { label: 'ارسال شد', tone: 'green' },
  cancelled: { label: 'لغو شد', tone: 'red' },
};

const FILTERS = [
  ['', 'همه'],
  ['receipt_review', 'منتظر بررسی'],
  ['awaiting_receipt', 'در انتظار رسید'],
  ['paid', 'پرداخت‌شده'],
  ['processing', 'در حال پردازش'],
  ['shipped', 'ارسال‌شده'],
  ['rejected', 'رد شده'],
  ['cancelled', 'لغو شده'],
];

export function StatusBadge({ status }) {
  const info = STATUS[status] || { label: status, tone: 'navy' };
  return (
    <span className={`inline-block shrink-0 rounded-full px-3 py-1 text-xs font-bold ${TONES[info.tone]}`}>
      {info.label}
    </span>
  );
}

export default function AdminOrders() {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status') || '';
  const status = Object.hasOwn(STATUS, rawStatus) ? rawStatus : '';
  const page = Math.min(100000, Math.max(1, Math.floor(Number(params.get('page'))) || 1));

  const [state, setState] = useState({ loading: true, items: [], total: 0, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    adminListOrders({ ...(status ? { status } : {}), page })
      .then((res) => {
        if (!alive) return;
        setState({ loading: false, items: res.items || [], total: res.total || 0, error: null });
      })
      .catch((err) => {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
      });
    return () => {
      alive = false;
    };
  }, [status, page, reloadKey]);

  const { loading, items, total, error } = state;
  const hasMore = page * PAGE_SIZE < total;

  const setFilter = (next) => setParams(next ? { status: next } : {}, { replace: true });
  const goPage = (next) => {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p);
  };

  return (
    <div className="shell py-6 lg:py-10">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link to={ROUTES.admin} className="text-sm text-muted">
            پنل مدیریت
          </Link>
          <h1 className="text-2xl font-extrabold lg:text-3xl">سفارش‌ها</h1>
        </div>
        <button
          type="button"
          className="btn btn-outline tap"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          aria-label="بارگذاری دوباره"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">به‌روزرسانی</span>
        </button>
      </header>

      <div role="tablist" aria-label="فیلتر وضعیت" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {FILTERS.map(([key, label]) => (
          <button
            key={key || 'all'}
            type="button"
            role="tab"
            aria-selected={status === key}
            className="chip tap"
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="card mb-4 flex items-center justify-between gap-3 p-4 text-sm text-red">
          <span>{error}</span>
          <button type="button" className="btn btn-outline" onClick={() => setReloadKey((k) => k + 1)}>
            تلاش دوباره
          </button>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_1.3fr_1.4fr_auto] gap-3 border-b border-ink/10 bg-page px-4 py-2 text-xs text-muted md:grid">
          <span>کد سفارش</span>
          <span>مشتری</span>
          <span>اقلام</span>
          <span>مبلغ کل</span>
          <span>وضعیت</span>
          <span className="w-5" />
        </div>

        {loading && !items.length ? (
          <ul>
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="border-b border-ink/5 p-4 last:border-0">
                <div className="skeleton h-12 rounded-photo" />
              </li>
            ))}
          </ul>
        ) : items.length ? (
          <ul>
            {items.map((o) => (
              <li key={o.id} className="border-b border-ink/5 last:border-0">
                <Link
                  to={ROUTES.adminOrder(o.id)}
                  className="tap grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 active:bg-page md:grid-cols-[1.2fr_1.4fr_1fr_1.3fr_1.4fr_auto]"
                >
                  <span className="min-w-0">
                    <span dir="ltr" className="block truncate text-start text-sm font-extrabold">
                      {o.code}
                    </span>
                    <span className="block text-xs text-muted">{formatDateFa(o.createdAt, true)}</span>
                  </span>
                  <span className="justify-self-end md:hidden">
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="truncate text-sm">{o.customerName || '-'}</span>
                  <span className="text-sm text-muted md:text-ink">
                    {toFaDigits(o.itemsCount)} قلم
                  </span>
                  <span className="text-sm font-bold">
                    {formatPrice(o.total, o.currency) || formatPrice(o.total, 'IRT') || '-'}
                  </span>
                  <span className="hidden md:block">
                    <StatusBadge status={o.status} />
                  </span>
                  <ChevronLeft className="hidden size-5 text-muted md:block" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-muted">سفارشی در این بخش وجود ندارد.</p>
        )}
      </div>

      {total > PAGE_SIZE || page > 1 ? (
        <nav aria-label="صفحه‌بندی" className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-outline" disabled={page <= 1 || loading} onClick={() => goPage(page - 1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
            قبلی
          </button>
          <span className="text-sm text-muted">
            صفحه {toFaDigits(page)} از {toFaDigits(Math.max(1, Math.ceil(total / PAGE_SIZE)))}
          </span>
          <button type="button" className="btn btn-outline" disabled={!hasMore || loading} onClick={() => goPage(page + 1)}>
            بعدی
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
