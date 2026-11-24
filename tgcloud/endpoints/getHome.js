// getHome: everything the Home page needs in one call (SPEC section 5).
import { db } from 'sdk';
import { and, asc, desc, eq } from 'sdk/db';
import { products, categories } from '../schema.js';
import { getSettings, getMoneyConverter, normalizeCurrency } from '../lib/settings.js';
import { isAdmin } from '../lib/auth.js';

const MAX_SLIDES = 10;
const MAX_PROMOS = 2;
const SECTION_SIZE = 8;
const COVER_SCAN_LIMIT = 200; // newest active products scanned to pick one cover per category

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Image = { full, thumb } (file_ids) or { url }. Anything else becomes null.
function cleanImage(p) {
  if (typeof p === 'string' && /^https?:\/\//i.test(p.trim())) return { url: p.trim().slice(0, 1000) };
  if (!p || typeof p !== 'object') return null;
  if (typeof p.full === 'string' && p.full) {
    const thumb = typeof p.thumb === 'string' && p.thumb ? p.thumb : p.full;
    return { full: p.full, thumb };
  }
  if (typeof p.url === 'string' && /^https?:\/\//i.test(p.url.trim())) return { url: p.url.trim().slice(0, 1000) };
  return null;
}

function firstImage(photos) {
  return (Array.isArray(photos) ? photos : []).map(cleanImage).find(Boolean) || null;
}

function cleanColors(list, max) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const hex = typeof c.hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.hex) ? c.hex : '';
    out.push({ name: str(c.name, 40), hex });
    if (out.length >= max) break;
  }
  return out;
}

function cleanLink(l) {
  if (!l || typeof l !== 'object') return null;
  if (l.type === 'category' || l.type === 'product') {
    const n = Number(l.value);
    return Number.isInteger(n) && n > 0 ? { type: l.type, value: n } : null;
  }
  if (l.type === 'url' && typeof l.value === 'string' && /^https?:\/\//i.test(l.value.trim())) {
    return { type: 'url', value: l.value.trim().slice(0, 500) };
  }
  return null;
}

function cleanSlides(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list) {
    if (!s || typeof s !== 'object') continue;
    const slide = {
      image: cleanImage(s.image),
      eyebrow: str(s.eyebrow, 60),
      title: str(s.title, 120),
      subtitle: str(s.subtitle, 240),
      buttonText: str(s.buttonText, 40),
      link: cleanLink(s.link),
    };
    if (!slide.image && !slide.title) continue;
    out.push(slide);
    if (out.length >= MAX_SLIDES) break;
  }
  return out;
}

function cleanPromos(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const promo = {
      theme: p.theme === 'light' ? 'light' : 'dark',
      eyebrow: str(p.eyebrow, 60),
      title: str(p.title, 120),
      text: str(p.text, 300),
      buttonText: str(p.buttonText, 40),
      link: cleanLink(p.link),
      image: cleanImage(p.image),
    };
    if (!promo.title && !promo.image) continue;
    out.push(promo);
    if (out.length >= MAX_PROMOS) break;
  }
  return out;
}

// Shape: [{ value, label }] or null (max 6).
function cleanHeroStats(v) {
  if (!Array.isArray(v)) return null;
  const out = [];
  for (const it of v) {
    if (!it || typeof it !== 'object') continue;
    const value = str(String(it.value ?? ''), 20);
    const label = str(String(it.label ?? ''), 40);
    if (value && label) out.push({ value, label });
    if (out.length >= 6) break;
  }
  return out.length ? out : null;
}

function toCard(row, money) {
  const hasOld = Number.isInteger(row.oldPrice) && row.oldPrice > row.price;
  return {
    id: row.id,
    nameFa: row.nameFa,
    price: money(row.price),
    oldPrice: hasOld ? money(row.oldPrice) : null,
    cover: firstImage(row.photos),
    colors: cleanColors(row.colors, 4),
    inStock: Number(row.stock) > 0,
  };
}

// Category cover = first photo of the newest active product of that category that has a photo.
// recentRows must be ordered newest first.
function coverByCategory(recentRows) {
  const covers = new Map();
  for (const row of recentRows) {
    if (covers.has(row.categoryId)) continue;
    const img = firstImage(row.photos);
    if (img) covers.set(row.categoryId, img);
  }
  return covers;
}

export default async function (input, ctx) {
  const newest = [desc(products.createdAt), desc(products.id)];
  const [settings, money, cats, featuredRows, newRows, recentRows] = await Promise.all([
    getSettings(),
    getMoneyConverter(),
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder), asc(categories.id)).all(),
    db.select().from(products).where(and(eq(products.isActive, true), eq(products.isFeatured, true))).orderBy(...newest).limit(SECTION_SIZE).all(),
    db.select().from(products).where(eq(products.isActive, true)).orderBy(...newest).limit(SECTION_SIZE).all(),
    db.select().from(products).where(eq(products.isActive, true)).orderBy(...newest).limit(COVER_SCAN_LIMIT).all(),
  ]);

  let admin = false;
  try {
    admin = (await isAdmin(ctx)) === true;
  } catch (e) {
    admin = false;
  }

  const rate = Number(settings.toman_per_afn);
  const covers = coverByCategory(recentRows);

  return {
    shopName: str(settings.shop_name, 80),
    slides: cleanSlides(settings.slides),
    categories: cats.map((c) => ({ id: c.id, slug: c.slug, nameFa: c.nameFa, cover: covers.get(c.id) || null })),
    promos: cleanPromos(settings.promos),
    featured: featuredRows.map((r) => toCard(r, money)),
    newArrivals: newRows.map((r) => toCard(r, money)),
    currency: {
      default: normalizeCurrency(settings.default_currency),
      tomanPerAfn: rate > 0 ? rate : null,
    },
    heroStats: cleanHeroStats(settings.hero_stats),
    isAdmin: admin,
  };
}
