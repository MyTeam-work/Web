// Hero slider (DESIGN.md section 4 item 2): navy card, max 10 slides, RTL, autoplay every 5s,
// paused while touching / hovering, dots at the bottom, arrows on desktop only.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Img from './Img.jsx';
import { ROUTES, openTelegramLink, tg } from '../store.js';
import { toFaDigits } from '../lib/fa.js';

const MAX_SLIDES = 10;
const AUTOPLAY_MS = 5000;

// ---- link helpers (also used by the promo banners in Home.jsx) ----
function resolveLink(link) {
  if (!link || typeof link !== 'object') return null;
  if (link.type === 'category') return { to: ROUTES.catalog({ cat: link.value }) };
  if (link.type === 'product') return { to: ROUTES.product(link.value) };
  if (link.type === 'new') return { to: ROUTES.catalog({ sort: 'new' }) }; // internal: default slide
  if (link.type === 'url' && typeof link.value === 'string') return { href: link.value };
  return null;
}

function openExternal(url) {
  try {
    if (/^https?:\/\/(t\.me|telegram\.me)\//i.test(url)) {
      openTelegramLink(url);
      return;
    }
    const app = tg();
    if (app && typeof app.openLink === 'function') {
      app.openLink(url);
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Renders nothing when `link` is empty, so buttons without a link simply disappear. */
export function ActionLink({ link, className = '', children }) {
  const target = resolveLink(link);
  if (!target) return null;
  if (target.to) {
    return (
      <Link to={target.to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openExternal(target.href);
      }}
    >
      {children}
    </a>
  );
}

function defaultSlide(shopName) {
  return {
    image: null,
    eyebrow: 'کلکسیون جدید',
    title: shopName || 'فروشگاه',
    subtitle: 'پوشاک و اکسسوری لوکس',
    buttonText: 'مشاهده جدیدترین‌ها',
    link: { type: 'new' },
  };
}

function Slide({ slide, index, total, eager, stats }) {
  const hasImage = Boolean(slide.image);
  return (
    <div
      className="min-w-0 shrink-0 grow-0 basis-full"
      role="group"
      aria-roledescription="اسلاید"
      aria-label={`${toFaDigits(index + 1)} از ${toFaDigits(total)}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-navy-900 sm:aspect-[4/3] md:aspect-[16/8] lg:aspect-[16/7]">
        <div className="absolute inset-0 bg-linear-to-br from-navy-700 to-navy-900" aria-hidden="true" />

        {hasImage ? (
          // The absolute box lives on this wrapper; Img itself must stay "relative size-full",
          // otherwise its own "relative" class wins over "absolute" and the height collapses to 0.
          <div className="absolute inset-0 md:start-auto md:end-0 md:w-[62%]">
            <Img
              image={slide.image}
              size="full"
              tone="navy"
              eager={eager}
              position="center 18%"
              alt={slide.title || ''}
              className="size-full"
            />
          </div>
        ) : (
          <div aria-hidden="true">
            <span className="absolute -end-16 -top-16 size-64 rounded-full bg-white/5 md:size-96" />
            <span className="absolute -bottom-24 end-1/4 size-72 rounded-full bg-white/5 md:size-[28rem]" />
          </div>
        )}

        {/* Navy fades: from the bottom on mobile, from the text side on desktop */}
        <div
          className="absolute inset-0 md:hidden"
          aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(to top, #0A1A3F 6%, rgba(10,26,63,.72) 42%, rgba(10,26,63,0) 80%)' }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(to left, #0A1A3F 36%, rgba(10,26,63,.74) 52%, rgba(10,26,63,0) 100%)' }}
        />

        <div className="absolute inset-0 z-10 flex flex-col justify-end px-5 pb-[5.5rem] pt-6 text-start sm:px-8 md:w-[58%] md:justify-center md:pb-16 lg:px-14">
          {slide.eyebrow ? (
            <p className="mb-2 text-xs font-medium text-white/75 sm:text-sm md:mb-3">{slide.eyebrow}</p>
          ) : null}
          {slide.title ? (
            <h2 className="line-clamp-3 text-[30px] font-extrabold leading-[1.3] text-white sm:text-4xl lg:text-[56px] lg:leading-[1.2]">
              {slide.title}
            </h2>
          ) : null}
          {slide.subtitle ? (
            <p className="mt-1 line-clamp-2 text-[26px] font-light leading-[1.35] text-white/90 sm:text-3xl lg:text-5xl lg:leading-[1.3]">
              {slide.subtitle}
            </p>
          ) : null}

          <div className="mt-5 flex">
            <ActionLink link={slide.link} className="btn btn-white">
              {slide.buttonText || 'مشاهده'}
              <ArrowLeft className="size-[18px]" aria-hidden="true" />
            </ActionLink>
          </div>

          {stats && stats.length > 0 && (
            <dl className="mt-5 flex gap-5 border-t border-white/15 pt-4 md:mt-7 md:gap-8">
              {stats.map((s, i) => (
                <div key={`${s.label}-${i}`}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-lg font-extrabold leading-tight text-white md:text-2xl">{toFaDigits(s.value)}</dd>
                  <dd className="text-[11px] text-white/60 md:text-xs" aria-hidden="true">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

/** Props: slides (getHome.slides, max 10), heroStats (getHome.heroStats | null), shopName. */
export default function HeroSlider({ slides = [], heroStats = null, shopName = '' }) {
  const list = useMemo(() => {
    const clean = Array.isArray(slides) ? slides.filter(Boolean).slice(0, MAX_SLIDES) : [];
    return clean.length > 0 ? clean : [defaultSlide(shopName)];
  }, [slides, shopName]);
  const count = list.length;
  const stats = Array.isArray(heroStats) ? heroStats.slice(0, 4) : null;

  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: count > 1, watchDrag: count > 1 });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, count]);

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

  // Autoplay: next slide every 5s; paused while a finger is down or the pointer hovers.
  useEffect(() => {
    if (!emblaApi || count < 2) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer = null;
    const stop = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const start = () => {
      stop();
      timer = setTimeout(() => {
        if (!document.hidden) emblaApi.scrollNext();
        start();
      }, AUTOPLAY_MS);
    };
    const root = emblaApi.rootNode();
    emblaApi.on('pointerDown', stop);
    emblaApi.on('pointerUp', start);
    emblaApi.on('select', start); // restart the countdown after any slide change (dots, arrows, swipe)
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    start();
    return () => {
      stop();
      emblaApi.off('pointerDown', stop);
      emblaApi.off('pointerUp', start);
      emblaApi.off('select', start);
      root.removeEventListener('mouseenter', stop);
      root.removeEventListener('mouseleave', start);
    };
  }, [emblaApi, count]);

  const near = (i) => i === selected || i === (selected + 1) % count || i === (selected - 1 + count) % count;

  return (
    <div className="relative" role="region" aria-roledescription="اسلایدر" aria-label="اسلایدر اصلی">
      <div className="overflow-hidden rounded-hero shadow-soft" ref={emblaRef}>
        <div className="flex [touch-action:pan-y_pinch-zoom]">
          {list.map((slide, i) => (
            <Slide key={i} slide={slide} index={i} total={count} eager={near(i)} stats={stats} />
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            aria-label="اسلاید قبلی"
            className="tap absolute start-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm lg:inline-flex"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi && emblaApi.scrollNext()}
            aria-label="اسلاید بعدی"
            className="tap absolute end-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm lg:inline-flex"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>

          <div className="absolute inset-x-0 bottom-10 z-20 flex justify-center" role="tablist" aria-label="انتخاب اسلاید">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === selected}
                aria-label={`رفتن به اسلاید ${toFaDigits(i + 1)}`}
                onClick={() => emblaApi && emblaApi.scrollTo(i)}
                className="flex h-9 items-center px-[3px]"
              >
                <span
                  className={`block h-2 rounded-full shadow-sm transition-all duration-300 ${
                    i === selected ? 'w-6 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
