// Persian digits, number, price and date helpers.
// Money is NEVER converted on the client: the server sends Money = { irt, afn }
// and we only pick one side of it according to the selected currency.

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const THOUSANDS_SEPARATOR = '٬';

export const CURRENCIES = Object.freeze({
  IRT: Object.freeze({ code: 'IRT', key: 'irt', label: 'تومان' }),
  AFN: Object.freeze({ code: 'AFN', key: 'afn', label: 'افغانی' }),
});

export const CURRENCY_CODES = Object.freeze(['IRT', 'AFN']);

export function isCurrencyCode(value) {
  return value === 'IRT' || value === 'AFN';
}

export function currencyLabel(code) {
  return (CURRENCIES[code] ?? CURRENCIES.IRT).label;
}

/** '1250' -> '۱۲۵۰' (any value, non-digits are kept). */
export function toFaDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Persian / Arabic-Indic digits -> latin digits (for form inputs). */
export function toEnDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Parse user typed numbers such as '۱٬۲۵۰٬۰۰۰' or '1,250'. Returns NaN when invalid. */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = toEnDigits(value)
    .replace(/[٬,،\s]/g, '')
    .replace(/٫/g, '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

/** 1250000 -> '۱٬۲۵۰٬۰۰۰'. Returns '' for null / undefined / NaN. */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return sign + toFaDigits(grouped);
}

/** Pick the numeric amount of a Money object for a currency ('IRT' | 'AFN'). null when missing. */
export function moneyValue(money, currency) {
  if (!money || typeof money !== 'object') return null;
  const key = (CURRENCIES[currency] ?? CURRENCIES.IRT).key;
  const value = money[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** { amount: '۱٬۲۵۰٬۰۰۰', unit: 'تومان' } or null when this currency is not available. */
export function priceParts(money, currency) {
  const value = moneyValue(money, currency);
  if (value === null) return null;
  return { amount: formatNumber(value), unit: currencyLabel(currency) };
}

/** '۱٬۲۵۰٬۰۰۰ تومان' from Money. '' when unavailable. */
export function formatPrice(money, currency) {
  const parts = priceParts(money, currency);
  return parts ? `${parts.amount} ${parts.unit}` : '';
}

/** Same as formatPrice but for a plain number already in `currency` (e.g. placeOrder pay.amount). */
export function formatAmount(amount, currency) {
  const text = formatNumber(amount);
  return text ? `${text} ${currencyLabel(currency)}` : '';
}

/** Whole-number discount percent (0 when there is no discount). Both prices use the same currency. */
export function discountPercent(price, oldPrice, currency) {
  let cur = currency;
  let p = moneyValue(price, cur);
  let o = moneyValue(oldPrice, cur);
  if (p === null || o === null) {
    cur = 'IRT';
    p = moneyValue(price, cur);
    o = moneyValue(oldPrice, cur);
  }
  if (p === null || o === null || o <= 0 || o <= p) return 0;
  return Math.round(((o - p) / o) * 100);
}

/** 20 -> '٪۲۰' */
export function formatPercent(value) {
  return `٪${toFaDigits(Math.round(Number(value) || 0))}`;
}

/** Jalali date. Accepts unix seconds, milliseconds or an ISO string. */
export function formatDateFa(value, withTime = false) {
  if (value === null || value === undefined || value === '') return '';
  let ms;
  if (typeof value === 'number') {
    ms = value < 1e12 ? value * 1000 : value;
  } else {
    ms = Date.parse(value);
  }
  if (!Number.isFinite(ms)) return '';
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (withTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(new Date(ms));
  } catch {
    return '';
  }
}
