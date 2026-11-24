// lib/format.js — Persian number/money/status formatting and order text builders.
// Every user-provided field is escaped with escapeHtml. Output is Telegram HTML.
import { escapeHtml } from './i18n.js';
import { STATUS_LABEL_FA } from './orders.js';

// Own Persian strings (do not edit Nima's i18n).
const FA = {
  order: 'سفارش',
  receiptOrder: 'رسید سفارش',
  status: 'وضعیت',
  name: 'نام',
  phone: 'تلفن',
  address: 'آدرس',
  note: 'توضیحات',
  items: 'اقلام',
  size: 'سایز',
  color: 'رنگ',
  shipping: 'هزینه ارسال',
  total: 'جمع کل',
  payable: 'مبلغ قابل پرداخت',
  moreItems: 'و {n} قلم دیگر',
  unitIrt: 'تومان',
  unitAfn: 'افغانی',
};

// Fallback labels in case STATUS_LABEL_FA lacks a key.
const STATUS_FALLBACK = {
  awaiting_receipt: 'در انتظار رسید',
  receipt_review: 'در حال بررسی پرداخت',
  paid: 'پرداخت تأیید شد',
  rejected: 'رسید رد شد',
  processing: 'در حال پردازش',
  shipped: 'ارسال شد',
  cancelled: 'لغو شد',
};

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

// Convert every ASCII digit to a Persian digit (no toLocaleString).
export function toFaDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

// 1250000 -> '۱٬۲۵۰٬۰۰۰ تومان'; null/NaN -> '-'.
export function formatMoney(amount, currency) {
  if (amount === null || amount === undefined || amount === '') return '-';
  const num = Number(amount);
  if (!Number.isFinite(num)) return '-';
  const rounded = Math.round(num);
  const sign = rounded < 0 ? '-' : '';
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fa = toFaDigits(grouped).replace(/,/g, '٬');
  const unit = currency === 'AFN' ? FA.unitAfn : FA.unitIrt;
  return `${sign}${fa} ${unit}`;
}

// Plain status label (safe for HTML and for callback answers).
export function statusText(status) {
  const label = (STATUS_LABEL_FA && STATUS_LABEL_FA[status]) || STATUS_FALLBACK[status];
  return label || escapeHtml(status === undefined || status === null ? '-' : String(status));
}

function clip(value, max) {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

// Clip first, then escape (never cut an HTML entity in half).
function field(value, max) {
  return escapeHtml(clip(value, max)) || '-';
}

function colorName(color) {
  if (color && typeof color === 'object') return color.name || '';
  return color || '';
}

function itemLine(item, maxName) {
  const parts = [`• ${field(item.nameFa, maxName)} × ${toFaDigits(item.qty ?? 1)}`];
  if (item.size) parts.push(`${FA.size} ${field(item.size, 20)}`);
  const color = colorName(item.color);
  if (color) parts.push(`${FA.color} ${field(color, 20)}`);
  return parts.join(' — ');
}

function build(order, items, o) {
  const list = Array.isArray(items) ? items : [];
  const lines = [];
  lines.push(`🧾 <b>${o.caption ? FA.receiptOrder : FA.order}</b> <code>${field(order.code, 40)}</code>`);
  lines.push(`📌 ${FA.status}: <b>${statusText(order.status)}</b>`);
  lines.push(`👤 ${FA.name}: ${field(order.customerName, o.name)}`);
  lines.push(`📞 ${FA.phone}: ${field(order.phone, o.phone)}`);
  lines.push(`📍 ${FA.address}: ${field(order.address, o.addr)}`);
  if (order.note) lines.push(`📝 ${FA.note}: ${field(order.note, o.note)}`);
  lines.push('');
  lines.push(`🛍 ${FA.items}:`);
  const shown = list.slice(0, o.maxItems);
  for (const item of shown) lines.push(itemLine(item, o.item));
  const rest = list.length - shown.length;
  if (rest > 0) lines.push(`… ${FA.moreItems.replace('{n}', toFaDigits(rest))}`);
  lines.push('');
  lines.push(`🚚 ${FA.shipping}: ${formatMoney(order.shippingIrt, 'IRT')}`);
  lines.push(`💰 ${FA.total}: ${formatMoney(order.totalIrt, 'IRT')}`);
  lines.push(`💳 ${FA.payable}: <b>${formatMoney(order.payAmount, order.currency)}</b>`);
  return lines.join('\n');
}

const HTML_PRESETS = [
  { maxItems: 15, name: 100, phone: 30, addr: 400, note: 300, item: 60 },
  { maxItems: 8, name: 60, phone: 30, addr: 200, note: 150, item: 40 },
  { maxItems: 3, name: 40, phone: 20, addr: 100, note: 60, item: 30 },
];

const CAPTION_PRESETS = [
  { caption: true, maxItems: 5, name: 40, phone: 20, addr: 120, note: 80, item: 30 },
  { caption: true, maxItems: 3, name: 30, phone: 20, addr: 60, note: 40, item: 24 },
  { caption: true, maxItems: 0, name: 24, phone: 20, addr: 40, note: 0, item: 20 },
];

function fit(order, items, presets, limit) {
  let text = '';
  for (const preset of presets) {
    text = build(order, items, preset);
    if (text.length < limit) return text;
  }
  return text;
}

// Full order text for a normal message (< 3800 chars).
export function formatOrderHtml(order, items) {
  return fit(order, items, HTML_PRESETS, 3800);
}

// Short variant for a photo caption (< 1000 chars).
export function formatOrderCaption(order, items) {
  return fit(order, items, CAPTION_PRESETS, 1000);
}
