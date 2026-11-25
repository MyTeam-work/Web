// Admin: product list (search, pagination, soft delete). Prices from adminListProducts are plain Toman numbers.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageSearch, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminDeleteProduct, adminListProducts, errorMessage } from '../../api.js';
import Img from '../../components/Img.jsx';
import { ROUTES, haptic, loadHome, showToast, tg } from '../../store.js';
import { formatNumber, toFaDigits } from '../../lib/fa.js';

const PAGE_SIZE = 20;

function confirmAsk(message) {
  return new Promise((resolve) => {
    const app = tg();
    if (app && typeof app.showConfirm === 'function') {
      try {
        app.showConfirm(message, (ok) => resolve(Boolean(ok)));
        return;
      } catch {
        /* fall through to window.confirm */
      }
    }
    resolve(window.confirm(message));
  });
}

function Chip({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-black/5 text-muted',
    red: 'bg-red/10 text-red',
    amber: 'bg-amber-100 text-amber-800',
    navy: 'bg-navy-700/10 text-navy-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 ${tones[tone]}`}>{children}</span>;
}

export default function AdminProducts() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorText, setErrorText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (nextPage) => {
      const req = ++reqRef.current;
      if (nextPage === 1) setStatus('loading');
      else setLoadingMore(true);
      try {
        const res = await adminListProducts({ q: term || undefined, page: nextPage, limit: PAGE_SIZE });
        if (req !== reqRef.current) return;
        setItems((prev) => (nextPage === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(res.page);
        setStatus('ready');
      } catch (err) {
        if (req !== reqRef.current) return;
        if (nextPage === 1) {
          setErrorText(errorMessage(err));
          setStatus('error');
        } else {
          showToast(errorMessage(err));
        }
      } finally {
        if (req === reqRef.current) setLoadingMore(false);
      }
    },
    [term],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  async function remove(p) {
    const ok = await confirmAsk(`«${p.nameFa}» از فروشگاه پنهان شود؟ (می‌توانید بعداً دوباره فعالش کنید)`);
    if (!ok) return;
    setBusyId(p.id);
    try {
      await adminDeleteProduct(p.id);
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: false, isFeatured: false } : x)));
      haptic('success');
      showToast('محصول غیرفعال شد');
      loadHome({ force: true });
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const hasMore = items.length < total;

  return (
    <div className="shell py-4 lg:py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link to={ROUTES.admin} className="tap grid size-10 place-items-center rounded-full border border-black/10 bg-white" aria-label="بازگشت">
          <ArrowRight size={18} />
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-ink">
          محصولات {status === 'ready' && <span className="text-sm font-medium text-muted">({toFaDigits(total)})</span>}
        </h1>
        <Link to={ROUTES.adminProductNew} className="btn btn-navy">
          <Plus className="size-4" aria-hidden="true" />
          محصول جدید
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی نام محصول…"
          aria-label="جستجوی محصول"
          className="h-12 w-full rounded-full border border-black/10 bg-white ps-10 pe-4 text-base text-ink outline-none focus:border-navy-700"
        />
      </div>

      {status === 'loading' && (
        <ul className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="skeleton h-24 rounded-card" />
          ))}
        </ul>
      )}

      {status === 'error' && (
        <div className="card p-5 text-center">
          <p className="mb-3 text-sm text-muted">{errorText}</p>
          <button type="button" className="btn btn-navy" onClick={() => load(1)}>
            تلاش دوباره
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <PackageSearch className="size-12 text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">{term ? 'محصولی با این نام پیدا نشد.' : 'هنوز محصولی ثبت نشده است.'}</p>
          {!term && (
            <Link to={ROUTES.adminProductNew} className="btn btn-navy mt-4">
              افزودن اولین محصول
            </Link>
          )}
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((p) => (
            <li key={p.id} className={`card flex items-center gap-3 p-3 ${p.isActive ? '' : 'opacity-70'}`}>
              <Link to={ROUTES.adminProduct(p.id)} state={{ product: p }} className="shrink-0" aria-label={`ویرایش ${p.nameFa}`}>
                <Img image={p.cover} alt={p.nameFa} dim={!p.isActive} className="aspect-[4/5] w-14 rounded-lg" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={ROUTES.adminProduct(p.id)} state={{ product: p }} className="block truncate text-sm font-bold text-ink">
                  {p.nameFa}
                </Link>
                <p className="mt-0.5 text-sm">
                  <span className="font-extrabold text-ink">{formatNumber(p.price)}</span>{' '}
                  <span className="text-[11px] text-muted">تومان</span>
                  {p.oldPrice ? <span className="ms-2 text-[11px] text-muted line-through">{formatNumber(p.oldPrice)}</span> : null}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.stock <= 0 ? <Chip tone="red">ناموجود</Chip> : p.stock <= 3 ? <Chip tone="amber">موجودی: {toFaDigits(p.stock)}</Chip> : <Chip>موجودی: {toFaDigits(p.stock)}</Chip>}
                  {!p.isActive && <Chip tone="red">غیرفعال</Chip>}
                  {p.isFeatured && <Chip tone="navy">ویژه</Chip>}
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                <Link
                  to={ROUTES.adminProduct(p.id)}
                  state={{ product: p }}
                  className="tap inline-flex items-center justify-center text-ink"
                  aria-label={`ویرایش ${p.nameFa}`}
                >
                  <Pencil className="size-[18px]" aria-hidden="true" />
                </Link>
                {p.isActive && (
                  <button
                    type="button"
                    className="tap inline-flex items-center justify-center text-red disabled:opacity-40"
                    disabled={busyId === p.id}
                    onClick={() => remove(p)}
                    aria-label={`غیرفعال کردن ${p.nameFa}`}
                  >
                    <Trash2 className="size-[18px]" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === 'ready' && hasMore && (
        <div className="mt-5 flex justify-center">
          <button type="button" className="btn btn-outline" disabled={loadingMore} onClick={() => load(page + 1)}>
            {loadingMore ? 'در حال دریافت...' : 'نمایش بیشتر'}
          </button>
        </div>
      )}
    </div>
  );
}
