// adminSaveProduct: create (no id) or update a product. Prices are in Toman.
import { db, EndpointError } from 'sdk';
import { desc, eq } from 'sdk/db';
import { products, categories } from '../schema.js';
import { requireAdmin } from '../lib/auth.js';
import { cleanText, toInt } from '../lib/ids.js';

const MAX_PRICE = 10_000_000_000;
const MAX_STOCK = 100000;
const MAX_SIZES = 20;
const MAX_COLORS = 20;
const MAX_PHOTOS = 12;
const FILE_ID = /^[A-Za-z0-9_-]{10,200}$/;

function invalid(field) {
  return new EndpointError('INVALID_INPUT', { code: 'INVALID_INPUT', field });
}

function wholeNumber(v, field, min, max) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw invalid(field);
  return v;
}

function cleanSizes(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_SIZES) throw invalid('sizes');
  const out = [];
  for (const s of v) {
    if (typeof s !== 'string') throw invalid('sizes');
    const t = s.trim().slice(0, 20);
    if (!t) throw invalid('sizes');
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

// Color names are what the cart sends back, so they must be unique.
function cleanColors(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_COLORS) throw invalid('colors');
  const out = [];
  for (const c of v) {
    if (!c || typeof c !== 'object') throw invalid('colors');
    const name = cleanText(c.name, 40);
    if (!name) throw invalid('colors');
    if (typeof c.hex !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(c.hex)) throw invalid('colors');
    if (out.some((x) => x.name === name)) throw invalid('colors');
    out.push({ name, hex: c.hex });
  }
  return out;
}

function cleanPhotos(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_PHOTOS) throw invalid('photos');
  const out = [];
  for (const p of v) {
    if (!p || typeof p !== 'object') throw invalid('photos');
    if (typeof p.full === 'string') {
      const thumb = typeof p.thumb === 'string' && p.thumb ? p.thumb : p.full;
      if (!FILE_ID.test(p.full) || !FILE_ID.test(thumb)) throw invalid('photos');
      out.push({ full: p.full, thumb });
    } else if (typeof p.url === 'string' && /^https:\/\/\S{4,980}$/i.test(p.url.trim())) {
      out.push({ url: p.url.trim() });
    } else {
      throw invalid('photos');
    }
  }
  return out;
}

function optionalBool(v, field, fallback) {
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'boolean') throw invalid(field);
  return v;
}

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const inp = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
  if (!inp) throw invalid('input');

  let id = null;
  if (inp.id !== undefined && inp.id !== null) id = wholeNumber(inp.id, 'id', 1, 2147483647);

  const categoryId = wholeNumber(inp.categoryId, 'categoryId', 1, 2147483647);
  const cat = await db.select().from(categories).where(eq(categories.id, categoryId)).get();
  if (!cat) throw invalid('categoryId');

  const nameFa = cleanText(inp.nameFa, 120);
  if (nameFa.length < 2) throw invalid('nameFa');
  if (inp.description !== undefined && inp.description !== null && typeof inp.description !== 'string') throw invalid('description');
  const description = cleanText(inp.description, 2000);

  const price = wholeNumber(inp.price, 'price', 1, MAX_PRICE);
  let oldPrice = null;
  if (inp.oldPrice !== undefined && inp.oldPrice !== null) {
    oldPrice = wholeNumber(inp.oldPrice, 'oldPrice', 1, MAX_PRICE);
    if (oldPrice <= price) oldPrice = null; // a "before" price that is not higher is not a discount
  }
  const stock = wholeNumber(inp.stock, 'stock', 0, MAX_STOCK);

  const values = {
    categoryId,
    nameFa,
    description,
    price,
    oldPrice,
    stock,
    sizes: cleanSizes(inp.sizes),
    colors: cleanColors(inp.colors),
    photos: cleanPhotos(inp.photos),
    isActive: optionalBool(inp.isActive, 'isActive', true),
    isFeatured: optionalBool(inp.isFeatured, 'isFeatured', false),
    updatedAt: new Date(),
  };

  if (id !== null) {
    const existing = await db.select().from(products).where(eq(products.id, id)).get();
    if (!existing) throw new EndpointError('NOT_FOUND', { code: 'NOT_FOUND' });
    await db.update(products).set(values).where(eq(products.id, id)).run();
    return { id };
  }

  const res = await db.insert(products).values(values).returning().run();
  let newId = Array.isArray(res) && res[0] ? res[0].id : null;
  if (!newId) {
    const last = await db.select().from(products).orderBy(desc(products.id)).limit(1).get();
    newId = last ? last.id : null;
  }
  if (!newId) throw new EndpointError('Could not save the product', { code: 'SAVE_FAILED' });
  return { id: newId };
}
