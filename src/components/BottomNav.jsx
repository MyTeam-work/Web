// Bottom navigation (mobile only, hidden from lg). Also hosts the mobile menu sheet
// (categories, newest, sale) because the compact Header has no menu (DESIGN.md section 4 item 1).
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, House, LayoutGrid, ShoppingBag, User, X } from 'lucide-react';
import { ROUTES, useCart, useFavorites, useHome } from '../store.js';
import { toFaDigits } from '../lib/fa.js';

function Badge({ value, tone }) {
  if (!value) return null;
  return (
    <span
      className={`pointer-events-none absolute -end-1.5 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[18px] text-white ${
        tone === 'red' ? 'bg-red' : 'bg-navy-700'
      }`}
    >
      {value > 99 ? '+۹۹' : toFaDigits(value)}
    </span>
  );
}

function TabBody({ Icon, label, active, badge }) {
  return (
    <>
      <span
        className={`relative inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active ? 'bg-navy-700/10 text-navy-700' : 'text-muted'
        }`}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
        {badge ? <Badge value={badge.value} tone={badge.tone} /> : null}
      </span>
      <span className={`mt-0.5 text-[11px] leading-4 ${active ? 'font-bold text-navy-700' : 'text-muted'}`}>{label}</span>
    </>
  );
}

const TAB_CLASS = 'flex min-h-14 flex-1 flex-col items-center justify-center pt-1.5';

export default function BottomNav() {
  const { pathname, search, key } = useLocation();
  const { categories } = useHome();
  const { count: cartCount } = useCart();
  const { count: favCount } = useFavorites();
  const [open, setOpen] = useState(false);

  // Close the sheet on any navigation.
  useEffect(() => {
    setOpen(false);
  }, [key]);

  // Escape closes the sheet, and the page does not scroll behind it.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // No bottom bar on checkout (MainButton lives there) or in the admin panel.
  if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) return null;

  const params = new URLSearchParams(search);
  const onHome = pathname === '/' && search === '';
  const onFav = pathname === '/' && params.get('fav') === '1';
  const onMenu = pathname === '/' && !onFav && (params.has('cat') || params.has('sort') || params.has('sale'));

  return (
    <>
      <nav
        aria-label="ناوبری پایین"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/90 pb-safe backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-stretch">
          <Link to={ROUTES.home} className={TAB_CLASS} aria-current={onHome ? 'page' : undefined}>
            <TabBody Icon={House} label="خانه" active={onHome} />
          </Link>

          <button
            type="button"
            className={TAB_CLASS}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <TabBody Icon={LayoutGrid} label="دسته‌ها" active={onMenu || open} />
          </button>

          <Link to={ROUTES.catalog({ fav: true })} className={TAB_CLASS} aria-current={onFav ? 'page' : undefined}>
            <TabBody Icon={Heart} label="علاقه‌مندی" active={onFav} badge={{ value: favCount, tone: 'navy' }} />
          </Link>

          <Link to={ROUTES.cart} className={TAB_CLASS} aria-current={pathname === '/cart' ? 'page' : undefined}>
            <TabBody Icon={ShoppingBag} label="سبد خرید" active={pathname === '/cart'} badge={{ value: cartCount, tone: 'red' }} />
          </Link>

          <Link to={ROUTES.orders} className={TAB_CLASS} aria-current={pathname === '/orders' ? 'page' : undefined}>
            <TabBody Icon={User} label="سفارش‌ها" active={pathname === '/orders'} />
          </Link>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="دسته‌ها">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="بستن" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-hero bg-white px-4 pb-[calc(1rem_+_var(--safe-bottom))] pt-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">دسته‌ها</h2>
              <button type="button" className="tap inline-flex size-11 items-center justify-center rounded-full bg-page" aria-label="بستن" onClick={() => setOpen(false)}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="grid grid-cols-2 gap-2.5">
              {(categories || []).map((category) => (
                <li key={category.id}>
                  <Link
                    to={ROUTES.catalog({ cat: category.id })}
                    className="flex min-h-12 items-center rounded-card bg-tile px-4 text-sm font-bold text-ink"
                  >
                    {category.nameFa}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={ROUTES.catalog({ sort: 'new' })} className="flex min-h-12 items-center rounded-card bg-page px-4 text-sm font-bold text-ink ring-1 ring-black/5">
                  جدیدترین‌ها
                </Link>
              </li>
              <li>
                <Link to={ROUTES.catalog({ sale: true })} className="flex min-h-12 items-center rounded-card bg-page px-4 text-sm font-bold text-ink ring-1 ring-black/5">
                  حراج
                  <span className="ms-2 size-2 rounded-full bg-red" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
