// Promise wrapper around Telegram.WebApp.Serverless.call and typed endpoint helpers.
// Every helper rejects with ApiError (code, type, params, userMessage in Persian).

const ERROR_MESSAGES = {
  NO_TELEGRAM: 'این برنامه باید داخل تلگرام باز شود.',
  UNAUTHORIZED: 'نشست شما معتبر نیست. برنامه را دوباره از ربات باز کنید.',
  FORBIDDEN: 'شما به این بخش دسترسی ندارید.',
  NOT_FOUND: 'مورد درخواستی پیدا نشد.',
  INVALID_INPUT: 'اطلاعات واردشده درست نیست. لطفاً دوباره بررسی کنید.',
  EMPTY_CART: 'سبد خرید شما خالی است.',
  OUT_OF_STOCK: 'موجودی یکی از کالاها کافی نیست. سبد خرید را بررسی کنید.',
  BAD_STATE: 'این کار در وضعیت فعلی سفارش ممکن نیست.',
  TOO_LARGE: 'حجم فایل یا تصویر بیش از حد مجاز است.',
  RATE_LIMIT: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
  TIMEOUT: 'پاسخی از سرور دریافت نشد. اتصال اینترنت را بررسی کنید.',
  CURRENCY_UNAVAILABLE: 'نرخ افغانی هنوز تنظیم نشده است. لطفاً با تومان ادامه دهید.',
  PAYMENT_UNAVAILABLE: 'پرداخت با این واحد پول فعلاً ممکن نیست. واحد دیگری را انتخاب کنید یا با پشتیبانی تماس بگیرید.',
  TOO_MANY_PENDING: 'چند سفارش شما هنوز رسید پرداخت ندارد. ابتدا رسید آن‌ها را ارسال کنید، بعد سفارش تازه ثبت کنید.',
  STORAGE_NOT_SET: 'ذخیره‌سازی تصاویر هنوز راه‌اندازی نشده است. مدیر باید در چت ربات دستور setstorage را اجرا کند.',
  STORAGE_ERROR: 'ذخیره‌ی تصویر انجام نشد. کمی بعد دوباره تلاش کنید.',
  SUPPORT_UNAVAILABLE: 'پشتیبانی فعلاً در دسترس نیست. کمی بعد دوباره تلاش کنید.',
  INTERNAL: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
};

// INVALID_INPUT carries err.parameters.field; these give the user a specific message per field.
const FIELD_MESSAGES = {
  name: 'نام و نام خانوادگی را کامل وارد کنید (حداقل ۲ حرف).',
  phone: 'شماره تماس معتبر نیست. شماره باید بین ۸ تا ۱۵ رقم باشد.',
  address: 'آدرس باید حداقل ۱۰ و حداکثر ۵۰۰ کاراکتر باشد.',
  note: 'توضیحات سفارش معتبر نیست.',
  items: 'اطلاعات سبد خرید معتبر نیست. سبد را به‌روزرسانی کنید.',
  productId: 'اطلاعات سبد خرید معتبر نیست. سبد را به‌روزرسانی کنید.',
  qty: 'تعداد هر کالا باید بین ۱ تا ۲۰ باشد.',
  size: 'سایز انتخاب‌شده معتبر نیست.',
  color: 'رنگ انتخاب‌شده معتبر نیست.',
  currency: 'واحد پول انتخاب‌شده معتبر نیست.',
  text: 'متن پیام باید بین ۱ تا ۱۰۰۰ کاراکتر باشد.',
  image: 'تصویر معتبر نیست. یک عکس JPG، PNG یا WebP انتخاب کنید.',
  imageBase64: 'تصویر معتبر نیست. یک عکس JPG، PNG یا WebP انتخاب کنید.',
  mime: 'نوع فایل پشتیبانی نمی‌شود. یک عکس JPG، PNG یا WebP انتخاب کنید.',
  orderId: 'شناسه سفارش معتبر نیست.',
  id: 'شناسه معتبر نیست.',
  categoryId: 'دسته‌بندی را انتخاب کنید.',
  nameFa: 'نام محصول باید بین ۲ تا ۱۲۰ کاراکتر باشد.',
  description: 'توضیحات محصول حداکثر ۲۰۰۰ کاراکتر است.',
  price: 'قیمت باید عدد صحیح و حداقل ۱ تومان باشد.',
  oldPrice: 'قیمت قبلی معتبر نیست.',
  stock: 'موجودی باید عددی بین ۰ تا ۱۰۰۰۰۰ باشد.',
  sizes: 'فهرست سایزها معتبر نیست (حداکثر ۲۰ مورد).',
  colors: 'فهرست رنگ‌ها معتبر نیست (حداکثر ۲۰ مورد و نام‌ها یکتا باشند).',
  photos: 'عکس‌های محصول معتبر نیستند (حداکثر ۱۲ عکس).',
  q: 'عبارت جستجو معتبر نیست.',
};

const NOT_FOUND_PRODUCT = 'یکی از کالاهای سبد شما دیگر در فروشگاه موجود نیست.';

function messageFor(code, params) {
  if (code === 'INVALID_INPUT') {
    const field = params && params.field;
    if (typeof field === 'string' && Object.prototype.hasOwnProperty.call(FIELD_MESSAGES, field)) {
      return FIELD_MESSAGES[field];
    }
  }
  if (code === 'NOT_FOUND' && params && params.productId !== undefined) return NOT_FOUND_PRODUCT;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL;
}

export class ApiError extends Error {
  constructor({ type = 'CLIENT', code = 'INTERNAL', message = '', params = {} } = {}) {
    super(message || code);
    this.name = 'ApiError';
    this.type = type;
    this.code = code;
    this.params = params;
    this.userMessage = messageFor(code, params);
  }

  /** Field name for INVALID_INPUT (err.parameters.field), otherwise undefined. */
  get field() {
    return this.params?.field;
  }
}

/** Persian message safe to show to the user for any thrown value. */
export function errorMessage(err) {
  return err instanceof ApiError ? err.userMessage : ERROR_MESSAGES.INTERNAL;
}

function mapError(err) {
  if (err instanceof ApiError) return err;
  const type = typeof err === 'string' ? err : (err && err.type) || 'INTERNAL';
  const params = err && typeof err.parameters === 'object' && err.parameters ? err.parameters : {};
  const message = typeof err === 'string' ? err : (err && err.message) || '';
  if (type === 'ENDPOINT_ERROR') {
    const code = typeof params.code === 'string' && params.code ? params.code : 'INTERNAL';
    return new ApiError({ type, code, message, params });
  }
  const code = Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, type) ? type : 'INTERNAL';
  return new ApiError({ type, code, message, params });
}

const DEFAULT_TIMEOUT_MS = 45000;
const UPLOAD_TIMEOUT_MS = 90000;

/** call('getProduct', { id }) -> Promise<result>. */
export function call(name, input = {}, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const serverless = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.Serverless;
    if (!serverless || typeof serverless.call !== 'function') {
      reject(new ApiError({ code: 'NO_TELEGRAM' }));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new ApiError({ code: 'TIMEOUT' }));
    }, timeout);
    try {
      serverless.call(name, input, (err, res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) reject(mapError(err));
        else resolve(res);
      });
    } catch (e) {
      settled = true;
      clearTimeout(timer);
      reject(mapError(e));
    }
  });
}

// ---- customer endpoints ----
export const getHome = () => call('getHome', {});
export const listProducts = (input = {}) => call('listProducts', input);
export const getProduct = (id) => call('getProduct', { id });
export const placeOrder = (input) => call('placeOrder', input);
export const submitReceipt = ({ orderId, imageBase64, mime }) =>
  call('submitReceipt', { orderId, imageBase64, mime }, { timeout: UPLOAD_TIMEOUT_MS });
export const myOrders = (page = 1) => call('myOrders', { page });
export const sendSupport = (text) => call('sendSupport', { text });

/**
 * Resolves with the dataUrl string. If 'full' is TOO_LARGE it retries once with 'thumb'.
 * Other failures (NOT_FOUND, TOO_LARGE for thumb) reject: Img shows a placeholder.
 */
export async function getImage(fileId, size = 'thumb') {
  try {
    const res = await call('getImage', { fileId, size });
    return res.dataUrl;
  } catch (err) {
    if (err instanceof ApiError && err.code === 'TOO_LARGE' && size === 'full') {
      const res = await call('getImage', { fileId, size: 'thumb' });
      return res.dataUrl;
    }
    throw err;
  }
}

// ---- admin endpoints ----
export const adminStats = () => call('adminStats', {});
export const adminListProducts = (input = {}) => call('adminListProducts', input);
export const adminSaveProduct = (input) => call('adminSaveProduct', input);
export const adminDeleteProduct = (id) => call('adminDeleteProduct', { id });
export const adminUploadImage = ({ imageBase64, mime }) =>
  call('adminUploadImage', { imageBase64, mime }, { timeout: UPLOAD_TIMEOUT_MS });
export const adminListOrders = (input = {}) => call('adminListOrders', input);
export const adminReviewOrder = ({ orderId, action, note }) =>
  call('adminReviewOrder', { orderId, action, note });
export const adminGetSettings = () => call('adminGetSettings', {});
export const adminSaveSettings = (input) => call('adminSaveSettings', input);

// ---- client-side image shrinking (SPEC section 7) ----
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError({ code: 'INVALID_INPUT', params: { field: 'image' } }));
    };
    img.src = url;
  });
}

/**
 * Shrink a File/Blob with canvas (long side <= 1600, JPEG 0.7).
 * Returns { imageBase64, mime, previewUrl, width, height, bytes } ready for
 * submitReceipt / adminUploadImage. previewUrl is a data URL for <img>.
 */
export async function prepareImage(file, { maxSide = 1600, quality = 0.7 } = {}) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new ApiError({ code: 'INVALID_INPUT', params: { field: 'image' } });
  }
  const img = await loadImage(file);
  const longSide = Math.max(img.naturalWidth, img.naturalHeight) || 1;
  const scale = Math.min(1, maxSide / longSide);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const previewUrl = canvas.toDataURL('image/jpeg', quality);
  const imageBase64 = previewUrl.slice(previewUrl.indexOf(',') + 1);
  return {
    imageBase64,
    mime: 'image/jpeg',
    previewUrl,
    width,
    height,
    bytes: Math.floor((imageBase64.length * 3) / 4),
  };
}
