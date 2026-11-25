import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageOpen, RefreshCw } from 'lucide-react';
import { errorMessage, myOrders } from '../api.js';
import { ROUTES } from '../store.js';
import OrderCard from '../components/OrderCard.jsx';

function mergeById(a, b) {
  const seen = new Set(a.map((o) => o.id));
  return [...a, ...b.filter((o) => !seen.has(o.id))];
}

export default function Orders() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // loading|ready|error
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await myOrders(1);
      setItems(Array.isArray(res && res.items) ? res.items : []);
      setHasMore(Boolean(res && res.hasMore));
      setPage(1);
      setError('');
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await myOrders(page + 1);
      const list = Array.isArray(res && res.items) ? res.items : [];
      setItems((prev) => mergeById(prev, list));
      setHasMore(Boolean(res && res.hasMore));
      setPage((p) => p + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="shell py-6 lg:py-10">
      <h1 className="text-2xl font-extrabold lg:text-3xl">سفارش‌های من</h1>
      <p className="mt-1 text-sm text-muted">
        وضعیت سفارش‌ها را از همین‌جا دنبال کنید.
      </p>

      {status === 'loading' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-44 rounded-card" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="card mt-6 flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-bold">{error || 'خطایی رخ داد.'}</p>
          <button type="button" className="btn btn-navy" onClick={reload}>
            <RefreshCw className="size-4" aria-hidden="true" />
            تلاش دوباره
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <PackageOpen className="size-10 text-muted" aria-hidden="true" />
          <p className="font-bold">هنوز سفارشی ثبت نکرده‌اید</p>
          <p className="text-sm text-muted">
            از فروشگاه دیدن کنید و اولین سفارش خود را ثبت کنید.
          </p>
          <Link to={ROUTES.home} className="btn btn-navy mt-2">
            ورود به فروشگاه
          </Link>
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {items.map((order) => (
              <OrderCard key={order.id} order={order} onChanged={reload} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="btn btn-outline"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? 'در حال بارگذاری…' : 'نمایش سفارش‌های بیشتر'}
              </button>
            </div>
          )}
          <p className="mt-8 text-center text-sm text-muted">
            سؤالی درباره سفارش دارید؟{' '}
            <Link to={ROUTES.support} className="font-bold text-navy-700">
              تماس با پشتیبانی
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
