// myOrders { page? } -> { items: OrderSummary[], page, hasMore }
// OrderSummary = { id, code, status, currency, total: Money,
//                  createdAt (unix seconds), itemsCount }
import { getUser } from '../lib/auth.js';
import { listUserOrders, orderTotalMoney } from '../lib/orders.js';
import { toUnix } from '../lib/db.js';
import { toInt } from '../lib/ids.js';

const LIMIT = 20;

export default async function (input, ctx) {
  // Identity comes only from the verified initData.
  const user = getUser(ctx);
  const page = toInt(input && input.page, 1, 1000, 1);
  const res = await listUserOrders(user.id, { page, limit: LIMIT });
  const items = res.items.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    currency: o.currency,
    total: orderTotalMoney(o),
    createdAt: toUnix(o.createdAt),
    itemsCount: o.itemsCount,
  }));
  return { items, page, hasMore: items.length === LIMIT };
}
