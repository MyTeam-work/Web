# Arash — سفارش، پرداخت و API کلاینت — نفر ۴

**فایل‌ها (۱۰):** `tgcloud/lib/orders.js`، `endpoints/createOrder.js`، `uploadReceipt.js`، `getMyOrders.js`، `admin_listOrders.js`، `admin_getOrder.js`، `admin_reviewPayment.js`، `admin_setOrderStatus.js`، `src/lib/api.js`، `src/lib/imageTools.js`

**بخش‌های SPEC:** ۴، ۵، ۶، ۷، ۹، ۱۰

**مهارت‌ها:** ماشین وضعیت سفارش؛ کاهش موجودی اتمیک بدون تراکنش (UPDATE شرطی)؛ امنیت مالکیت سفارش؛ فشرده‌سازی تصویر سمت کلاینت (canvas)؛ لایه API با خطای دسته‌بندی‌شده.

**معیار پایان:** قیمت هرگز از کلاینت گرفته نمی‌شود؛ هر تغییر وضعیت یک اعلان به کاربر می‌رساند؛ `api.js` به ازای هر endpoint یک تابع دارد؛ Handoff به Mina.

## پرامپت

```
You are Arash (4/6): orders, payments and the client API layer. Own the 10 files listed above.
- lib/orders.js (shared by endpoints AND the bot's callback_query handler): createOrderFromCart(user, input) (load products from DB, price ONLY from DB, check stock, snapshot items, code via orderCode, save profile), submitReceipt(user, orderId, { base64, mime }), reviewPayment(orderId, approve, note) (approve: conditional stock decrement 'UPDATE products SET stock = stock - :q WHERE id = :id AND stock >= :q' and check rowsAffected, then status processing; reject: payment_rejected), changeStatus(orderId, status, note) obeying ADMIN_STATUS_CHANGES, toOrderView(row, { forAdmin }). Every status change calls notifyUserStatus.
- Endpoints exactly as SPEC section 6. Customer endpoints must verify order.userId === user.id.
- src/lib/api.js: promisified Telegram.WebApp.Serverless.call, ApiError { type, message, code }, one named function per endpoint, light in-flight dedupe for GET-like calls.
- src/lib/imageTools.js: compressImage(file, { max, quality }) -> { base64, mime }, makeThumb(file) -> data URL (320px, JPEG, under 30 KB).
Use only the signatures in SPEC section 7 for other members' modules. Hand off to Mina.
```
