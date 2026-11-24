import { EndpointError } from 'sdk';
import { requireAdmin } from '../lib/auth.js';
import { EDITABLE_KEYS, CURRENCIES, setSetting } from '../lib/settings.js';

const bad = (field, message = 'Invalid value') => new EndpointError(message, { code: 'INVALID_INPUT', field });
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const FILE_ID = /^[A-Za-z0-9_-]{8,200}$/;

function text(v, field, max, { required = false } = {}) {
  const raw = v === null || v === undefined ? '' : v;
  if (typeof raw !== 'string') throw bad(field);
  const s = raw.trim();
  if ((required && !s) || s.length > max) throw bad(field);
  return s;
}

function intIn(v, field, min, max) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw bad(field);
  return v;
}

function httpsUrl(v, field, max) {
  const s = text(v, field, max);
  if (!s.startsWith('https://') || s.length < 12) throw bad(field);
  return s;
}

// Image = { full, thumb } (file_ids from the storage channel) or { url }.
function image(v, field) {
  if (v === null || v === undefined) return null;
  if (!isObj(v)) throw bad(field);
  if (typeof v.url === 'string' && v.url) return { url: httpsUrl(v.url, field, 500) };
  if (typeof v.full !== 'string' || typeof v.thumb !== 'string') throw bad(field);
  if (!FILE_ID.test(v.full) || !FILE_ID.test(v.thumb)) throw bad(field);
  return { full: v.full, thumb: v.thumb };
}

function link(v, field) {
  if (v === null || v === undefined) return null;
  if (!isObj(v)) throw bad(field);
  if (v.type === 'category' || v.type === 'product') {
    return { type: v.type, value: intIn(v.value, field, 1, 1000000000) };
  }
  if (v.type === 'url') return { type: 'url', value: httpsUrl(v.value, field, 500) };
  throw bad(field);
}

function list(v, field, max) {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v) || v.length > max) throw bad(field);
  return v;
}

function slides(v) {
  return list(v, 'slides', 10).map((s, i) => {
    const f = `slides[${i}]`;
    if (!isObj(s)) throw bad(f);
    const out = {
      image: image(s.image, `${f}.image`),
      eyebrow: text(s.eyebrow, `${f}.eyebrow`, 40),
      title: text(s.title, `${f}.title`, 80),
      subtitle: text(s.subtitle, `${f}.subtitle`, 160),
      buttonText: text(s.buttonText, `${f}.buttonText`, 30),
      link: link(s.link, `${f}.link`),
    };
    if (!out.image && !out.title) throw bad(f, 'A slide needs an image or a title');
    return out;
  });
}

function promos(v) {
  return list(v, 'promos', 2).map((p, i) => {
    const f = `promos[${i}]`;
    if (!isObj(p)) throw bad(f);
    if (p.theme !== 'dark' && p.theme !== 'light') throw bad(`${f}.theme`);
    const out = {
      theme: p.theme,
      image: image(p.image, `${f}.image`),
      eyebrow: text(p.eyebrow, `${f}.eyebrow`, 40),
      title: text(p.title, `${f}.title`, 80),
      text: text(p.text, `${f}.text`, 200),
      buttonText: text(p.buttonText, `${f}.buttonText`, 30),
      link: link(p.link, `${f}.link`),
    };
    if (!out.title) throw bad(`${f}.title`);
    return out;
  });
}

// [{ value, label }], up to 6; an empty list means "do not show".
function heroStats(v) {
  const rows = list(v, 'hero_stats', 6).map((r, i) => {
    if (!isObj(r)) throw bad(`hero_stats[${i}]`);
    return {
      value: text(r.value, `hero_stats[${i}].value`, 20, { required: true }),
      label: text(r.label, `hero_stats[${i}].label`, 40, { required: true }),
    };
  });
  return rows.length ? rows : null;
}

function pay(v, field, withNote) {
  if (v === null || v === undefined) return null;
  if (!isObj(v)) throw bad(field);
  const number = text(v.number, `${field}.number`, 64);
  if (!number) return null;
  const out = {
    number,
    holder: text(v.holder, `${field}.holder`, 80),
    bank: text(v.bank, `${field}.bank`, 60),
  };
  if (withNote) out.note = text(v.note, `${field}.note`, 200);
  return out;
}

function rate(v) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 1000000) throw bad('toman_per_afn');
  return v;
}

function webappUrl(v) {
  if (v === null || v === undefined || v === '') return null;
  return httpsUrl(v, 'webapp_url', 300);
}

const VALIDATORS = {
  shop_name: (v) => text(v, 'shop_name', 60),
  support_text: (v) => text(v, 'support_text', 500),
  shipping_fee: (v) => intIn(v, 'shipping_fee', 0, 1000000000),
  default_currency: (v) => {
    if (!CURRENCIES.includes(v)) throw bad('default_currency');
    return v;
  },
  toman_per_afn: rate,
  webapp_url: webappUrl,
  pay_irt: (v) => pay(v, 'pay_irt', false),
  pay_afn: (v) => pay(v, 'pay_afn', true),
  slides,
  promos,
  hero_stats: heroStats,
};

// Saves only the keys that are present in the input (a partial update is fine).
export default async function (input, ctx) {
  await requireAdmin(ctx);
  if (!isObj(input)) throw bad('input');
  const keys = Object.keys(input);
  if (keys.length === 0) throw bad('input', 'Nothing to save');

  const clean = {};
  for (const key of keys) {
    if (!EDITABLE_KEYS.includes(key) || !Object.hasOwn(VALIDATORS, key)) throw bad(key, 'Unknown setting');
    clean[key] = VALIDATORS[key](input[key]);
  }
  // Everything validated first, so a bad field never leaves a half-saved state.
  for (const key of Object.keys(clean)) await setSetting(key, clean[key]);
  return { ok: true, saved: Object.keys(clean) };
}
