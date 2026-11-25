import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Search, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { ROUTES, useCart, useCurrency, useFavorites, useHome } from '../store.js';
import { currencyLabel, toFaDigits } from '../lib/fa.js';

const ICON_BTN =
  'tap relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 active:bg-black/10';

const MENU_LINK =
  'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink/80 transition-colors hover:bg-black/5 hover:text-ink';

function Badge({ value, tone = 'red' }) {
  if (!value) return null;
  const text = value > 99 ? '+۹۹' : toFaDigits(value);
  return (
    <span
      className={`pointer-events-none absolute end-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-5 text-white ${
        tone === 'red' ? 'bg-red' : 'bg-navy-700'
      }`}
    >
      {text}
    </span>
  );
}

export default function Header() {
  const { shopName, isAdmin, categories } = useHome();
  const { count: cartCount } = useCart();
  const { count: favCount } = useFavorites();
  const { currency, canUseAfn, toggle } = useCurrency();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const name = shopName || 'فروشگاه';
  const initial = Array.from(name)[0];
  const menuCategories = (categories || []).slice(0, 6);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(ROUTES.catalog({ q }));
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 pt-safe backdrop-blur-md">
      <div className="shell flex min-h-14 items-center gap-2 border-b border-black/5 lg:min-h-16 lg:gap-3">
        {/* Right side (RTL start): brand + admin badge */}
        <Link to={ROUTES.home} className="tap flex min-h-11 min-w-0 items-center gap-2.5" aria-label={name}>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-base font-extrabold text-white">
            {initial}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-extrabold text-ink lg:text-lg">{name}</span>
            <span className="hidden truncate text-xs text-muted sm:block">پوشاک و اکسسوری لوکس</span>
          </span>
        </Link>

        {isAdmin && (
          <Link to={ROUTES.admin} className="tap inline-flex min-h-11 shrink-0 items-center" aria-label="پنل مدیر">
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-700 px-2.5 py-1 text-xs font-bold text-white">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              مدیر
            </span>
          </Link>
        )}

        {/* Desktop menu (lg and up) */}
        <nav aria-label="منوی اصلی" className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
          <Link to={ROUTES.home} className={MENU_LINK}>
            خانه
          </Link>
          {menuCategories.map((category) => (
            <Link key={category.id} to={ROUTES.catalog({ cat: category.id })} className={MENU_LINK}>
              {category.nameFa}
            </Link>
          ))}
          <Link to={ROUTES.catalog({ sort: 'new' })} className={MENU_LINK}>
            جدیدترین‌ها
          </Link>
          <Link to={ROUTES.catalog({ sale: true })} className={MENU_LINK}>
            حراج
            <span className="ms-1.5 size-1.5 rounded-full bg-red" aria-hidden="true" />
          </Link>
        </nav>

        {/* Left side (RTL end): tools */}
        <div className="ms-auto flex shrink-0 items-center gap-0.5 lg:ms-0">
          <button
            type="button"
            className={ICON_BTN}
            aria-label="جستجو"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <Link to={ROUTES.orders} className={`${ICON_BTN} hidden lg:inline-flex`} aria-label="پروفایل و سفارش‌ها">
            <User className="size-5" aria-hidden="true" />
          </Link>

          <Link
            to={ROUTES.catalog({ fav: true })}
            className={`${ICON_BTN} hidden lg:inline-flex`}
            aria-label="علاقه‌مندی‌ها"
          >
            <Heart className="size-5" aria-hidden="true" />
            <Badge value={favCount} tone="navy" />
          </Link>

          {/* Currency pill: IRT <-> AFN (inactive side hidden on mobile) */}
          <button
            type="button"
            onClick={toggle}
            disabled={!canUseAfn}
            aria-label="تغییر واحد پول"
            title={canUseAfn ? 'تغییر واحد پول' : 'نرخ افغانی هنوز تنظیم نشده است'}
            className={`tap inline-flex min-h-11 items-center px-1 ${
              canUseAfn ? '' : 'cursor-not-allowed opacity-50'
            }`}
          >
            <span className="inline-flex items-center rounded-full bg-page p-0.5 text-xs font-bold ring-1 ring-black/5">
              {['IRT', 'AFN'].map((code) => {
                const active = code === currency;
                return (
                  <span
                    key={code}
                    className={`h-8 items-center rounded-full px-3 ${
                      active ? 'inline-flex bg-navy-700 text-white' : 'hidden text-muted sm:inline-flex'
                    }`}
                  >
                    {currencyLabel(code)}
                  </span>
                );
              })}
            </span>
          </button>

          <Link to={ROUTES.cart} className={ICON_BTN} aria-label="سبد خرید">
            <ShoppingBag className="size-5" aria-hidden="true" />
            <Badge value={cartCount} tone="red" />
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-b border-black/5 bg-white/90">
          <form onSubmit={submitSearch} role="search" className="shell flex items-center gap-2 py-2">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              enterKeyHint="search"
              placeholder="جستجوی محصول…"
              aria-label="جستجوی محصول"
              className="h-11 min-w-0 flex-1 rounded-full bg-page px-4 text-base text-ink outline-none ring-1 ring-black/5 focus:ring-navy-700"
            />
            <button type="submit" className="btn btn-navy min-h-11 shrink-0">
              جستجو
            </button>
            <button type="button" className={ICON_BTN} aria-label="بستن جستجو" onClick={() => setSearchOpen(false)}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
