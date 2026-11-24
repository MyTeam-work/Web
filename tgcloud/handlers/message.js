/**
 * @file tgcloud/handlers/message.js
 * @version 1.0.0
 * @updated 2026-11-08
 * Single entry for private text/photo/forward messages.
 */
import { upsertUser } from '../lib/db.js';
import { isAdminId } from '../lib/auth.js';
import { getSetting, setSetting } from '../lib/settings.js';
import { getOrderByCode, submitReceipt } from '../lib/orders.js';
import { runCommand, ORDER_CODE_RE } from '../lib/commands.js';
import {
  relayUserMessage, relayAdminReply, sendHtml,
} from '../lib/support.js';
import { t } from '../lib/i18n.js';
import { notifyAdminReceipt } from '../lib/notify.js';

const PENDING_KEY = { storage: 'storage_chat_id', shop: 'shop_chat_id' };
const PENDING_OK = { storage: 'storageSaved', shop: 'shopSaved' };

// Returns true when the message was consumed.
async function handlePending(message) {
  const origin = message.forward_origin;
  if (!origin) return false;
  const p = await getSetting('pending_action');
  if (!p || !PENDING_KEY[p.type]) return false;
  if (String(p.adminId) !== String(message.from.id)) return false;
  const chatId = origin.type === 'channel' && origin.chat
    ? origin.chat.id : null;
  if (chatId === null) {
    await sendHtml(message.chat.id, t('pendingBad'));
    return true;
  }
  await setSetting(PENDING_KEY[p.type], chatId);
  await setSetting('pending_action', null);
  await sendHtml(message.chat.id, t(PENDING_OK[p.type]));
  return true;
}

function largestFileId(photos) {
  let best = photos[0];
  for (const p of photos) {
    if ((p.file_size || 0) >= (best.file_size || 0)) best = p;
  }
  return best.file_id;
}

async function handleReceiptPhoto(message) {
  const chatId = message.chat.id;
  const m = ORDER_CODE_RE.exec(message.caption || '');
  if (!m) return sendHtml(chatId, t('photoNeedsCode'));
  const order = await getOrderByCode(m[0]);
  if (!order || String(order.userTgId) !== String(message.from.id)) {
    return sendHtml(chatId, t('orderNotFound'));
  }
  if (!['awaiting_receipt', 'rejected'].includes(order.status)) {
    return sendHtml(chatId, t('receiptBadStatus'));
  }
  try {
    await submitReceipt(order.id, largestFileId(message.photo));
    await notifyAdminReceipt(order.id);
  } catch (err) {
    console.error('receipt failed:', err && err.message);
    return sendHtml(chatId, t('receiptFail'));
  }
  await sendHtml(chatId, t('receiptOk', { code: m[0] }));
}

async function handleSupportText(message) {
  const res = await relayUserMessage({
    tgUser: message.from, text: message.text,
  });
  const key = res.ok ? 'supportSent'
    : res.reason === 'rate' ? 'supportWait' : 'supportFail';
  await sendHtml(message.chat.id, t(key));
}

export default async function (message, ctx) {
  if (!message || !message.chat || message.chat.type !== 'private') {
    return;
  }
  const from = message.from;
  if (!from || from.is_bot) return;
  await upsertUser(from, { fromBot: true });
  const admin = await isAdminId(from.id);
  const text = message.text;

  if (admin && (await handlePending(message))) return;
  if (typeof text === 'string' && text.startsWith('/')) {
    await runCommand(message, admin);
    return;
  }
  if (admin) {
    if (message.reply_to_message) await relayAdminReply(message);
    return;
  }
  if (Array.isArray(message.photo) && message.photo.length) {
    await handleReceiptPhoto(message);
    return;
  }
  if (typeof text === 'string' && text) await handleSupportText(message);
}
