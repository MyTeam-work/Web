/**
 * @file tgcloud/lib/commands.js
 * @version 1.0.0
 * @updated 2026-11-08
 * parseCommand + command table + runCommand.
 */
import { t } from './i18n.js';
import { sendHtml } from './support.js';
import { getSetting, setSetting } from './settings.js';
import { getOrderByCode, STATUS_LABEL_FA } from './orders.js';
import { cleanText } from './ids.js';

export const BOT_USERNAME = 'MiniShop_Afbot';
export const ORDER_CODE_RE = /MS-\d{6}-\d{4}/;

export function parseCommand(text) {
  const m = /^\/([A-Za-z0-9_]+)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/
    .exec(String(text || '').trim());
  if (!m) return null;
  const target = m[2];
  if (target && target.toLowerCase() !== BOT_USERNAME.toLowerCase()) {
    return null;
  }
  return { name: m[1].toLowerCase(), args: (m[3] || '').trim() };
}

function faDigitsToEn(s) {
  return String(s)
    .replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x06f0)
    .replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x0660);
}

async function shopMarkup() {
  const url = await getSetting('webapp_url');
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return null;
  }
  return {
    inline_keyboard: [[{ text: t('btnShop'), web_app: { url } }]],
  };
}

async function sendOrderStatus(ctx, code, extra) {
  const order = await getOrderByCode(code);
  if (!order || String(order.userTgId) !== String(ctx.from.id)) {
    await sendHtml(ctx.chatId, t('orderNotFound'));
    return;
  }
  const status = STATUS_LABEL_FA[order.status] || order.status;
  await sendHtml(ctx.chatId, t('orderStatus', { code, status }), extra);
}

async function cmdStart(ctx) {
  const markup = await shopMarkup();
  const extra = markup ? { reply_markup: markup } : {};
  const m = /^order_(MS-\d{6}-\d{4})$/.exec(ctx.args);
  if (m) return sendOrderStatus(ctx, m[1], extra);
  let text = t('welcome', { name: ctx.from.first_name || '' });
  if (!markup && ctx.admin) text += '\n\n' + t('adminNoUrl');
  if (!markup && !ctx.admin) text += '\n\n' + t('noWebapp');
  await sendHtml(ctx.chatId, text, extra);
}

async function cmdHelp(ctx) {
  const markup = await shopMarkup();
  const extra = markup ? { reply_markup: markup } : {};
  const text = t('help') + (ctx.admin ? t('helpAdmin') : '');
  await sendHtml(ctx.chatId, text, extra);
}

async function cmdSetCard(ctx) {
  const m = /^(irt|afn)\s+([\s\S]+)$/i.exec(ctx.args);
  const parts = m ? m[2].split('|') : [];
  const [number, holder, bank] = parts.map((p) => cleanText(p, 64));
  if (!m || parts.length !== 3 || !number || !holder || !bank) {
    return sendHtml(ctx.chatId, t('cardUsage'));
  }
  const cur = m[1].toLowerCase();
  await setSetting('pay_' + cur, { number, holder, bank });
  await sendHtml(ctx.chatId, t('cardSaved', { cur: cur.toUpperCase() }));
}

async function cmdSetRate(ctx) {
  const n = Number(faDigitsToEn(ctx.args));
  if (!ctx.args || !Number.isFinite(n) || n <= 0) {
    return sendHtml(ctx.chatId, t('rateUsage'));
  }
  await setSetting('toman_per_afn', n);
  await sendHtml(ctx.chatId, t('rateSaved', { rate: n }));
}

async function cmdSetUrl(ctx) {
  const url = ctx.args;
  if (!/^https:\/\/\S+$/.test(url) || url.length > 300) {
    return sendHtml(ctx.chatId, t('urlUsage'));
  }
  await setSetting('webapp_url', url);
  await sendHtml(ctx.chatId, t('urlSaved'));
}

function pending(type, msgKey) {
  return async (ctx) => {
    await setSetting('pending_action', { type, adminId: ctx.from.id });
    await sendHtml(ctx.chatId, t(msgKey));
  };
}

// admin: true means ignored silently for non-admins.
export const COMMANDS = {
  start: { admin: false, run: cmdStart },
  help: { admin: false, run: cmdHelp },
  setcard: { admin: true, run: cmdSetCard },
  setrate: { admin: true, run: cmdSetRate },
  seturl: { admin: true, run: cmdSetUrl },
  setstorage: { admin: true, run: pending('storage', 'pendingStorage') },
  setshop: { admin: true, run: pending('shop', 'pendingShop') },
};

export async function runCommand(message, admin) {
  const cmd = parseCommand(message.text);
  if (!cmd) return;
  const def = COMMANDS[cmd.name];
  if (!def || (def.admin && !admin)) return;
  await def.run({
    message,
    from: message.from,
    chatId: message.chat.id,
    args: cmd.args,
    admin,
  });
}
