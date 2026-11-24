// placeOrder: creates an order from the cart (SPEC section 5). Prices and stock always come from the database.
import { db, EndpointError } from 'sdk';
import { and, eq } from 'sdk/db';
import { orders } from '../schema.js';
import { getUser } from '../lib/auth.js';
import { createOrder } from '../lib/orders.js';
import { getPayInfo, toMoney } from '../lib/settings.js';
import { cleanText, toInt } from '../lib/ids.js';
import { upsertUser, setUserCurrency } from '../lib/db.js';
import { notifyAdminNewOrder } from '../lib/notify.js';

const MAX_ITEMS = 30;
const MAX_QTY = 20;
const MAX_PENDING_ORDERS = 5; // unpaid orders hold stock, so cap them per customer

function fail(code, extra) {
  return new EndpointError(code, { code, ...(extra || {}) });
}

function invalid(field, extra) {
  return fail('INVALID_INPUT', { field, ...(extra || {}) });
}

function toEnDigits(s) {
  return s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

// Optional short text (size / color): undefined, null and '' become null.
function optionalLabel(v, field) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw invalid(field);
  const t = v.trim().slice(0, 40);
  return t || null;
}

function cleanItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw fail('EMPTY_CART');
  if (raw.length > MAX_ITEMS) throw invalid('items');
  const merged = new Map();
  for (const it of raw) {
    if (!it || typeof it !== 'object') throw invalid('items');
    const productId = toInt(it.productId, 1, 2147483647, null);
    if (productId === null) throw invalid('productId');
    const qty = toInt(it.qty, 1, MAX_QTY, null);
    if (qty === null) throw invalid('qty', { productId });
    const size = optionalLabel(it.size, 'size');
    const color = optionalLabel(it.color, 'color');
    const key = `${productId}|${size ?? ''}|${color ?? ''}`;
    const prev = merged.get(key);
    if (prev) {
      prev.qty += qty;
      if (prev.qty > MAX_QTY) throw invalid('qty', { productId });
    } else {
      merged.set(key, { productId, qty, size, color });
    }
  }
  return [...merged.values()];
}

export default async function (input, ctx) {
  const user = getUser(ctx);
  const inp = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
  if (!inp) throw invalid('input');

  if (inp.currency !== 'IRT' && inp.currency !== 'AFN') throw invalid('currency');
  const currency = inp.currency;

  const items = cleanItems(inp.items);

  const name = cleanText(inp.name, 80);
  if (name.length < 2) throw invalid('name');
  const phone = toEnDigits(cleanText(inp.phone, 30)).replace(/[\s\-()]/g, '');
  if (!/^\+?[0-9]{8,15}$/.test(phone)) throw invalid('phone');
  const address = cleanText(inp.address, 500);
  if (address.length < 10) throw invalid('address');
  if (inp.note !== undefined && inp.note !== null && typeof inp.note !== 'string') throw invalid('note');
  const note = cleanText(inp.note, 500);

  // The customer must be able to pay in the chosen currency before stock is reserved.
  const pay = await getPayInfo(currency);
  if (!pay || typeof pay !== 'object' || !pay.number) throw fail('PAYMENT_UNAVAILABLE', { currency });

  const pending = await db.$count(orders, and(eq(orders.userTgId, user.id), eq(orders.status, 'awaiting_receipt')));
  if (pending >= MAX_PENDING_ORDERS) throw fail('TOO_MANY_PENDING');

  try {
    await upsertUser(user);
    await setUserCurrency(user.id, currency);
  } catch (e) {
    console.warn('placeOrder: could not update the user row');
  }

  // createOrder re-reads prices, checks size/color/stock and reserves stock.
  const { order, money } = await createOrder({
    userTgId: user.id,
    currency,
    customer: { name, phone, address, note: note || null },
    items,
  });

  await notifyAdminNewOrder(order.id); // never throws

  const rate = order.fxRate;
  return {
    orderId: order.id,
    code: order.code,
    total: money,
    subtotal: toMoney(order.subtotalIrt, rate),
    shipping: toMoney(order.shippingIrt, rate),
    currency: order.currency,
    pay: {
      amount: order.payAmount,
      number: String(pay.number),
      holder: pay.holder ? String(pay.holder) : '',
      bank: pay.bank ? String(pay.bank) : null,
      note: pay.note ? String(pay.note) : null,
    },
    status: order.status,
  };
}
