import { db, EndpointError } from 'sdk';
import { eq, and, desc, inArray, sql } from 'sdk/db';
import { orders, orderItems, products } from '../schema.js';
import { getSetting, getRate, toMoney, normalizeCurrency } from './settings.js';
import { newOrderCode, toInt } from './ids.js';

export const STATUS_LABEL_FA = {
  awaiting_receipt: 'در انتظار رسید',
  receipt_review: 'در حال بررسی پرداخت',
  paid: 'پرداخت تأیید شد',
  rejected: 'رسید رد شد',
  processing: 'در حال پردازش',
  shipped: 'ارسال شد',
  cancelled: 'لغو شد',
};

// Admin actions (adminReviewOrder and the bot buttons call applyAction with these keys).
export const ACTIONS = {
  approve: { from: ['receipt_review'], to: 'paid' },
  reject: { from: ['receipt_review'], to: 'rejected' },
  processing: { from: ['paid'], to: 'processing' },
  shipped: { from: ['processing'], to: 'shipped' },
  cancel: { from: ['awaiting_receipt', 'receipt_review', 'rejected', 'paid', 'processing'], to: 'cancelled' },
};

const fail = (message, code, extra = {}) => new EndpointError(message, { code, ...extra });

// Number of rows changed by an update that used .returning().run() (the result is an array of rows).
const affected = (result) => (Array.isArray(result) ? result.length : Number(result && result.rowsAffected) || 0);

// ---------- reads ----------

export async function getOrder(id) {
  return db.select().from(orders).where(eq(orders.id, id)).get();
}

export async function getOrderByCode(code) {
  return db.select().from(orders).where(eq(orders.code, code)).get();
}

export async function getOrderItems(orderId) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
}

export async function getOrderWithItems(id) {
  const order = await getOrder(id);
  if (!order) return null;
  return { order, items: await getOrderItems(id) };
}

async function withItemsCount(rows) {
  if (!rows.length) return rows;
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((r) => r.id)))
    .all();
  const sums = new Map();
  for (const it of items) sums.set(it.orderId, (sums.get(it.orderId) || 0) + it.qty);
  return rows.map((r) => ({ ...r, itemsCount: sums.get(r.id) || 0 }));
}

function pageArgs(page, limit) {
  const lim = toInt(limit, 1, 50, 20);
  const pg = toInt(page, 1, 100000, 1);
  return { lim, pg, offset: (pg - 1) * lim };
}

// Orders of one customer, newest first. Each row has itemsCount.
export async function listUserOrders(userTgId, { page, limit } = {}) {
  const { lim, pg, offset } = pageArgs(page, limit);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userTgId, userTgId))
    .orderBy(desc(orders.id))
    .limit(lim)
    .offset(offset)
    .all();
  return { items: await withItemsCount(rows), page: pg };
}

// Admin list, optionally filtered by status.
export async function listOrders({ status, page, limit } = {}) {
  const { lim, pg, offset } = pageArgs(page, limit);
  const where = status ? eq(orders.status, status) : undefined;
  let query = db.select().from(orders);
  if (where) query = query.where(where);
  const rows = await query.orderBy(desc(orders.id)).limit(lim).offset(offset).all();
  const total = where ? await db.$count(orders, where) : await db.$count(orders);
  return { items: await withItemsCount(rows), total, page: pg };
}

// ---------- stock ----------

async function reserveStock(productId, qty) {
  const result = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${qty}`, updatedAt: new Date() })
    .where(and(eq(products.id, productId), sql`${products.stock} >= ${qty}`))
    .returning()
    .run();
  return affected(result) === 1;
}

async function releaseStock(productId, qty) {
  await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${qty}`, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .run();
}

// ---------- create ----------

// items: [{ productId, qty, size, color }]. The endpoint validates types and limits;
// this function trusts nothing about prices or stock and reads them from the database.
// customer: { name, phone, address, note }.
export async function createOrder({ userTgId, currency, customer, items }) {
  const cur = normalizeCurrency(currency);
  if (!Array.isArray(items) || items.length === 0) throw fail('Cart is empty', 'EMPTY_CART');

  const ids = [...new Set(items.map((i) => i.productId))];
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isActive, true)))
    .all();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const need = new Map();
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p) throw fail('Product not found', 'NOT_FOUND', { productId: it.productId });
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const colors = Array.isArray(p.colors) ? p.colors.map((c) => c.name) : [];
    if (sizes.length && !sizes.includes(it.size)) throw fail('Invalid size', 'INVALID_INPUT', { field: 'size', productId: p.id });
    if (colors.length && !colors.includes(it.color)) throw fail('Invalid color', 'INVALID_INPUT', { field: 'color', productId: p.id });
    need.set(p.id, (need.get(p.id) || 0) + it.qty);
  }
  for (const [id, qty] of need) {
    if (byId.get(id).stock < qty) throw fail('Out of stock', 'OUT_OF_STOCK', { productId: id });
  }

  let subtotal = 0;
  for (const it of items) subtotal += byId.get(it.productId).price * it.qty;
  const shipping = Math.max(0, Math.round(Number(await getSetting('shipping_fee')) || 0));
  const total = subtotal + shipping;
  const rate = await getRate();
  const money = toMoney(total, rate);
  if (cur === 'AFN' && money.afn === null) throw fail('Afghani is not available', 'CURRENCY_UNAVAILABLE');
  const payAmount = cur === 'AFN' ? money.afn : total;

  // Reserve stock first; give it back if anything below fails.
  const reserved = [];
  try {
    for (const [id, qty] of need) {
      if (!(await reserveStock(id, qty))) throw fail('Out of stock', 'OUT_OF_STOCK', { productId: id });
      reserved.push([id, qty]);
    }
    let code = newOrderCode();
    for (let i = 0; i < 5 && (await getOrderByCode(code)); i++) code = newOrderCode();

    await db
      .insert(orders)
      .values({
        code,
        userTgId,
        currency: cur,
        customerName: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note || null,
        subtotalIrt: subtotal,
        shippingIrt: shipping,
        totalIrt: total,
        totalAfn: money.afn,
        payAmount,
        fxRate: rate,
        status: 'awaiting_receipt',
      })
      .run();
    const order = await getOrderByCode(code);
    await db
      .insert(orderItems)
      .values(
        items.map((it) => ({
          orderId: order.id,
          productId: it.productId,
          nameFa: byId.get(it.productId).nameFa,
          unitPriceIrt: byId.get(it.productId).price,
          qty: it.qty,
          size: it.size ?? null,
          color: it.color ?? null,
        })),
      )
      .run();
    return { order, items: await getOrderItems(order.id), money };
  } catch (e) {
    for (const [id, qty] of reserved) await releaseStock(id, qty);
    throw e;
  }
}

// ---------- transitions ----------

// Update only when the order is still in the status we read: protects against double clicks.
async function moveOrder(order, allowedFrom, to, extra = {}) {
  if (!allowedFrom.includes(order.status)) {
    throw fail(`Cannot move an order from ${order.status} to ${to}`, 'BAD_STATE');
  }
  const result = await db
    .update(orders)
    .set({ status: to, updatedAt: new Date(), ...extra })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning()
    .run();
  if (affected(result) !== 1) throw fail('Order was changed by someone else', 'BAD_STATE');
}

// Customer sent a receipt photo (file_id of the copy stored in the storage channel).
export async function submitReceipt(orderId, receiptFileId) {
  const order = await getOrder(orderId);
  if (!order) throw fail('Order not found', 'NOT_FOUND');
  await moveOrder(order, ['awaiting_receipt', 'rejected'], 'receipt_review', {
    receiptFileId,
    receiptAt: new Date(),
  });
  return { order: await getOrder(orderId), from: order.status, to: 'receipt_review' };
}

// action: 'approve' | 'reject' | 'processing' | 'shipped' | 'cancel'. Cancelling returns the stock.
export async function applyAction(orderId, action, { note } = {}) {
  const rule = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
  if (!rule) throw fail('Unknown action', 'INVALID_INPUT', { field: 'action' });
  const order = await getOrder(orderId);
  if (!order) throw fail('Order not found', 'NOT_FOUND');
  await moveOrder(order, rule.from, rule.to, note ? { adminNote: note } : {});
  if (action === 'cancel') {
    for (const it of await getOrderItems(orderId)) await releaseStock(it.productId, it.qty);
  }
  return { order: await getOrder(orderId), from: order.status, to: rule.to };
}

// Convenience for endpoints and notifications: both currencies of an order total.
export function orderTotalMoney(order) {
  return { irt: order.totalIrt, afn: order.totalAfn ?? null };
}
