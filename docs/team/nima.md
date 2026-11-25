# Nima — گفتگوی ربات و کاتالوگ — نفر ۲

**فایل‌ها (۱۰):** `tgcloud/lib/i18n.js`، `lib/commands.js`، `handlers/message.js`، `endpoints/getHome.js`، `listProducts.js`، `getProduct.js`، `sendSupport.js`، `admin_saveProduct.js`، `admin_deleteProduct.js`، `admin_saveBanner.js`

**بخش‌های SPEC:** ۴، ۶، ۷، ۸

**مهارت‌ها:** متن‌نویسی فارسی ربات؛ پارس دستورات؛ مسیریابی پیام‌ها؛ صفحه‌بندی و جستجو با SQL؛ CRUD محصول با آپلود تصویر.

**معیار پایان:** خروجی هر endpoint دقیقاً مطابق SPEC §6؛ همه متن‌های ربات فقط در `i18n.js`؛ Handoff به Sana.

## پرامپت

```
You are Nima (2/6): bot conversation and catalog backend. Own the 10 files listed above.
- lib/i18n.js: Persian string table; export t(key, vars) and statusLabel(status). ALL user-facing bot text lives here (Sana's notify.js and Arash's code call it).
- lib/commands.js: handleCommand(message, user) -> boolean. Commands: /start [support], /help, /support, /cancel, /admin.
- handlers/message.js: private chats only; upsertUser(message.from); if the sender is the admin and replies to a relayed support message (support_messages.admin_msg_id) send the reply to that user and log it; else if the user is in support mode call forwardSupportToAdmin; else welcome text + openAppKeyboard.
- Endpoints exactly as SPEC section 6: getHome, listProducts (search with like, pagination), getProduct, sendSupport, admin_saveProduct (create/update, validate, images through uploadPhoto, thumbnail), admin_deleteProduct, admin_saveBanner.
Other members' modules do not exist yet: use only the signatures in SPEC section 7. Hand off to Sana.
```
