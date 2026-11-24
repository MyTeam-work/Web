// lib/notify.js — admin/user notifications. All functions are async, never throw,
// log a short message without personal data and return false on failure.
import { api } from 'sdk';
import { getOrder, getOrderWithItems } from './orders.js';
import { getAdminId, getSetting } from './settings.js';
import { sendHtml } from './support.js';
import { escapeHtml } from './i18n.js';
import { formatOrderHtml, formatOrderCaption, statusText } from './format.js';
import { adminOrderKeyboard, shopKeyboard } from './keyboards.js';

// Own Persian strings.
const FA = {
  newOrder: 'سفارش جدید',
  receiptReceived: 'رسید پرداخت دریافت شد (نمایش تصویر ممکن نشد)',
  userTitle: 'به‌روزرسانی سفارش',
  code: 'کد سفارش',
  newStatus: 'وضعیت جدید',
  rejectedInfo: 'رسید شما رد شد. لطفاً رسید صحیح را دوباره ارسال کنید.',
  adminNote: 'توضیح پشتیبانی',
};

function logFail(where, err) {
  const name = (err && err.name) || 'Error';
  const code = err && err.code !== undefined ? ` ${err.code}` : '';
  console.error(`notify.${where} failed: ${name}${code}`);
}

function withMarkup(markup) {
  return markup ? { reply_markup: markup } : {};
}

// New order -> text message to the admin with action buttons.
export async function notifyAdminNewOrder(orderId) {
  try {
    const data = await getOrderWithItems(orderId);
    if (!data) {
      console.error('notify.newOrder: order not found');
      return false;
    }
    const { order, items } = data;
    const adminId = await getAdminId();
    const text = `<b>${FA.newOrder}</b>\n\n${formatOrderHtml(order, items)}`;
    const sent = await sendHtml(adminId, text, withMarkup(adminOrderKeyboard(order)));
    return Boolean(sent);
  } catch (err) {
    logFail('newOrder', err);
    return false;
  }
}

// Receipt uploaded -> photo (file_id reuse) with caption and buttons; text fallback.
export async function notifyAdminReceipt(orderId) {
  try {
    const data = await getOrderWithItems(orderId);
    if (!data) {
      console.error('notify.receipt: order not found');
      return false;
    }
    const { order, items } = data;
    const adminId = await getAdminId();
    const extra = withMarkup(adminOrderKeyboard(order));

    if (order.receiptFileId) {
      try {
        const sent = await api.sendPhoto({
          chat_id: adminId,
          photo: order.receiptFileId,
          caption: formatOrderCaption(order, items),
          parse_mode: 'HTML',
          ...extra,
        });
        if (sent) return true;
      } catch (err) {
        logFail('receiptPhoto', err);
      }
    }

    const text = `<b>${FA.receiptReceived}</b>\n\n${formatOrderHtml(order, items)}`;
    const sent = await sendHtml(adminId, text, extra);
    return Boolean(sent);
  } catch (err) {
    logFail('receipt', err);
    return false;
  }
}

// Status changed -> Persian message to the customer.
export async function notifyUserStatus(orderId, { note } = {}) {
  try {
    const order = await getOrder(orderId);
    if (!order || !order.userTgId) {
      console.error('notify.user: order or user missing');
      return false;
    }
    const lines = [
      `📦 <b>${FA.userTitle}</b>`,
      `${FA.code}: <code>${escapeHtml(order.code)}</code>`,
      `${FA.newStatus}: <b>${statusText(order.status)}</b>`,
    ];
    if (order.status === 'rejected') {
      lines.push('', FA.rejectedInfo);
    }
    const rawNote = note || (order.status === 'rejected' ? order.adminNote : '');
    const cleanNote = rawNote ? String(rawNote).trim().slice(0, 500) : '';
    if (cleanNote) {
      lines.push('', `${FA.adminNote}: ${escapeHtml(cleanNote)}`);
    }

    let markup = null;
    try {
      markup = shopKeyboard(await getSetting('webapp_url'));
    } catch (err) {
      logFail('webappUrl', err);
    }
    const sent = await sendHtml(order.userTgId, lines.join('\n'), withMarkup(markup));
    return Boolean(sent);
  } catch (err) {
    logFail('user', err);
    return false;
  }
}
