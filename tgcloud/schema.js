import { table, integer, text, boolean, json, real, index } from 'sdk/db';

// Unix-seconds timestamp column that defaults to "now".
import { sql } from 'sdk/db';
const ts = (name) => integer(name, { mode: 'timestamp' }).default(sql`(unixepoch())`);

// No foreign keys on this platform: relations are plain integer columns,
// integrity is enforced in lib/orders.js and the endpoints.

export const users = table('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tgId: integer('tg_id').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  username: text('username'),
  languageCode: text('language_code'),
  phone: text('phone'),
  isBlocked: boolean('is_blocked').default(false),
  currency: text('currency').default('IRT'),
  createdAt: ts('created_at'),
  lastSeenAt: ts('last_seen_at'),
});

export const settings = table('settings', {
  key: text('key').primaryKey(),
  value: json('value'),
  updatedAt: ts('updated_at'),
});

export const categories = table('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  nameFa: text('name_fa').notNull(),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
});

// price and oldPrice are in Toman. photos = array of { full, thumb } (file_ids) or { url }.
export const products = table('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull(),
  nameFa: text('name_fa').notNull(),
  description: text('description').default(''),
  price: integer('price').notNull(),
  oldPrice: integer('old_price'),
  stock: integer('stock').notNull().default(0),
  sizes: json('sizes'),
  colors: json('colors'),
  photos: json('photos'),
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
}, (t) => ({
  idxCategory: index('idx_products_category').on(t.categoryId, t.isActive),
}));

export const orders = table('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  userTgId: integer('user_tg_id').notNull(),
  currency: text('currency').notNull().default('IRT'),
  customerName: text('customer_name'),
  phone: text('phone'),
  address: text('address'),
  note: text('note'),
  subtotalIrt: integer('subtotal_irt').notNull().default(0),
  shippingIrt: integer('shipping_irt').notNull().default(0),
  totalIrt: integer('total_irt').notNull().default(0),
  totalAfn: integer('total_afn'),
  payAmount: integer('pay_amount').notNull().default(0),
  fxRate: real('fx_rate'),
  status: text('status').notNull().default('awaiting_receipt'),
  receiptFileId: text('receipt_file_id'),
  receiptAt: integer('receipt_at', { mode: 'timestamp' }),
  adminNote: text('admin_note'),
  createdAt: ts('created_at'),
  updatedAt: ts('updated_at'),
}, (t) => ({
  idxUser: index('idx_orders_user').on(t.userTgId),
  idxStatus: index('idx_orders_status').on(t.status),
}));

export const orderItems = table('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull(),
  productId: integer('product_id').notNull(),
  nameFa: text('name_fa').notNull(),
  unitPriceIrt: integer('unit_price_irt').notNull(),
  qty: integer('qty').notNull(),
  size: text('size'),
  color: text('color'),
}, (t) => ({
  idxOrder: index('idx_order_items_order').on(t.orderId),
}));

// direction is 'in' (user to admin) or 'out' (admin to user).
export const supportMessages = table('support_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userTgId: integer('user_tg_id').notNull(),
  direction: text('direction').notNull(),
  text: text('text').notNull(),
  adminMsgId: integer('admin_msg_id'),
  createdAt: ts('created_at'),
}, (t) => ({
  idxAdminMsg: index('idx_support_admin_msg').on(t.adminMsgId),
}));
