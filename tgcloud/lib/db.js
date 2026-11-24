import { db } from 'sdk';
import { eq, and, sql } from 'sdk/db';
import { users, categories, settings, products, supportMessages } from '../schema.js';
import { DEFAULTS } from './settings.js';

// Timestamp columns may come back as Date or as unix seconds: always normalise.
export function toUnix(value) {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : Number(value) * (Number(value) > 1e11 ? 1 : 1000);
  return Math.floor(ms / 1000);
}

let seeded = false;

// Safe to call on every request: seeds categories and the admin id once.
export async function ensureSeed() {
  if (seeded) return;
  const existing = await db.$count(categories);
  if (existing === 0) {
    await db
      .insert(categories)
      .values([
        { slug: 'women', nameFa: 'زنانه', sortOrder: 1 },
        { slug: 'men', nameFa: 'مردانه', sortOrder: 2 },
        { slug: 'accessories', nameFa: 'اکسسوری', sortOrder: 3 },
      ])
      .run();
  }
  await db
    .insert(settings)
    .values({ key: 'admin_tg_id', value: DEFAULTS.admin_tg_id, updatedAt: new Date() })
    .onConflictDoNothing()
    .run();
  seeded = true;
}

// ---------- users ----------

export async function getUserByTgId(tgId) {
  return db.select().from(users).where(eq(users.tgId, tgId)).get();
}

// tg is a Telegram user object (snake_case). fromBot=true means the user just wrote to the bot, so clear isBlocked.
export async function upsertUser(tg, { fromBot = false } = {}) {
  const base = {
    firstName: tg.first_name ?? null,
    lastName: tg.last_name ?? null,
    username: tg.username ?? null,
    languageCode: tg.language_code ?? null,
    lastSeenAt: new Date(),
  };
  const set = fromBot ? { ...base, isBlocked: false } : base;
  await db
    .insert(users)
    .values({ tgId: tg.id, ...base })
    .onConflictDoUpdate({ target: users.tgId, set })
    .run();
  return getUserByTgId(tg.id);
}

export async function setUserBlocked(tgId, isBlocked) {
  await db.update(users).set({ isBlocked: !!isBlocked }).where(eq(users.tgId, tgId)).run();
}

export async function setUserCurrency(tgId, currency) {
  await db.update(users).set({ currency }).where(eq(users.tgId, tgId)).run();
}

export async function setUserPhone(tgId, phone) {
  await db.update(users).set({ phone }).where(eq(users.tgId, tgId)).run();
}

// ---------- catalog ----------

export async function listCategories() {
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder).all();
}

export async function getProductById(id) {
  return db.select().from(products).where(eq(products.id, id)).get();
}

// ---------- support ----------

export async function addSupportMessage({ userTgId, direction, text, adminMsgId = null }) {
  await db.insert(supportMessages).values({ userTgId, direction, text, adminMsgId }).run();
}

// Find which user an admin reply belongs to (the admin replied to message adminMsgId).
export async function getSupportByAdminMsg(adminMsgId) {
  return db.select().from(supportMessages).where(eq(supportMessages.adminMsgId, adminMsgId)).get();
}

// Number of messages the user sent to support during the last hour (limit is 20).
export async function countRecentSupport(userTgId) {
  const since = Math.floor(Date.now() / 1000) - 3600;
  return db.$count(
    supportMessages,
    and(
      eq(supportMessages.userTgId, userTgId),
      eq(supportMessages.direction, 'in'),
      sql`${supportMessages.createdAt} > ${since}`,
    ),
  );
}
