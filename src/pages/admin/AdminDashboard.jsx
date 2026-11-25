import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronLeft, ClipboardList, Package, RefreshCw, Settings } from 'lucide-react';
import { adminStats, errorMessage } from '../../api.js';
import { ROUTES, useCurrency } from '../../store.js';
import { formatPrice, toFaDigits } from '../../lib/fa.js';

// Same keys and labels as lib/orders.js STATUS_LABEL_FA.
const STATUS_LIST = [
  ['receipt_review', 'در حال بررسی پرداخت'],
  ['awaiting_receipt', 'در انتظار رسید'],
  ['paid', 'پرداخت تأیید شد'],
  ['processing', 'در حال پردازش'],
  ['shipped', 'ارسال شد'],
  ['rejected', 'رسید رد شد'],
  ['cancelled', 'لغو شد'],
];

const TILES = [
  { to: ROUTES.adminOrders, label: 'سفارش‌ها', hint: 'بررسی رسیدها و وضعیت سفارش‌ها', Icon: ClipboardList },
  { to: ROUTES.adminProducts, label: 'محصولات', hint: 'افزودن و ویرایش کالاها', Icon: Package },
  { to: ROUTES.adminSettings, label: 'تنظیمات', hint: 'اسلایدر، بنرها، ارز و پرداخت', Icon: Settings },
];

function StatCard({ title, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{title}</p>
      <p className="mt-1 text-xl font-extrabold leading-snug">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const { currency } = useCurrency();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    adminStats()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((err) => alive && setState((s) => ({ ...s, loading: false, error: errorMessage(err) })));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const { loading, data, error } = state;
  const money = (m) => formatPrice(m, currency) || formatPrice(m, 'IRT') || '-';
  const pending = (data && data.pendingReceipts) || 0;

  return (
    <div className="shell py-6 lg:py-10">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold lg:text-3xl">پنل مدیریت</h1>
          <p className="text-sm text-muted">خلاصه فروش و کارهای در انتظار</p>
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

      {error ? (
        <div role="alert" className="card mb-5 flex items-center justify-between gap-3 p-4 text-sm text-red">
          <span>{error}</span>
          <button type="button" className="btn btn-outline" onClick={() => setReloadKey((k) => k + 1)}>
            تلاش دوباره
          </button>
        </div>
      ) : null}

      <nav aria-label="بخش‌های مدیریت" className="mb-5 grid gap-3 sm:grid-cols-3">
        {TILES.map(({ to, label, hint, Icon }) => (
          <Link key={to} to={to} className="card tap flex items-center gap-3 p-4 transition-transform active:scale-[0.98]">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{label}</span>
              <span className="block truncate text-xs text-muted">{hint}</span>
            </span>
            <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      {pending > 0 ? (
        <Link
          to={`${ROUTES.adminOrders}?status=receipt_review`}
          className="card mb-5 flex items-center gap-3 border border-red/30 p-4"
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-red/10 text-red">
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1 font-bold">{toFaDigits(pending)} رسید پرداخت منتظر بررسی شماست</span>
          <ChevronLeft className="size-5 text-muted" aria-hidden="true" />
        </Link>
      ) : null}

      <section aria-label="آمار فروش" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading && !data ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-card" />)
        ) : data ? (
          <>
            <StatCard title="سفارش‌های امروز" value={toFaDigits(data.today.orders)} />
            <StatCard title="فروش امروز" value={money(data.today.revenue)} sub="فقط پرداخت‌های تأییدشده" />
            <StatCard title="سفارش‌های ۷ روز اخیر" value={toFaDigits(data.week.orders)} />
            <StatCard title="فروش ۷ روز اخیر" value={money(data.week.revenue)} sub="فقط پرداخت‌های تأییدشده" />
          </>
        ) : null}
      </section>

      {data ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section aria-label="سفارش‌ها بر اساس وضعیت" className="card p-4">
            <h2 className="mb-3 font-extrabold">وضعیت سفارش‌ها</h2>
            <ul className="flex flex-wrap gap-2">
              {STATUS_LIST.map(([key, label]) => (
                <li key={key}>
                  <Link to={`${ROUTES.adminOrders}?status=${key}`} className="chip tap gap-2">
                    {label}
                    <span className="rounded-full bg-page px-2 text-xs font-bold text-ink">
                      {toFaDigits((data.byStatus && data.byStatus[key]) || 0)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="موجودی کم" className="card p-4">
            <h2 className="mb-3 font-extrabold">موجودی کم</h2>
            {data.lowStock && data.lowStock.length ? (
              <ul className="divide-y divide-ink/10">
                {data.lowStock.map((p) => (
                  <li key={p.id}>
                    <Link to={ROUTES.adminProduct(p.id)} className="tap flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 flex-1 truncate">{p.nameFa}</span>
                      <span
                        className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${
                          p.stock <= 0 ? 'bg-red/10 text-red' : 'bg-navy-700/10 text-navy-700'
                        }`}
                      >
                        {p.stock <= 0 ? 'ناموجود' : `${toFaDigits(p.stock)} عدد`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">همه کالاها موجودی کافی دارند.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
