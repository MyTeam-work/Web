// adminListProducts: all products (active and inactive) for the admin panel.
// With { id } it returns that single product (used by the edit form).
import { db, EndpointError } from 'sdk';
import { and, desc, eq, sql } from 'sdk/db';
import { products } from '../schema.js';
import { requireAdmin } from '../lib/auth.js';
import { toInt } from '../lib/ids.js';
import { toUnix } from '../lib/db.js';

function invalid(field) {
  return new EndpointError('INVALID_INPUT', { code: 'INVALID_INPUT', field });
}

function cleanImage(p) {
  if (!p || typeof p !== 'object') return null;
  if (typeof p.full === 'string' && p.full) {
    return { full: p.full, thumb: typeof p.thumb === 'string' && p.thumb ? p.thumb : p.full };
  }
  if (typeof p.url === 'string' && /^https?:\/\//i.test(p.url.trim())) return { url: p.url.trim() };
  return null;
}

function toItem(r) {
  const photos = (Array.isArray(r.photos) ? r.photos : []).map(cleanImage).filter(Boolean);
  return {
    id: r.id,
    categoryId: r.categoryId,
    nameFa: r.nameFa,
    description: typeof r.description === 'string' ? r.description : '',
    price: r.price, // Toman
    oldPrice: r.oldPrice ?? null, // Toman
    stock: r.stock,
    sizes: Array.isArray(r.sizes) ? r.sizes : [],
    colors: Array.isArray(r.colors) ? r.colors : [],
    photos,
    cover: photos[0] || null,
    isActive: r.isActive === true,
    isFeatured: r.isFeatured === true,
    createdAt: toUnix(r.createdAt),
    updatedAt: toUnix(r.updatedAt),
  };
}

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const inp = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  // Single product: q and page are ignored. Inactive products are returned too.
  if (inp.id !== undefined && inp.id !== null) {
    if (!Number.isInteger(inp.id) || inp.id < 1 || inp.id > 2147483647) throw invalid('id');
    const row = await db.select().from(products).where(eq(products.id, inp.id)).get();
    return row ? { items: [toItem(row)], total: 1, page: 1 } : { items: [], total: 0, page: 1 };
  }

  let q = '';
  if (inp.q !== undefined && inp.q !== null) {
    if (typeof inp.q !== 'string') throw invalid('q');
    q = inp.q.trim().slice(0, 60);
  }
  const page = inp.page === undefined || inp.page === null ? 1 : toInt(inp.page, 1, 100000, null);
  if (page === null) throw invalid('page');
  const limit = inp.limit === undefined || inp.limit === null ? 20 : toInt(inp.limit, 1, 50, null);
  if (limit === null) throw invalid('limit');

  const conds = [];
  if (q) {
    const esc = q.replace(/[\\%_]/g, (m) => '\\' + m);
    const pat = `%${esc}%`;
    conds.push(sql`${products.nameFa} LIKE ${pat} ESCAPE '\\'`);
  }
  const where = conds.length ? and(...conds) : undefined;

  let query = db.select().from(products);
  if (where) query = query.where(where);
  const [rows, total] = await Promise.all([
    query.orderBy(desc(products.id)).limit(limit).offset((page - 1) * limit).all(),
    where ? db.$count(products, where) : db.$count(products),
  ]);

  return { items: rows.map(toItem), total, page };
}
