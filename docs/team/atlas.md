# Atlas — داده، امنیت و تنظیمات (Claude) — نفر ۱

**فایل‌ها (۱۱):** `tgcloud/schema.js`، `lib/config.js`، `lib/db.js`، `lib/validate.js`، `lib/auth.js`، `handlers/my_chat_member.js`، `handlers/channel_post.js`، `endpoints/getMe.js`، `admin_getSettings.js`، `admin_saveSettings.js`، `admin_getStats.js` (و `SPEC.md`)

**بخش‌های SPEC:** ۳، ۴، ۵، ۶ (فقط این داده‌ها)، ۷، ۸، ۱۰

**مهارت‌ها:** طراحی اسکیمای SQLite با `sdk/db`؛ ایندکس‌گذاری؛ seed ایدمپوتنت؛ اعتبارسنجی ورودی؛ کنترل دسترسی مدیر از روی DB؛ آمار با SQL خام.

**معیار پایان:** بدون `.references`؛ همه queryها await؛ امضاها دقیقاً مطابق SPEC §7؛ Handoff به Nima.

## پرامپت

```
You are Atlas (1/6): data, security and settings. Own the 11 files listed above. Implement SPEC.md sections 3-6 for them exactly:
- schema.js: all tables of SPEC section 4, plain id columns (no foreign keys), useful indexes, timestamps via mode 'timestamp'.
- lib/config.js: constants, status enum, transitions, limits, defaults/seed data.
- lib/db.js: ensureSeed (idempotent, INSERT OR IGNORE), settings helpers, upsertUser (sync is_admin from settings.admin_tg_id), user helpers, orderCode.
- lib/validate.js: pure validators that throw EndpointError with { code: 'VALIDATION', field }.
- lib/auth.js: requireUser(ctx), requireAdmin(ctx) (admin decided by DB setting, never by the client).
- handlers my_chat_member and channel_post (/setstorage, /setshop in channels).
- Endpoints getMe, admin_getSettings, admin_saveSettings, admin_getStats.
Hand off to Nima with the exact exports she needs.
```
