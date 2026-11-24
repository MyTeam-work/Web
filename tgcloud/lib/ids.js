// Small shared helpers: order codes and input cleaning.

const pad = (n) => String(n).padStart(2, '0');

// Example: MS-240615-4821
export function newOrderCode(now = new Date()) {
  const y = String(now.getUTCFullYear()).slice(2);
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `MS-${y}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${rand}`;
}

// Trim a string and cap its length; anything that is not a string becomes ''.
export function cleanText(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

// Integer within [min, max], otherwise the fallback.
export function toInt(value, min, max, fallback = null) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  if (n < min || n > max) return fallback;
  return n;
}
