// listProducts: catalogue listing with filters, sorting and paging (SPEC section 5).
import { db, EndpointError } from 'sdk';
import { and, asc, desc, eq, inArray, sql } from 'sdk/db';
import { products } from '../schema.js';
import { getMoneyConverter } from '../lib/settings.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 1000;
const MAX_IDS = 50;
const MAX_Q = 60;
const SORTS = ['new', 'price_asc', 'price_desc'];

function invalid(field) {
  return new EndpointError('INVALID_INPUT', { code: 'INVALID_INPUT', field });
}

function intField(v, field, min, max, fallback) {
  if (v === undefined || v === null) return fallback;
  if (!Number.isInteger(v) || v < min || v > max) throw invalid(field);
  return v;
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function cleanImage(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.full === 'string' && p.full) {
    const thumb = typeof p.thumb === 'string' && p.thumb ? p.thumb : p.full;
    return { full: p.full, thumb };
  }
  if (typeof p.url === 'string' && /^https?:\/\//i.test(p.url.trim())) return { url: p.url.trim().slice(0, 1000) };
  return null;
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

function toCard(row, money) {
  const photos = Array.isArray(row.photos) ? row.photos : [];
  const cover = photos.map(cleanImage).find(Boolean) || null;
  const hasOld = Number.isInteger(row.oldPrice) && row.oldPrice > row.price;
  return {
    id: row.id,
    nameFa: row.nameFa,
    price: money(row.price),
    oldPrice: hasOld ? money(row.oldPrice) : null,
    cover,
    colors: cleanColors(row.colors, 4),
    inStock: Number(row.stock) > 0,
  };
}

export default async function (input, ctx) {
  if (input !== undefined && input !== null && (typeof input !== 'object' || Array.isArray(input))) {
    throw invalid('input');
  }
  const inp = input || {};

  const categoryId = intField(inp.categoryId, 'categoryId', 1, 2147483647, null);
  const page = intField(inp.page, 'page', 1, MAX_PAGE, 1);
  const limit = intField(inp.limit, 'limit', 1, MAX_LIMIT, DEFAULT_LIMIT);

  if (inp.sort !== undefined && inp.sort !== null && !SORTS.includes(inp.sort)) throw invalid('sort');
  const sortGiven = inp.sort !== undefined && inp.sort !== null;
  const sort = sortGiven ? inp.sort : 'new';

  if (inp.sale !== undefined && inp.sale !== null && typeof inp.sale !== 'boolean') throw invalid('sale');
  const sale = inp.sale === true;

  let q = '';
  if (inp.q !== undefined && inp.q !== null) {
    if (typeof inp.q !== 'string') throw invalid('q');
    q = inp.q.trim().slice(0, MAX_Q);
  }

  let ids = null;
  if (inp.ids !== undefined && inp.ids !== null) {
    if (!Array.isArray(inp.ids) || inp.ids.length > MAX_IDS) throw invalid('ids');
    for (const id of inp.ids) {
      if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw invalid('ids');
    }
    ids = [...new Set(inp.ids)];
    if (ids.length === 0) return { items: [], total: 0, page };
  }

  const conds = [eq(products.isActive, true)];
  if (categoryId) conds.push(eq(products.categoryId, categoryId));
  if (ids) conds.push(inArray(products.id, ids));
  if (sale) conds.push(sql`${products.oldPrice} IS NOT NULL AND ${products.oldPrice} > ${products.price}`);
  if (q) {
    const esc = q.replace(/[\\%_]/g, (m) => '\\' + m);
    const pat = `%${esc}%`;
    conds.push(sql`(${products.nameFa} LIKE ${pat} ESCAPE '\\' OR ${products.description} LIKE ${pat} ESCAPE '\\')`);
  }
  const where = and(...conds);

  let order;
  if (sort === 'price_asc') order = [asc(products.price), desc(products.id)];
  else if (sort === 'price_desc') order = [desc(products.price), desc(products.id)];
  else order = [desc(products.createdAt), desc(products.id)];

  const [rows, total, money] = await Promise.all([
    db.select().from(products).where(where).orderBy(...order).limit(limit).offset((page - 1) * limit).all(),
    db.$count(products, where),
    getMoneyConverter(),
  ]);

  let items = rows.map((r) => toCard(r, money));
  // Favourites: keep the order the client asked for when no explicit sort was given.
  if (ids && !sortGiven) {
    const pos = new Map(ids.map((id, i) => [id, i]));
    items = items.sort((a, b) => pos.get(a.id) - pos.get(b.id));
  }

  return { items, total, page };
}
