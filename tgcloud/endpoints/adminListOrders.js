// endpoints/adminListOrders.js — admin order list ({ status?, page? }) or one order ({ id }).
// Shapes: list  -> { items: AdminOrderRow[], total, page, hasMore }
//         detail -> { order, items, customer }
import { EndpointError } from 'sdk';
import { requireAdmin } from '../lib/auth.js';
import { getUserByTgId, toUnix } from '../lib/db.js';
import { toInt } from '../lib/ids.js';
import { STATUS_LABEL_FA, getOrderWithItems, listOrders, orderTotalMoney } from '../lib/orders.js';
import { toMoney } from '../lib/settings.js';

const PAGE_SIZE = 20;
const MAX_ID = 2147483647;

const invalid = (field) => new EndpointError('Invalid input', { code: 'INVALID_INPUT', field });

function listRow(order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    currency: order.currency,
    customerName: order.customerName || '',
    total: orderTotalMoney(order),
    payAmount: order.payAmount,
    itemsCount: order.itemsCount || 0,
    hasReceipt: Boolean(order.receiptFileId),
    createdAt: toUnix(order.createdAt),
  };
}

// Money for the detail view uses the rate stored on the order, not today's rate.
function detailOrder(order) {
  const rate = order.fxRate;
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    currency: order.currency,
    customerName: order.customerName || '',
    phone: order.phone || '',
    address: order.address || '',
    note: order.note || '',
    subtotal: toMoney(order.subtotalIrt, rate),
    shipping: toMoney(order.shippingIrt, rate),
    total: orderTotalMoney(order),
    payAmount: order.payAmount,
    receiptFileId: order.receiptFileId || null,
    receiptAt: toUnix(order.receiptAt),
    adminNote: order.adminNote || '',
    createdAt: toUnix(order.createdAt),
    updatedAt: toUnix(order.updatedAt),
  };
}

function detailItem(item, rate) {
  return {
    id: item.id,
    productId: item.productId,
    nameFa: item.nameFa,
    unitPrice: toMoney(item.unitPriceIrt, rate),
    qty: item.qty,
    size: item.size || null,
    color: item.color || null,
  };
}

export default async function (input, ctx) {
  await requireAdmin(ctx);
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  // ----- one order -----
  if (data.id !== undefined && data.id !== null) {
    const id = toInt(data.id, 1, MAX_ID);
    if (id === null) throw invalid('id');
    const found = await getOrderWithItems(id);
    if (!found) throw new EndpointError('Order not found', { code: 'NOT_FOUND' });
    const { order, items } = found;
    const user = await getUserByTgId(order.userTgId);
    return {
      order: detailOrder(order),
      items: items.map((it) => detailItem(it, order.fxRate)),
      customer: {
        tgId: order.userTgId,
        username: (user && user.username) || null,
        firstName: (user && user.firstName) || null,
        isBlocked: Boolean(user && user.isBlocked),
      },
    };
  }

  // ----- list -----
  let status;
  if (data.status !== undefined && data.status !== null && data.status !== '') {
    if (typeof data.status !== 'string' || !Object.hasOwn(STATUS_LABEL_FA, data.status)) throw invalid('status');
    status = data.status;
  }
  let page = 1;
  if (data.page !== undefined && data.page !== null) {
    page = toInt(data.page, 1, 100000);
    if (page === null) throw invalid('page');
  }

  const res = await listOrders({ status, page, limit: PAGE_SIZE });
  return {
    items: res.items.map(listRow),
    total: res.total,
    page: res.page,
    hasMore: res.page * PAGE_SIZE < res.total,
  };
}
