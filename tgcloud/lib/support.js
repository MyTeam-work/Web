/**
 * @file tgcloud/lib/support.js
 * @version 1.0.0
 * @updated 2026-11-08
 * Support relay + safe sendMessage. No bot-only state,
 * so endpoints/sendSupport.js can reuse it.
 */
import { api, BotApiError } from 'sdk';
import {
  addSupportMessage, getSupportByAdminMsg,
  countRecentSupport, setUserBlocked,
} from './db.js';
import { getAdminId } from './settings.js';
import { cleanText } from './ids.js';
import { escapeHtml, t } from './i18n.js';

const RECENT_LIMIT = 20;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Sends an HTML message. Returns the sent message, or
// null when the user blocked the bot (403).
// 429: waits retry_after once, then retries once.
export async function sendHtml(chatId, text, extra = {}) {
  const params = {
    chat_id: chatId, text, parse_mode: 'HTML', ...extra,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await api.sendMessage(params);
    } catch (err) {
      if (!(err instanceof BotApiError)) throw err;
      if (err.code === 403) {
        await setUserBlocked(chatId, true);
        return null;
      }
      if (err.code === 429 && attempt === 0) {
        const wait = err.parameters?.retry_after || 1;
        await sleep(wait * 1000);
        continue;
      }
      throw err;
    }
  }
  return null;
}

// Returns { ok: true } or { ok: false, reason }.
// reason: no_admin | empty | rate | send_failed
export async function relayUserMessage({ tgUser, text }) {
  const adminId = await getAdminId();
  if (!adminId) return { ok: false, reason: 'no_admin' };
  const body = cleanText(text, 3500);
  if (!body) return { ok: false, reason: 'empty' };
  const recent = await countRecentSupport(tgUser.id);
  if (recent >= RECENT_LIMIT) {
    return { ok: false, reason: 'rate' };
  }
  const name = [tgUser.first_name, tgUser.last_name]
    .filter(Boolean).join(' ') || '-';
  const header = t('supportHeader', {
    name,
    username: tgUser.username ? '@' + tgUser.username : '-',
    id: tgUser.id,
  });
  const sent = await sendHtml(
    adminId, header + '\n\n' + escapeHtml(body),
  );
  if (!sent) return { ok: false, reason: 'send_failed' };
  await addSupportMessage({
    userTgId: tgUser.id,
    direction: 'in',
    text: body,
    adminMsgId: sent.message_id,
  });
  return { ok: true };
}

// Handles an admin Reply to a relayed message.
// Returns true when the message was consumed.
export async function relayAdminReply(message) {
  const ref = message.reply_to_message;
  if (!ref || typeof message.text !== 'string') return false;
  const row = await getSupportByAdminMsg(ref.message_id);
  if (!row) return false;
  const text = cleanText(message.text, 3500);
  if (!text) return true;
  const sent = await sendHtml(
    row.userTgId, t('supportReply', { text }),
  );
  if (!sent) {
    await sendHtml(message.chat.id, t('replyFailed'));
    return true;
  }
  await addSupportMessage({
    userTgId: row.userTgId,
    direction: 'out',
    text,
    adminMsgId: message.message_id,
  });
  return true;
}
