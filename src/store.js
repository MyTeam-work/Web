// Tiny external store (no extra npm package): cart, favorites, currency, home data, toast.
// Also hosts shared Telegram helpers (haptic, copy, MainButton) and ROUTES.
// Ids (product / category) are treated as opaque values (number or string).

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { getHome } from './api.js';
import { CURRENCIES, isCurrencyCode } from './lib/fa.js';

const KEYS = {
  cart: 'shop.cart.v1',
  favorites: 'shop.favorites.v1',
  currency: 'shop.currency.v1',
};
const MAX_CART_LINES = 30;
const MAX_QTY = 20;
const MAX_FAVORITES = 50;

// ---------- persistence ----------
function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked; state still works in memory */
  }
}

const isId = (v) => (typeof v === 'string' && v !== '') || (typeof v === 'number' && Number.isFinite(v));
const sameId = (a, b) => String(a) === String(b);
const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n)) || 1));
const cleanText = (v) => {
  const t = v && typeof v === 'object' ? v.name : v;
  return typeof t === 'string' && t.trim() ? t.trim() : null;
};
const lineKey = (productId, size, color) => `${productId}|${size ?? ''}|${color ?? ''}`;

function loadCart() {
  const raw = readJSON(KEYS.cart, []);
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const l of raw) {
    if (!l || !isId(l.productId)) continue;
    const size = cleanText(l.size);
    const color = cleanText(l.color);
    const key = lineKey(l.productId, size, color);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, productId: l.productId, qty: clampQty(l.qty), size, color });
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

function loadFavorites() {
  const raw = readJSON(KEYS.favorites, []);
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const id of raw) {
    if (isId(id) && !out.some((x) => sameId(x, id))) out.push(id);
  }
  return out.slice(0, MAX_FAVORITES);
}

function loadCurrencyChoice() {
  const raw = readJSON(KEYS.currency, null);
  return isCurrencyCode(raw) ? raw : null;
}

// ---------- core store ----------
let state = {
  cart: loadCart(),
  favorites: loadFavorites(),
  currencyChoice: loadCurrencyChoice(),
  home: { status: 'idle', data: null, error: null },
  toast: null,
};
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- cart ----------
function commitCart(cart) {
  writeJSON(KEYS.cart, cart);
  setState({ cart });
}

/** addToCart({ productId, qty = 1, size = null, color = null }) -> { ok, reason? } (reason: INVALID | CART_FULL). */
export function addToCart({ productId, qty = 1, size = null, color = null }) {
  if (!isId(productId)) return { ok: false, reason: 'INVALID' };
  const s = cleanText(size);
  const c = cleanText(color);
  const key = lineKey(productId, s, c);
  const cart = state.cart;
  const index = cart.findIndex((l) => l.key === key);
  let next;
  if (index >= 0) {
    next = cart.map((l, i) => (i === index ? { ...l, qty: clampQty(l.qty + clampQty(qty)) } : l));
  } else {
    if (cart.length >= MAX_CART_LINES) return { ok: false, reason: 'CART_FULL' };
    next = [...cart, { key, productId, qty: clampQty(qty), size: s, color: c }];
  }
  commitCart(next);
  return { ok: true };
}

export function removeFromCart(key) {
  commitCart(state.cart.filter((l) => l.key !== key));
}

/** qty < 1 removes the line. */
export function setCartQty(key, qty) {
  if (!(Number(qty) >= 1)) {
    removeFromCart(key);
    return;
  }
  commitCart(state.cart.map((l) => (l.key === key ? { ...l, qty: clampQty(qty) } : l)));
}

export function clearCart() {
  commitCart([]);
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, () => state.cart);
  return useMemo(
    () => ({
      items, // [{ key, productId, qty, size, color }]
      lines: items.length,
      count: items.reduce((sum, l) => sum + l.qty, 0),
      add: addToCart,
      remove: removeFromCart,
      setQty: setCartQty,
      clear: clearCart,
    }),
    [items],
  );
}

// ---------- favorites ----------
export function isFavorite(id) {
  return state.favorites.some((x) => sameId(x, id));
}

/** Returns true when the product is now a favorite. Newest first, max 50. */
export function toggleFavorite(id) {
  if (!isId(id)) return false;
  const has = isFavorite(id);
  const favorites = has
    ? state.favorites.filter((x) => !sameId(x, id))
    : [id, ...state.favorites].slice(0, MAX_FAVORITES);
  writeJSON(KEYS.favorites, favorites);
  setState({ favorites });
  return !has;
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, () => state.favorites);
  return useMemo(
    () => ({
      ids,
      count: ids.length,
      has: (id) => ids.some((x) => sameId(x, id)),
      toggle: toggleFavorite,
    }),
    [ids],
  );
}

// ---------- home data (shared by Header, Home, App) ----------
let homePromise = null;

/** Loads getHome once (or again with { force: true }). Never rejects; errors land in state.home.error. */
export function loadHome({ force = false } = {}) {
  if (homePromise) return homePromise;
  if (!force && state.home.status === 'ready') return Promise.resolve(state.home.data);
  setState({ home: { status: state.home.data ? 'ready' : 'loading', data: state.home.data, error: null } });
  homePromise = getHome()
    .then((data) => {
      setState({ home: { status: 'ready', data, error: null } });
      return data;
    })
    .catch((error) => {
      setState({ home: { status: state.home.data ? 'ready' : 'error', data: state.home.data, error } });
      return null;
    })
    .finally(() => {
      homePromise = null;
    });
  return homePromise;
}

export function useHome() {
  const home = useSyncExternalStore(subscribe, () => state.home);
  useEffect(() => {
    if (home.status === 'idle') loadHome();
  }, [home.status]);
  const reload = useCallback(() => loadHome({ force: true }), []);
  return useMemo(
    () => ({
      data: home.data,
      status: home.status, // 'idle' | 'loading' | 'ready' | 'error'
      loading: home.status === 'idle' || home.status === 'loading',
      error: home.error, // ApiError | null
      reload,
      shopName: (home.data && home.data.shopName) || '',
      isAdmin: Boolean(home.data && home.data.isAdmin === true),
      categories: (home.data && home.data.categories) || [],
    }),
    [home, reload],
  );
}

// ---------- currency ----------
function computeCurrency(choice, home) {
  const cfg = home.data && home.data.currency;
  const canUseAfn = Boolean(cfg && typeof cfg.tomanPerAfn === 'number' && cfg.tomanPerAfn > 0);
  let code = choice ?? (cfg && cfg.default) ?? 'IRT';
  if (!isCurrencyCode(code)) code = 'IRT';
  if (code === 'AFN' && home.status === 'ready' && !canUseAfn) code = 'IRT';
  return { currency: code, canUseAfn };
}

/** Effective currency right now ('IRT' | 'AFN'), usable outside React. */
export function getCurrency() {
  return computeCurrency(state.currencyChoice, state.home).currency;
}

export function setCurrency(code) {
  if (!isCurrencyCode(code)) return;
  writeJSON(KEYS.currency, code);
  setState({ currencyChoice: code });
}

export function toggleCurrency() {
  const { canUseAfn } = computeCurrency(state.currencyChoice, state.home);
  if (!canUseAfn) return;
  setCurrency(getCurrency() === 'IRT' ? 'AFN' : 'IRT');
}

export function useCurrency() {
  const choice = useSyncExternalStore(subscribe, () => state.currencyChoice);
  const home = useSyncExternalStore(subscribe, () => state.home);
  return useMemo(() => {
    const { currency, canUseAfn } = computeCurrency(choice, home);
    return {
      currency, // 'IRT' | 'AFN'
      label: CURRENCIES[currency].label, // 'تومان' | 'افغانی'
      canUseAfn, // false when the admin has not set the rate
      set: setCurrency,
      toggle: toggleCurrency,
    };
  }, [choice, home]);
}

// ---------- toast ----------
let toastTimer = null;

export function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  setState({ toast: { id: Date.now(), message } });
  toastTimer = setTimeout(() => setState({ toast: null }), 2600);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => state.toast);
}

// ---------- Telegram helpers ----------
export const tg = () => (typeof window !== 'undefined' && window.Telegram ? window.Telegram.WebApp : undefined);

/** haptic('light'|'medium'|'heavy'|'soft'|'rigid') or haptic('success'|'warning'|'error'). */
export function haptic(kind = 'light') {
  try {
    const h = tg() && tg().HapticFeedback;
    if (!h) return;
    if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch {
    /* ignore */
  }
}

export function openTelegramLink(url) {
  const app = tg();
  if (app && typeof app.openTelegramLink === 'function') app.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

/** Copies text and shows a toast. Resolves true on success. */
export async function copyText(text, message = 'کپی شد') {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(text));
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = String(text);
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch {
      ok = false;
    }
  }
  showToast(ok ? message : 'کپی انجام نشد');
  return ok;
}

/**
 * Shows Telegram's MainButton while the component is mounted.
 * useMainButton({ text: 'ثبت سفارش', onClick, visible, loading, disabled })
 */
export function useMainButton({ text, onClick, visible = true, loading = false, disabled = false } = {}) {
  const handlerRef = useRef(onClick);
  useEffect(() => {
    handlerRef.current = onClick;
  });

  useEffect(() => {
    const app = tg();
    const button = app && app.MainButton;
    if (!button || !visible || !text) return undefined;
    const handler = () => handlerRef.current && handlerRef.current();
    try {
      button.setParams({
        text,
        color: '#0B1F4B',
        text_color: '#FFFFFF',
        is_active: !disabled && !loading,
        is_visible: true,
      });
      if (loading) button.showProgress(false);
      else button.hideProgress();
      button.onClick(handler);
    } catch {
      return undefined;
    }
    return () => {
      try {
        button.offClick(handler);
        button.hideProgress();
        button.hide();
      } catch {
        /* ignore */
      }
    };
  }, [text, visible, disabled, loading]);
}

// ---------- routes ----------
export const ROUTES = {
  home: '/',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  support: '/support',
  product: (id) => `/product/${encodeURIComponent(id)}`,
  /** Home with filters: ROUTES.catalog({ cat, sort: 'new', sale: true, q, fav: true }). */
  catalog: ({ cat, sort, sale, q, fav } = {}) => {
    const params = new URLSearchParams();
    if (cat !== undefined && cat !== null && cat !== '') params.set('cat', String(cat));
    if (sort) params.set('sort', sort);
    if (sale) params.set('sale', '1');
    if (q) params.set('q', q);
    if (fav) params.set('fav', '1');
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  },
  admin: '/admin',
  adminProducts: '/admin/products',
  adminProductNew: '/admin/products/new',
  adminProduct: (id) => `/admin/products/${encodeURIComponent(id)}`,
  adminOrders: '/admin/orders',
  adminOrder: (id) => `/admin/orders/${encodeURIComponent(id)}`,
  adminSettings: '/admin/settings',
};
