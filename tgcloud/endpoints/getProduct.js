// getProduct: full details of one active product (SPEC section 5).
import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { products } from '../schema.js';
import { getMoneyConverter } from '../lib/settings.js';

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

function cleanSizes(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 20)).slice(0, 20);
}

function cleanColors(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const hex = typeof c.hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.hex) ? c.hex : '';
    out.push({ name: str(c.name, 40), hex });
    if (out.length >= 20) break;
  }
  return out;
}

export default async function (input, ctx) {
  const id = input && typeof input === 'object' ? input.id : undefined;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new EndpointError('NOT_FOUND', { code: 'NOT_FOUND' });
  }

  const row = await db.select().from(products).where(eq(products.id, id)).get();
  if (!row || row.isActive !== true) {
    throw new EndpointError('NOT_FOUND', { code: 'NOT_FOUND' });
  }

  const money = await getMoneyConverter();
  const hasOld = Number.isInteger(row.oldPrice) && row.oldPrice > row.price;
  const photos = (Array.isArray(row.photos) ? row.photos : []).map(cleanImage).filter(Boolean).slice(0, 12);

  return {
    id: row.id,
    nameFa: row.nameFa,
    description: typeof row.description === 'string' ? row.description : '',
    price: money(row.price),
    oldPrice: hasOld ? money(row.oldPrice) : null,
    stock: Math.max(0, Number(row.stock) || 0),
    sizes: cleanSizes(row.sizes),
    colors: cleanColors(row.colors),
    photos,
    categoryId: row.categoryId,
  };
}
