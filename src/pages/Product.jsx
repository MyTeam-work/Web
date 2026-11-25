// Product page (DESIGN.md section 6): gallery on top, size / color pills, price, navy add-to-cart button.
// Route: /product/:id  (ids are integers).
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, Heart, Minus, Plus, SearchX } from 'lucide-react';
import Img from '../components/Img.jsx';
import { Price, ProductGrid, pickCurrency } from '../components/ProductCard.jsx';
import { ApiError, errorMessage, getProduct, listProducts } from '../api.js';
import { ROUTES, addToCart, haptic, showToast, useCurrency, useFavorites } from '../store.js';
import { discountPercent, formatNumber, formatPercent, priceParts } from '../lib/fa.js';

const MAX_QTY = 20;

function Gallery({ photos, name, discount, isFav, onFav }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: false });
  const [selected, setSelected] = useState(0);
  const list = photos.length > 0 ? photos : [null];

  useEffect(() => {
    if (!emblaApi) return undefined;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi]);

  return (
    <div>
      <div className="relative">
        <div className="overflow-hidden rounded-card bg-tile shadow-soft" ref={emblaRef}>
          <div className="flex [touch-action:pan-y_pinch-zoom]">
            {list.map((photo, i) => (
              <div key={i} className="min-w-0 shrink-0 grow-0 basis-full">
                <Img
                  image={photo}
                  size="full"
                  alt={`${name} — تصویر ${formatNumber(i + 1)}`}
                  eager={Math.abs(i - selected) <= 1}
                  className="aspect-[4/5]"
                />
              </div>
            ))}
          </div>
        </div>

        {discount > 0 && (
          <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-red px-3 py-1 text-xs font-bold leading-none text-white">
            {formatPercent(discount)}
          </span>
        )}

        <button
          type="button"
          onClick={onFav}
          aria-pressed={isFav}
          aria-label={isFav ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          className="tap absolute end-1.5 top-1.5 inline-flex size-11 items-center justify-center"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-white shadow-soft">
            <Heart className={`size-5 ${isFav ? 'fill-red text-red' : 'text-ink'}`} aria-hidden="true" />
          </span>
        </button>

        {list.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center md:hidden" aria-hidden="true">
            {list.map((_, i) => (
              <span key={i} className={`mx-[3px] block h-2 rounded-full shadow-sm transition-all ${i === selected ? 'w-5 bg-ink' : 'w-2 bg-ink/30'}`} />
            ))}
          </div>
        )}
      </div>

      {list.length > 1 && (
        <div className="mt-3 hidden gap-2 overflow-x-auto no-scrollbar md:flex" role="tablist" aria-label="تصاویر محصول">
          {list.map((photo, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`نمایش تصویر ${formatNumber(i + 1)}`}
              onClick={() => emblaApi && emblaApi.scrollTo(i)}
              className={`shrink-0 overflow-hidden rounded-photo ring-2 transition ${i === selected ? 'ring-navy-700' : 'opacity-70 ring-transparent'}`}
            >
              <Img image={photo} className="size-16" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-10" aria-busy="true">
      <div className="skeleton aspect-[4/5] rounded-card" />
      <div className="space-y-4">
        <div className="skeleton h-8 w-3/4 rounded-full" />
        <div className="skeleton h-8 w-1/2 rounded-full" />
        <div className="skeleton h-12 w-full rounded-full" />
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const productId = Number(id);
  const valid = Number.isInteger(productId) && productId > 0;
  const { currency } = useCurrency();
  const favorites = useFavorites();

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: valid ? 'loading' : 'error', product: null, error: null });
  const [related, setRelated] = useState([]);
  const [size, setSize] = useState(null);
  const [colorIndex, setColorIndex] = useState(-1);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [missing, setMissing] = useState(null); // 'size' | 'color'

  useEffect(() => {
    setSize(null);
    setColorIndex(-1);
    setQty(1);
    setAdded(false);
    setMissing(null);
    setRelated([]);
    if (!valid) {
      setState({ status: 'error', product: null, error: null });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', product: null, error: null });
    getProduct(productId)
      .then((product) => {
        if (cancelled) return;
        setState({ status: 'ready', product, error: null });
        if (Array.isArray(product.sizes) && product.sizes.length === 1) setSize(product.sizes[0]);
        if (Array.isArray(product.colors) && product.colors.length === 1) setColorIndex(0);
        listProducts({ categoryId: product.categoryId, limit: 9, sort: 'new' })
          .then((res) => {
            if (!cancelled) setRelated((res.items || []).filter((p) => p.id !== product.id).slice(0, 5));
          })
          .catch(() => {});
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', product: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, valid, attempt]);

  if (state.status === 'loading') {
    return (
      <div className="shell py-4 lg:py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (state.status === 'error' || !state.product) {
    const notFound = !valid || (state.error instanceof ApiError && state.error.code === 'NOT_FOUND');
    return (
      <div className="shell py-16">
        <div className="card mx-auto max-w-md px-6 py-12 text-center">
          <SearchX className="mx-auto size-10 text-muted" aria-hidden="true" />
          <p className="mt-4 text-lg font-bold">{notFound ? 'این محصول پیدا نشد' : errorMessage(state.error)}</p>
          {notFound ? <p className="mt-1 text-sm text-muted">ممکن است حذف شده یا دیگر موجود نباشد.</p> : null}
          <div className="mt-6 flex justify-center gap-2">
            {!notFound && (
              <button type="button" className="btn btn-outline" onClick={() => setAttempt((n) => n + 1)}>
                تلاش دوباره
              </button>
            )}
            <Link to={ROUTES.home} className="btn btn-navy">
              بازگشت به خانه
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const product = state.product;
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const photos = Array.isArray(product.photos) ? product.photos : [];
  const stock = Number(product.stock) || 0;
  const inStock = stock > 0;
  const maxQty = Math.max(1, Math.min(MAX_QTY, stock));
  const shown = pickCurrency(product.price, currency);
  const discount = product.oldPrice ? discountPercent(product.price, product.oldPrice, shown) : 0;
  const oldText = product.oldPrice ? priceParts(product.oldPrice, shown) : null;
  const isFav = favorites.has(product.id);
  const selectedColor = colorIndex >= 0 ? colors[colorIndex] : null;

  const onFav = () => {
    const now = favorites.toggle(product.id);
    haptic(now ? 'light' : 'soft');
    showToast(now ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد');
  };

  const pickSize = (value) => {
    setSize(value);
    setAdded(false);
    if (missing === 'size') setMissing(null);
  };

  const pickColor = (index) => {
    setColorIndex(index);
    setAdded(false);
    if (missing === 'color') setMissing(null);
  };

  const changeQty = (delta) => {
    setQty((q) => Math.min(maxQty, Math.max(1, q + delta)));
    setAdded(false);
  };

  const onAdd = () => {
    if (!inStock) return;
    if (sizes.length > 0 && !size) {
      setMissing('size');
      haptic('warning');
      showToast('لطفاً سایز را انتخاب کنید');
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      setMissing('color');
      haptic('warning');
      showToast('لطفاً رنگ را انتخاب کنید');
      return;
    }
    const result = addToCart({
      productId: product.id,
      qty: Math.min(qty, maxQty),
      size: size || null,
      color: selectedColor ? selectedColor.name : null,
    });
    if (!result.ok) {
      showToast(result.reason === 'CART_FULL' ? 'سبد خرید پر است؛ حداکثر ۳۰ ردیف مجاز است' : 'افزودن به سبد انجام نشد');
      return;
    }
    haptic('success');
    showToast('به سبد خرید اضافه شد');
    setAdded(true);
  };

  return (
    <div className="shell py-4 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <Gallery photos={photos} name={product.nameFa} discount={discount} isFav={isFav} onFav={onFav} />

        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-snug text-ink lg:text-3xl">{product.nameFa}</h1>

          <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
            <Price money={product.price} currency={currency} size="lg" />
            {oldText ? (
              <span className="text-sm text-muted line-through">
                {oldText.amount} {oldText.unit}
              </span>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-red px-2.5 py-0.5 text-xs font-bold text-white">{formatPercent(discount)} تخفیف</span>
            ) : null}
          </div>

          <p className={`mt-2 text-sm ${!inStock || stock <= 5 ? 'font-bold text-red' : 'text-muted'}`}>
            {!inStock ? 'ناموجود' : stock <= 5 ? `تنها ${formatNumber(stock)} عدد باقی مانده` : 'موجود در انبار'}
          </p>

          {sizes.length > 0 && (
            <div className="mt-6">
              <p className={`mb-2 text-sm font-bold ${missing === 'size' ? 'text-red' : 'text-ink'}`}>سایز</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب سایز">
                {sizes.map((value) => (
                  <button key={value} type="button" className="chip min-w-12" aria-pressed={size === value} onClick={() => pickSize(value)}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mt-6">
              <p className={`mb-2 text-sm font-bold ${missing === 'color' ? 'text-red' : 'text-ink'}`}>
                رنگ
                {selectedColor && selectedColor.name ? <span className="ms-2 font-normal text-muted">{selectedColor.name}</span> : null}
              </p>
              <div className="flex flex-wrap gap-2.5" role="group" aria-label="انتخاب رنگ">
                {colors.map((c, i) => (
                  <button
                    key={`${c.name}-${i}`}
                    type="button"
                    aria-pressed={colorIndex === i}
                    aria-label={c.name || `رنگ ${formatNumber(i + 1)}`}
                    title={c.name || undefined}
                    onClick={() => pickColor(i)}
                    className={`tap inline-flex size-11 items-center justify-center rounded-full ring-2 transition ${
                      colorIndex === i ? 'ring-navy-700' : 'ring-transparent'
                    }`}
                  >
                    <span className="size-8 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex || '#ECE8E3' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {inStock && (
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-bold">تعداد</span>
              <div className="inline-flex items-center rounded-full bg-white ring-1 ring-black/10">
                <button type="button" className="tap inline-flex size-11 items-center justify-center disabled:opacity-40" onClick={() => changeQty(1)} disabled={qty >= maxQty} aria-label="افزایش تعداد">
                  <Plus className="size-4" aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center font-bold" aria-live="polite">
                  {formatNumber(qty)}
                </span>
                <button type="button" className="tap inline-flex size-11 items-center justify-center disabled:opacity-40" onClick={() => changeQty(-1)} disabled={qty <= 1} aria-label="کاهش تعداد">
                  <Minus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <button type="button" className="btn btn-navy min-h-12 flex-1 text-base" onClick={onAdd} disabled={!inStock}>
              {inStock ? 'افزودن به سبد' : 'ناموجود'}
            </button>
            {added && (
              <Link to={ROUTES.cart} className="btn btn-outline min-h-12">
                مشاهده سبد خرید
                <ArrowLeft className="size-[18px]" aria-hidden="true" />
              </Link>
            )}
          </div>

          {product.description ? (
            <div className="card mt-7 p-5">
              <h2 className="mb-2 text-base font-extrabold">توضیحات</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-ink/80">{product.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12 lg:mt-16" aria-label="محصولات مشابه">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold lg:text-2xl">محصولات مشابه</h2>
            <Link to={ROUTES.catalog({ cat: product.categoryId })} className="tap inline-flex items-center gap-1 text-sm font-bold">
              مشاهده همه
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ProductGrid items={related} />
        </section>
      )}
    </div>
  );
}
