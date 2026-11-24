import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { settings } from '../schema.js';

export const CURRENCIES = ['IRT', 'AFN'];

// Values used when a key has not been saved yet.
export const DEFAULTS = {
  admin_tg_id: 7566522940,
  shop_name: '',
  support_text: '',
  shipping_fee: 0, // Toman
  default_currency: 'IRT',
  toman_per_afn: null, // how many Toman equal 1 Afghani; AFN prices are hidden until set
  webapp_url: null, // https URL of the Mini App (set with /seturl or in the admin settings)
  pay_irt: null, // { number, holder, bank? }
  pay_afn: null, // { number, holder, bank?, note? }
  slides: [], // max 10
  promos: [], // max 2
  hero_stats: null, // [{ value, label }], max 6
  storage_chat_id: null,
  shop_chat_id: null,
  pending_action: null,
};

// Keys the admin may read and write from the Mini App (adminGetSettings / adminSaveSettings).
export const EDITABLE_KEYS = [
  'shop_name',
  'support_text',
  'shipping_fee',
  'default_currency',
  'toman_per_afn',
  'webapp_url',
  'pay_irt',
  'pay_afn',
  'slides',
  'promos',
  'hero_stats',
];

export async function getSetting(key) {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  if (row && row.value !== undefined && row.value !== null) return row.value;
  return Object.hasOwn(DEFAULTS, key) ? DEFAULTS[key] : null;
}

export async function getSettings() {
  const rows = await db.select().from(settings).all();
  const out = { ...DEFAULTS };
  for (const r of rows) {
    if (r.value !== undefined && r.value !== null) out[r.key] = r.value;
  }
  return out;
}

export async function setSetting(key, value) {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    .run();
  return value;
}

export async function getAdminId() {
  return Number(await getSetting('admin_tg_id'));
}

export function normalizeCurrency(value, fallback = 'IRT') {
  return CURRENCIES.includes(value) ? value : fallback;
}

// Toman per 1 Afghani, or null when the admin has not set it.
export async function getRate() {
  const rate = Number(await getSetting('toman_per_afn'));
  return rate > 0 ? rate : null;
}

// Money = { irt, afn }. afn is rounded UP to the nearest 10 and is null without a rate.
export function toMoney(irt, rate) {
  const n = Math.round(Number(irt) || 0);
  const r = Number(rate);
  const afn = r > 0 ? Math.ceil(n / r / 10) * 10 : null;
  return { irt: n, afn };
}

// Reads the rate once and returns a sync converter: const money = await getMoneyConverter(); money(price)
export async function getMoneyConverter() {
  const rate = await getRate();
  return (irt) => toMoney(irt, rate);
}

// Where the customer must pay for the chosen currency.
export async function getPayInfo(currency) {
  return getSetting(currency === 'AFN' ? 'pay_afn' : 'pay_irt');
}
