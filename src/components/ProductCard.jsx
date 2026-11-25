// Product card (DESIGN.md section 4 item 6) + grid helpers shared by Home and Product pages.
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import Img from './Img.jsx';
import { ROUTES, haptic, showToast, useCurrency, useFavorites } from '../store.js';
import { discountPercent, formatPercent, moneyValue, priceParts } from '../lib/fa.js';

/** Currency to display for a Money: the selected one, or toman when that side is missing. */
export function pickCurrency(money, currency) {
  return moneyValue(money, currency) !== null ? currency : 'IRT';
}

/** Price text: bold amount + small unit. size: 'sm' (cards) | 'lg' (product page). */
export function Price({ money, currency, size = 'sm', className = '' }) {
  const parts = priceParts(money, pickCurrency(money, currency));
  if (!parts) return null;
  const amountCls = size === 'lg' ? 'text-2xl lg:text-3xl font-extrabold' : 'text-[15px] font-extrabold';
  const unitCls = size === 'lg' ? 'text-sm' : 'text-[11px]';
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 text-ink ${className}`}>
      <span className={amountCls}>{parts.amount}</span>
      <span className={`${unitCls} font-medium text-muted`}>{parts.unit}</span>
    </span>
  );
}

export function ProductGrid({ items, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 ${className}`}>
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5] rounded-photo" />
      <div className="skeleton mt-3 h-4 w-3/4 rounded-full" />
      <div className="skeleton mt-2 h-4 w-1/2 rounded-full" />
    </div>
  );
}

export function ProductSkeletonGrid({ count = 5 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Props: product = ProductCard { id, nameFa, price: Money, oldPrice: Money | null,
 * cover: Image | null, colors: [{ name, hex }], inStock: boolean }.
 */
export default function ProductCard({ product }) {
  const { currency } = useCurrency();
  const favorites = useFavorites();
  const isFav = favorites.has(product.id);
  const to = ROUTES.product(product.id);
  const shownCurrency = pickCurrency(product.price, currency);
  const discount = product.oldPrice ? discountPercent(product.price, product.oldPrice, shownCurrency) : 0;
  const oldParts = product.oldPrice ? priceParts(product.oldPrice, shownCurrency) : null;
  const dots = (product.colors || []).filter((c) => c && c.hex).slice(0, 4);

  const onFavorite = () => {
    const now = favorites.toggle(product.id);
    haptic(now ? 'light' : 'soft');
    showToast(now ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد');
  };

  return (
    <article className="group relative min-w-0">
      <div className="relative">
        <Link to={to} className="block" aria-label={product.nameFa}>
          <Img
            image={product.cover}
            alt={product.nameFa}
            dim={!product.inStock}
            className="aspect-[4/5] rounded-photo"
          />
        </Link>

        {/* top-right (RTL start): discount or out-of-stock badge */}
        {!product.inStock ? (
          <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold leading-none text-white">
            ناموجود
          </span>
        ) : discount > 0 ? (
          <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-red px-2.5 py-1 text-[11px] font-bold leading-none text-white">
            {formatPercent(discount)}
          </span>
        ) : null}

        {/* top-left (RTL end): favourite */}
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={isFav}
          aria-label={isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          className="tap absolute end-0 top-0 inline-flex size-11 items-center justify-center"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white shadow-soft">
            <Heart className={`size-[18px] ${isFav ? 'fill-red text-red' : 'text-ink'}`} aria-hidden="true" />
          </span>
        </button>
      </div>

      <div className="mt-2.5 px-0.5">
        <Link to={to} className="block truncate text-sm font-medium text-ink" title={product.nameFa}>
          {product.nameFa}
        </Link>

        <div className="mt-1 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <Price money={product.price} currency={currency} />
            {oldParts && (
              <div className="text-[11px] leading-4 text-muted line-through">
                {oldParts.amount} {oldParts.unit}
              </div>
            )}
          </div>
          {/* Opens the product page, where size and color are chosen */}
          <Link
            to={to}
            aria-label={`مشاهده و افزودن ${product.nameFa} به سبد`}
            className="tap inline-flex shrink-0 items-center justify-center"
          >
            <span
              className={`inline-flex size-9 items-center justify-center rounded-full text-white ${
                product.inStock ? 'bg-ink' : 'bg-muted/60'
              }`}
            >
              <ShoppingBag className="size-[17px]" aria-hidden="true" />
            </span>
          </Link>
        </div>

        {dots.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5" aria-label="رنگ‌های موجود">
            {dots.map((c, i) => (
              <span
                key={`${c.hex}-${i}`}
                title={c.name || undefined}
                className="size-3 rounded-full ring-1 ring-black/15"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
