// endpoints/adminStats.js — dashboard numbers for the admin.
// Output: { today: { orders, revenue: Money }, week: { orders, revenue: Money },
//           pendingReceipts, lowStock: [{ id, nameFa, stock }], lowStockMax, byStatus }
// "orders" = orders created in the period that are not cancelled.
// "revenue" = total of orders created in the period whose payment was approved (paid, processing, shipped).
// "today" starts at 00:00 in UTC+03:30; "week" is the last 7 calendar days including today.
import { db } from 'sdk';
import { asc, and, eq, sql } from 'sdk/db';
import { requireAdmin } from '../lib/auth.js';
import { toUnix } from '../lib/db.js';
import { STATUS_LABEL_FA } from '../lib/orders.js';
import { getMoneyConverter } from '../lib/settings.js';
import { orders, products } from '../schema.js';

const DAY = 86400;
const TZ_OFFSET_SEC = 12600; // UTC+03:30
const PAID_STATUSES = new Set(['paid', 'processing', 'shipped']);
const LOW_STOCK_MAX = 5;
const LOW_STOCK_LIMIT = 10;
const WEEK_ROWS_LIMIT = 5000;

function summarize(rows, since, toMoney) {
  let count = 0;
  let revenue = 0;
  for (const row of rows) {
    if (toUnix(row.createdAt) < since) continue;
    if (row.status !== 'cancelled') count += 1;
    if (PAID_STATUSES.has(row.status)) revenue += Number(row.totalIrt) || 0;
  }
  return { orders: count, revenue: toMoney(revenue) };
}

export default async function (input, ctx) {
  await requireAdmin(ctx);

  const now = Math.floor(Date.now() / 1000);
  const dayStart = Math.floor((now + TZ_OFFSET_SEC) / DAY) * DAY - TZ_OFFSET_SEC;
  const weekStart = dayStart - 6 * DAY;
  const toMoney = await getMoneyConverter();

  const weekRows = await db
    .select()
    .from(orders)
    .where(sql`${orders.createdAt} >= ${weekStart}`)
    .limit(WEEK_ROWS_LIMIT)
    .all();

  const byStatus = {};
  for (const status of Object.keys(STATUS_LABEL_FA)) {
    byStatus[status] = await db.$count(orders, eq(orders.status, status));
  }

  const lowRows = await db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), sql`${products.stock} <= ${LOW_STOCK_MAX}`))
    .orderBy(asc(products.stock))
    .limit(LOW_STOCK_LIMIT)
    .all();

  return {
    today: summarize(weekRows, dayStart, toMoney),
    week: summarize(weekRows, weekStart, toMoney),
    pendingReceipts: byStatus.receipt_review || 0,
    lowStock: lowRows.map((p) => ({ id: p.id, nameFa: p.nameFa, stock: p.stock })),
    lowStockMax: LOW_STOCK_MAX,
    byStatus,
  };
}
