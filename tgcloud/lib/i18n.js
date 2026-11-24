/**
 * @file tgcloud/lib/i18n.js
 * @version 1.0.0
 * @updated 2026-11-08
 * All Persian strings + t(key, vars) + escapeHtml.
 */

export function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Static strings are trusted HTML. Vars are escaped
// unless the var name ends with "Html".
export const STR = {
  welcome:
    'سلام {name} 👋\nبه فروشگاه مد ما خوش آمدید.',
  btnShop: 'ورود به فروشگاه',
  noWebapp:
    'فروشگاه هنوز آماده نشده است. لطفاً کمی بعد ' +
    'دوباره سر بزنید.',
  adminNoUrl:
    'آدرس مینی‌اپ تنظیم نشده است. با دستور ' +
    '/seturl &lt;آدرس https&gt; آن را ثبت کنید.',
  help:
    'راهنما:\nبرای خرید روی «ورود به فروشگاه» بزنید.\n' +
    'برای پشتیبانی کافی است پیام خود را همین‌جا ' +
    'بنویسید.',
  helpAdmin:
    '\n\nدستورات مدیر:\n' +
    '/setcard irt|afn شماره|نام صاحب کارت|بانک\n' +
    '/setrate &lt;عدد&gt;\n/seturl &lt;آدرس https&gt;\n' +
    '/setstorage\n/setshop',
  orderNotFound: 'سفارشی با این کد پیدا نشد.',
  orderStatus:
    'سفارش {code}\nوضعیت: {status}',
  supportSent:
    'پیام شما برای پشتیبانی ارسال شد. ' +
    'به‌زودی پاسخ می‌دهیم.',
  supportWait:
    'تعداد پیام‌های شما زیاد بوده است. ' +
    'لطفاً کمی صبر کنید و دوباره تلاش کنید.',
  supportFail:
    'ارسال پیام انجام نشد. لطفاً بعداً تلاش کنید.',
  supportHeader:
    '📩 پیام پشتیبانی\nنام: {name}\n' +
    'یوزرنیم: {username}\nآیدی: {id}',
  supportReply: '💬 پاسخ پشتیبانی:\n\n{text}',
  replyFailed:
    'پاسخ به کاربر ارسال نشد (شاید ربات را ' +
    'مسدود کرده است).',
  cardUsage:
    'فرمت: /setcard irt|afn شماره|نام صاحب کارت|بانک',
  cardSaved: 'اطلاعات پرداخت {cur} ذخیره شد.',
  rateUsage: 'فرمت: /setrate &lt;عدد مثبت&gt;',
  rateSaved: 'نرخ تومان به ازای هر افغانی: {rate}',
  urlUsage: 'فرمت: /seturl &lt;آدرس https&gt;',
  urlSaved: 'آدرس مینی‌اپ ذخیره شد.',
  pendingStorage:
    'یک پیام از کانال ذخیره‌سازی را همین‌جا ' +
    'فوروارد کنید.',
  pendingShop:
    'یک پیام از کانال فروشگاه را همین‌جا ' +
    'فوروارد کنید.',
  pendingBad:
    'این پیام از یک کانال فوروارد نشده است. ' +
    'دوباره تلاش کنید.',
  storageSaved: 'کانال ذخیره‌سازی ثبت شد.',
  shopSaved: 'کانال فروشگاه ثبت شد.',
  photoNeedsCode:
    'برای ارسال رسید، کد سفارش (مثل ' +
    'MS-123456-1234) را در توضیح عکس بنویسید.',
  receiptOk:
    'رسید سفارش {code} دریافت شد. ' +
    'پس از بررسی به شما اطلاع می‌دهیم.',
  receiptBadStatus:
    'برای این سفارش در حال حاضر رسیدی ' +
    'پذیرفته نمی‌شود.',
  receiptFail:
    'ثبت رسید انجام نشد. لطفاً بعداً تلاش کنید.',
};

export function t(key, vars = {}) {
  const tpl = STR[key];
  if (tpl === undefined) return key;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in vars)) return '';
    const val = vars[k];
    return k.endsWith('Html') ? String(val) : escapeHtml(val);
  });
}
