// adminDeleteProduct: soft delete (isActive = false). Old orders keep their snapshot rows.
import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { products } from '../schema.js';
import { requireAdmin } from '../lib/auth.js';

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const id = input && typeof input === 'object' ? input.id : undefined;
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new EndpointError('INVALID_INPUT', { code: 'INVALID_INPUT', field: 'id' });
  }
  const row = await db.select().from(products).where(eq(products.id, id)).get();
  if (!row) throw new EndpointError('NOT_FOUND', { code: 'NOT_FOUND' });
  await db.update(products).set({ isActive: false, isFeatured: false, updatedAt: new Date() }).where(eq(products.id, id)).run();
  return { ok: true };
}
