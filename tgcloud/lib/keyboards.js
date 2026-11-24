// lib/keyboards.js — inline keyboards and callback_data helpers.
// callback_data format: 'ord:<a|r|p|s|c>:<orderId>' (always far below 64 bytes).

const ACTION_TO_CODE = {
  approve: 'a',
  reject: 'r',
  processing: 'p',
  shipped: 's',
  cancel: 'c',
};

const CODE_TO_ACTION = {
  a: 'approve',
  r: 'reject',
  p: 'processing',
  s: 'shipped',
  c: 'cancel',
};

// Own Persian button labels.
const BTN = {
  approve: '✅ تأیید پرداخت',
  reject: '❌ رد رسید',
  processing: '⚙️ در حال پردازش',
  shipped: '🚚 ارسال شد',
  cancel: '🚫 لغو',
  shop: 'ورود به فروشگاه',
};

export function orderCallback(action, orderId) {
  const code = ACTION_TO_CODE[action];
  if (!code) throw new Error('Unknown order action');
  return `ord:${code}:${orderId}`;
}

// 'ord:a:12' -> { action: 'approve', orderId: 12 }; anything else -> null.
export function parseOrderCallback(data) {
  if (typeof data !== 'string' || data.length > 64) return null;
  const m = /^ord:([arpsc]):(\d{1,12})$/.exec(data);
  if (!m) return null;
  const orderId = Number(m[2]);
  if (!Number.isSafeInteger(orderId) || orderId < 1) return null;
  return { action: CODE_TO_ACTION[m[1]], orderId };
}

function button(action, orderId) {
  return { text: BTN[action], callback_data: orderCallback(action, orderId) };
}

// Returns a reply_markup object ({ inline_keyboard }) or null when no buttons apply.
export function adminOrderKeyboard(order) {
  if (!order || !order.id) return null;
  const id = order.id;
  let rows = null;
  switch (order.status) {
    case 'receipt_review':
      rows = [[button('approve', id), button('reject', id)], [button('cancel', id)]];
      break;
    case 'paid':
      rows = [[button('processing', id)], [button('cancel', id)]];
      break;
    case 'processing':
      rows = [[button('shipped', id)], [button('cancel', id)]];
      break;
    case 'awaiting_receipt':
    case 'rejected':
      rows = [[button('cancel', id)]];
      break;
    default:
      rows = null; // shipped, cancelled, unknown
  }
  return rows ? { inline_keyboard: rows } : null;
}

// Web-app button that opens the shop, or null when the URL is unset/invalid.
export function shopKeyboard(url) {
  if (typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean.startsWith('https://')) return null;
  return { inline_keyboard: [[{ text: BTN.shop, web_app: { url: clean } }]] };
}
