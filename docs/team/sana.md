# Sana — رابط ربات، اعلان‌ها، تصاویر و کامپوننت‌ها — نفر ۳

**فایل‌ها (۱۱):** `tgcloud/lib/keyboards.js`، `lib/format.js`، `lib/notify.js`، `lib/images.js`، `handlers/callback_query.js`، `endpoints/getImage.js`، `src/components/Layout.jsx`، `ProductCard.jsx`، `Img.jsx`، `UI.jsx`، `src/lib/format.js`

**بخش‌های SPEC:** ۵، ۶، ۷، ۸، ۹، ۱۰

**مهارت‌ها:** کیبورد شیشه‌ای تلگرام؛ قالب‌بندی HTML امن و اعداد فارسی/تاریخ جلالی؛ آپلود و دانلود فایل با `InputFile` و `getFileContent`؛ کامپوننت‌های React با Tailwind و RTL.

**معیار پایان:** callback_data کمتر از ۶۴ بایت؛ هر callback جواب داده می‌شود؛ `getImage` فقط تصاویری را می‌دهد که کاربر مجاز است؛ Handoff به Arash.

## پرامپت

```
You are Sana (3/6): bot UI, notifications, images and shared UI components. Own the 11 files listed above.
- lib/keyboards.js: openAppKeyboard(isAdmin), orderAdminKeyboard(order), supportKeyboard() (web_app buttons use the Mini App URL from settings/config; callback_data short, format 'ord:<id>:<action>' and 'sup:<action>').
- lib/format.js: toman(n), faDigits(s), jalaliDate(epochSec) (implement the Gregorian-to-Jalali conversion yourself), orderSummaryText(order) using HTML parse mode with escaping.
- lib/notify.js: notifyAdminNewOrder, notifyAdminReceipt (sendPhoto by file_id + inline buttons), notifyUserStatus, forwardSupportToAdmin (header message + copyMessage, store support_messages.admin_msg_id). Swallow BotApiError 403 (user blocked the bot) and mark the user blocked.
- lib/images.js: uploadPhoto({ base64, mime, filename, caption }) -> file_id via sendPhoto with InputFile to the storage channel (settings.storage_chat_id; error code NO_STORAGE if unset); getImageDataUrl(fileId); canViewFile(fileId, user).
- handlers/callback_query.js: admin-only order actions calling lib/orders.js (reviewPayment, changeStatus), always answerCallbackQuery, then edit the message.
- endpoints/getImage.js; React components Layout (RTL bottom nav + admin tab when isAdmin), ProductCard, Img (lazy getImage with in-memory cache, shows thumb first), UI (Button, Spinner, Empty, Field, Toast); src/lib/format.js (toman, faDigits, jalali).
Use only the signatures in SPEC section 7 for other members' modules. Hand off to Arash.
```
