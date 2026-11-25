// Home page (DESIGN.md section 4, items 2-7) + catalog mode.
// Without query params: hero slider, feature bar, category cards, best sellers, two promo banners.
// With ?cat=<id> &sort=new|price_asc|price_desc &sale=1 &q=<text> &fav=1: filtered product listing.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CreditCard, Gem, RefreshCw, SearchX, Shirt, Truck } from 'lucide-react';
import HeroSlider, { ActionLink } from '../components/HeroSlider.jsx';
import Img from '../components/Img.jsx';
import { ProductGrid, ProductSkeletonGrid } from '../components/ProductCard.jsx';
import { listProducts, errorMessage } from '../api.js';
import { ROUTES, useFavorites, useHome } from '../store.js';
import { formatNumber } from '../lib/fa.js';

const SORTS = ['new', 'price_asc', 'price_desc'];
const SORT_LABELS = { new: 'جدیدترین', price_asc: 'ارزان‌ترین', price_desc: 'گران‌ترین' };
const PAGE_SIZE = 20;

// ---------- small shared pieces ----------
function Section({ className = '', children, label }) {
  return (
    <section className={`shell ${className}`} aria-label={label}>
      {children}
    </section>
  );
}

function ErrorBox({ error, onRetry }) {
  return (
    <div className="shell py-16 text-center">
      <p className="text-lg font-bold">{errorMessage(error)}</p>
      {onRetry ? (
        <button type="button" className="btn btn-navy mt-6" onClick={onRetry}>
          تلاش دوباره
        </button>
      ) : null}
    </div>
  );
}

function EmptyBox({ title, text }) {
  return (
    <div className="card mx-auto max-w-md px-6 py-12 text-center">
      <SearchX className="mx-auto size-10 text-muted" aria-hidden="true" />
      <p className="mt-4 text-lg font-bold">{title}</p>
      {text ? <p className="mt-1 text-sm text-muted">{text}</p> : null}
      <Link to={ROUTES.home} className="btn btn-navy mt-6">
        بازگشت به خانه
      </Link>
    </div>
  );
}

// ---------- landing: feature bar (item 3) ----------
const FEATURES = [
  { Icon: Truck, title: 'ارسال سریع', text: 'ارسال مطمئن به دست شما' },
  { Icon: RefreshCw, title: 'تعویض آسان', text: 'تعویض بدون دردسر' },
  { Icon: BadgeCheck, title: 'کیفیت ممتاز', text: 'انتخاب‌شده با دقت' },
  { Icon: CreditCard, title: 'پرداخت امن', text: 'کارت‌به‌کارت با تأیید رسید' },
];

function FeatureBar() {
  return (
    <Section className="relative z-10 -mt-8 lg:-mt-10" label="ویژگی‌های فروشگاه">
      <ul className="card mx-2 grid grid-cols-2 gap-x-3 gap-y-4 p-4 sm:mx-6 lg:mx-12 lg:grid-cols-4 lg:p-5">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-page text-navy-700">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink">{title}</span>
              <span className="block truncate text-xs text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------- landing: category cards (item 4) ----------
const CATEGORY_TEXT = {
  women: 'استایل‌های شیک و راحت برای هر روز',
  men: 'ست‌های ساده و باکیفیت برای هر موقعیت',
  accessories: 'کامل‌کننده‌ی استایل شما',
};

// getHome.categories[] = { id, slug, nameFa, cover: Image | null }; `cover` is the first photo of the
// newest active product in that category, so no extra requests are needed here.
function CategoryCards({ categories }) {
  const list = categories.slice(0, 6);
  if (list.length === 0) return null;

  return (
    <Section className="mt-8 lg:mt-12" label="دسته‌بندی‌ها">
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {list.map((c) => {
          const cover = c.cover || null;
          const Fallback = c.slug === 'accessories' ? Gem : Shirt;
          return (
            <Link
              key={c.id}
              to={ROUTES.catalog({ cat: c.id })}
              className="group relative flex min-h-[180px] shrink-0 basis-[78%] snap-start overflow-hidden rounded-card bg-tile shadow-soft sm:basis-[60%] md:min-h-[200px] md:basis-auto lg:min-h-[240px]"
            >
              {cover ? (
                <>
                  <Img image={cover} alt="" className="absolute inset-y-0 end-0 w-[62%]" position="center 20%" />
                  <div
                    className="absolute inset-y-0 end-0 w-[62%]"
                    aria-hidden="true"
                    style={{ backgroundImage: 'linear-gradient(to left, #ECE8E3 0%, rgba(236,232,227,0) 45%)' }}
                  />
                </>
              ) : (
                <Fallback className="absolute end-6 top-1/2 size-24 -translate-y-1/2 text-black/10" aria-hidden="true" />
              )}
              <div className="relative z-10 flex w-[58%] flex-col p-4 pe-0 lg:p-6 lg:pe-0">
                <h3 className="text-xl font-extrabold leading-tight text-ink lg:text-2xl">{c.nameFa}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted lg:text-sm">
                  {CATEGORY_TEXT[c.slug] || 'مشاهده‌ی محصولات این دسته'}
                </p>
              </div>
              <span className="absolute bottom-3 start-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white shadow-soft transition-transform group-active:scale-95">
                <ArrowLeft className="size-5 text-ink" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

// ---------- landing: best sellers with tabs (item 5) ----------
function Bestsellers({ data }) {
  const fav = useFavorites();
  const baseItems = data.featured && data.featured.length ? data.featured : data.newArrivals || [];
  const title = data.featured && data.featured.length ? 'پرفروش‌های امروز' : 'جدیدترین محصولات';
  const tabs = useMemo(
    () => [
      { id: 'all', label: 'همه' },
      ...data.categories.slice(0, 4).map((c) => ({ id: c.id, label: c.nameFa })),
      { id: 'fav', label: 'علاقه‌مندی‌ها' },
    ],
    [data.categories],
  );
  const [tab, setTab] = useState('all');
  const cacheRef = useRef(new Map());
  const [remote, setRemote] = useState({ key: '', items: [], loading: false, error: null });
  const favKey = fav.ids.join(',');
  const currentKey = tab === 'fav' ? `fav:${favKey}` : `cat:${tab}`;

  useEffect(() => {
    if (tab === 'all') return undefined;
    if (tab === 'fav' && fav.ids.length === 0) {
      setRemote({ key: currentKey, items: [], loading: false, error: null });
      return undefined;
    }
    if (tab !== 'fav' && cacheRef.current.has(currentKey)) {
      setRemote({ key: currentKey, items: cacheRef.current.get(currentKey), loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    setRemote((prev) => ({ ...prev, key: currentKey, loading: true, error: null }));
    const request =
      tab === 'fav'
        ? listProducts({ ids: fav.ids.slice(0, 50), limit: 50 })
        : listProducts({ categoryId: tab, limit: 10, sort: 'new' });
    request
      .then((res) => {
        if (cancelled) return;
        const items = res.items || [];
        if (tab !== 'fav') cacheRef.current.set(currentKey, items);
        setRemote({ key: currentKey, items, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setRemote({ key: currentKey, items: [], loading: false, error });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, favKey]);

  let items = baseItems;
  let loading = false;
  if (tab !== 'all') {
    const fresh = remote.key === currentKey;
    items = fresh ? remote.items : [];
    loading = !fresh || remote.loading;
    if (tab === 'fav') items = items.filter((p) => fav.has(p.id));
  }

  const viewAll =
    tab === 'all' ? ROUTES.catalog({ sort: 'new' }) : tab === 'fav' ? ROUTES.catalog({ fav: true }) : ROUTES.catalog({ cat: tab });

  let body;
  if (loading && items.length === 0) body = <ProductSkeletonGrid count={5} />;
  else if (remote.error && tab !== 'all' && remote.key === currentKey) body = <p className="py-10 text-center text-muted">{errorMessage(remote.error)}</p>;
  else if (items.length === 0) {
    body = (
      <p className="py-10 text-center text-muted">
        {tab === 'fav' ? 'هنوز محصولی را به علاقه‌مندی‌ها اضافه نکرده‌اید.' : 'محصولی برای نمایش وجود ندارد.'}
      </p>
    );
  } else body = <ProductGrid items={items.slice(0, 10)} />;

  return (
    <Section className="mt-10 lg:mt-14" label={title}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="text-2xl font-extrabold text-ink lg:text-3xl">{title}</h2>
        <Link to={viewAll} className="tap order-2 inline-flex items-center gap-1 text-sm font-bold text-ink lg:order-3">
          مشاهده همه
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div
          role="tablist"
          aria-label="فیلتر محصولات"
          className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 no-scrollbar lg:order-2 lg:mx-0 lg:ms-auto lg:me-6 lg:w-auto lg:px-0"
        >
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="chip shrink-0" onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">{body}</div>
    </Section>
  );
}

// ---------- landing: two promo banners (item 7) ----------
function PromoCard({ promo }) {
  const dark = promo.theme !== 'light';
  const edge = dark ? '#0B1F4B' : '#ECE8E3';
  const edgeClear = dark ? 'rgba(11,31,75,0)' : 'rgba(236,232,227,0)';
  return (
    <div
      className={`relative flex min-h-[230px] overflow-hidden rounded-hero shadow-soft lg:min-h-[290px] ${
        dark ? 'bg-navy-700 text-white' : 'bg-tile text-ink'
      }`}
    >
      {promo.image ? (
        <>
          <Img image={promo.image} size="full" tone={dark ? 'navy' : 'tile'} alt="" className="absolute inset-y-0 end-0 w-[58%]" position="center 20%" />
          <div
            className="absolute inset-y-0 end-0 w-[58%]"
            aria-hidden="true"
            style={{ backgroundImage: `linear-gradient(to left, ${edge} 0%, ${edgeClear} 50%)` }}
          />
        </>
      ) : null}
      <div className="relative z-10 flex w-[62%] flex-col justify-center p-5 text-start lg:p-8">
        {promo.eyebrow ? <p className={`mb-2 text-xs ${dark ? 'text-white/70' : 'text-muted'}`}>{promo.eyebrow}</p> : null}
        {promo.title ? <h3 className="text-2xl font-extrabold leading-[1.3] lg:text-[34px]">{promo.title}</h3> : null}
        {promo.text ? (
          <p className={`mt-2 line-clamp-3 text-sm leading-6 ${dark ? 'text-white/75' : 'text-muted'}`}>{promo.text}</p>
        ) : null}
        <div className="mt-4 flex">
          <ActionLink link={promo.link} className={`btn ${dark ? 'btn-white' : 'btn-ink'}`}>
            {promo.buttonText || 'مشاهده'}
            <ArrowLeft className="size-[18px]" aria-hidden="true" />
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

function Promos({ promos }) {
  if (!promos || promos.length === 0) return null;
  return (
    <Section className="mt-10 lg:mt-14" label="پیشنهادهای ویژه">
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {promos.slice(0, 2).map((promo, i) => (
          <PromoCard key={i} promo={promo} />
        ))}
      </div>
    </Section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true">
      <div className="shell pt-3 lg:pt-5">
        <div className="skeleton aspect-[4/5] rounded-hero sm:aspect-[4/3] md:aspect-[16/8] lg:aspect-[16/7]" />
      </div>
      <div className="shell relative z-10 -mt-8 lg:-mt-10">
        <div className="skeleton mx-2 h-24 rounded-card sm:mx-6 lg:mx-12" />
      </div>
      <div className="shell mt-10">
        <ProductSkeletonGrid count={5} />
      </div>
    </div>
  );
}

function Landing() {
  const { data, status, error, reload } = useHome();
  if (!data) {
    if (status === 'error') return <ErrorBox error={error} onRetry={reload} />;
    return <HomeSkeleton />;
  }
  return (
    <>
      <Section className="pt-3 lg:pt-5" label="معرفی فروشگاه">
        <HeroSlider slides={data.slides} heroStats={data.heroStats} shopName={data.shopName} />
      </Section>
      <FeatureBar />
      <CategoryCards categories={data.categories || []} />
      <Bestsellers data={data} />
      <Promos promos={data.promos} />
    </>
  );
}

// ---------- catalog mode (filters from the URL) ----------
function readFilters(params) {
  const catNumber = Number(params.get('cat'));
  const cat = Number.isInteger(catNumber) && catNumber > 0 ? catNumber : null;
  const sortRaw = params.get('sort');
  const sort = SORTS.includes(sortRaw) ? sortRaw : null;
  const sale = params.get('sale') === '1' || params.get('sale') === 'true';
  const q = (params.get('q') || '').trim().slice(0, 60);
  const fav = params.get('fav') === '1';
  return { cat, sort, sale, q, fav, active: Boolean(cat || sort || sale || q || fav) };
}

function Catalog({ filters }) {
  const { categories } = useHome();
  const favorites = useFavorites();
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ items: [], total: 0, page: 1, loading: true, loadingMore: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(0);

  const favKey = filters.fav ? favorites.ids.join(',') : '';
  const filterKey = JSON.stringify([filters.cat, filters.sort, filters.sale, filters.q, filters.fav, favKey, attempt]);

  const buildRequest = (page) => {
    const req = { limit: filters.fav ? 50 : PAGE_SIZE, page };
    if (filters.cat) req.categoryId = filters.cat;
    if (filters.sort) req.sort = filters.sort;
    if (filters.sale) req.sale = true;
    if (filters.q) req.q = filters.q;
    if (filters.fav) req.ids = favorites.ids.slice(0, 50);
    return req;
  };

  useEffect(() => {
    const id = ++requestRef.current;
    if (filters.fav && favorites.ids.length === 0) {
      setState({ items: [], total: 0, page: 1, loading: false, loadingMore: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    listProducts(buildRequest(1))
      .then((res) => {
        if (requestRef.current !== id) return;
        setState({ items: res.items || [], total: res.total || 0, page: 1, loading: false, loadingMore: false, error: null });
      })
      .catch((error) => {
        if (requestRef.current !== id) return;
        setState((prev) => ({ ...prev, loading: false, loadingMore: false, error }));
      });
  }, [filterKey]);

  const loadMore = () => {
    const id = requestRef.current;
    const nextPage = state.page + 1;
    setState((prev) => ({ ...prev, loadingMore: true }));
    listProducts(buildRequest(nextPage))
      .then((res) => {
        if (requestRef.current !== id) return;
        setState((prev) => {
          const seen = new Set(prev.items.map((p) => p.id));
          const extra = (res.items || []).filter((p) => !seen.has(p.id));
          return { ...prev, items: [...prev.items, ...extra], total: res.total || prev.total, page: nextPage, loadingMore: false };
        });
      })
      .catch((error) => {
        if (requestRef.current === id) setState((prev) => ({ ...prev, loadingMore: false, error }));
      });
  };

  const setSort = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'new') next.delete('sort');
    else next.set('sort', value);
    setParams(next, { replace: true });
  };

  const category = filters.cat ? (categories || []).find((c) => c.id === filters.cat) : null;
  const titleParts = [];
  if (filters.fav) titleParts.push('علاقه‌مندی‌ها');
  if (category) titleParts.push(category.nameFa);
  if (filters.sale) titleParts.push('حراج');
  if (filters.q) titleParts.push(`جستجوی «${filters.q}»`);
  if (titleParts.length === 0) titleParts.push(filters.sort === 'new' ? 'جدیدترین‌ها' : 'محصولات');
  const title = titleParts.join(' · ');

  let items = state.items;
  if (filters.fav) items = items.filter((p) => favorites.has(p.id));
  const activeSort = filters.sort || 'new';
  const canLoadMore = !filters.fav && state.items.length < state.total;

  return (
    <Section className="py-5 lg:py-8" label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink lg:text-3xl">{title}</h1>
          {!state.loading && !state.error ? (
            <p className="mt-1 text-sm text-muted">{formatNumber(filters.fav ? items.length : state.total)} محصول</p>
          ) : null}
        </div>
        <Link to={ROUTES.home} className="tap inline-flex items-center gap-1 text-sm font-bold text-ink">
          صفحه اصلی
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:px-0" role="group" aria-label="مرتب‌سازی">
        {SORTS.map((value) => (
          <button key={value} type="button" className="chip shrink-0" aria-pressed={activeSort === value} onClick={() => setSort(value)}>
            {SORT_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {state.error && items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-bold">{errorMessage(state.error)}</p>
            <button type="button" className="btn btn-navy mt-5" onClick={() => setAttempt((n) => n + 1)}>
              تلاش دوباره
            </button>
          </div>
        ) : state.loading && items.length === 0 ? (
          <ProductSkeletonGrid count={10} />
        ) : items.length === 0 ? (
          <EmptyBox
            title={filters.fav ? 'لیست علاقه‌مندی‌ها خالی است' : 'محصولی پیدا نشد'}
            text={filters.fav ? 'با زدن دکمه قلب روی هر محصول، آن را اینجا ذخیره کنید.' : 'فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.'}
          />
        ) : (
          <>
            <ProductGrid items={items} className={state.loading ? 'opacity-60 transition-opacity' : ''} />
            {canLoadMore ? (
              <div className="mt-8 flex justify-center">
                <button type="button" className="btn btn-outline" onClick={loadMore} disabled={state.loadingMore}>
                  {state.loadingMore ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Section>
  );
}

export default function Home() {
  const [params] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  return filters.active ? <Catalog filters={filters} /> : <Landing />;
}
