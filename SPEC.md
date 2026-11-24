# SPEC — فروشگاه پوشاک و اکسسوری لوکس (Telegram Mini App)

نسخه ۱.۲ · نویسنده: Atlas · فقط Atlas این فایل را تغییر می‌دهد (درخواست تغییر: برچسب `SCHEMA:` یا `BUG:` در Handoff). ظاهر و چیدمان: [`DESIGN.md`](DESIGN.md).

۱.۲ = همگام‌سازی با کدی که در دورهای ۱ و ۲ نوشته شد (شکل دقیق پاسخ‌ها، کلیدهای تنظیمات، دستورهای ربات) + چک‌لیست راه‌اندازی. هر جا که با کد متفاوت بود، کد درست است مگر اینکه بخش «تغییرات دور ۳» چیز دیگری بگوید.

## ۱. هدف و ثابت‌ها

فروشگاه اینترنتی پوشاک و اکسسوری لوکس، فارسی، راست‌چین، کاملاً رسپانسیو، به‌صورت Telegram Mini App همراه ربات. پرداخت کارت‌به‌کارت با آپلود رسید؛ پنل مدیریت فقط برای مدیر.

| مورد | مقدار |
| --- | --- |
| ربات | @MiniShop_Afbot |
| کانال فروشگاه | https://t.me/shopafg |
| مدیر | @Akh_Aurora — ID عددی `7566522940` |
| نام فروشگاه | از `settings.shop_name` (مدیر تنظیم می‌کند)؛ در کد ننویسید |
| فونت | Vazirmatn (بسته npm: `@fontsource/vazirmatn`) |
| رنگ‌ها و چیدمان | طبق `DESIGN.md` |
| کد سفارش | `MS-yymmdd-xxxx` (مثل `MS-261110-4821`) |

کانال خصوصی ذخیره فایل‌ها: لینک دعوت آن هرگز در کد یا ریپو نیاید. فقط `chat_id` عددی آن در `settings.storage_chat_id` ذخیره می‌شود (دستور `/setstorage`).

## ۲. تغییر استک نسبت به پیشنهاد اولیه

کل پروژه روی Telegram Serverless (`tgcloud`) اجرا و هاست می‌شود.

| پیشنهاد اولیه | در این پروژه | دلیل |
| --- | --- | --- |
| Next.js | Vite + React + Tailwind (v4)، خروجی `dist/` | میزبانی ایستا روی `app<id>.tgcloud.ai` |
| Express | `tgcloud/endpoints/` | پلتفرم خودش اجرا می‌کند |
| MongoDB / PostgreSQL | SQLite داخلی (`sdk/db`، شبیه Drizzle) | بدون سرور؛ بدون foreign key |
| Telegraf | `tgcloud/handlers/` و `api` از `sdk` | بدون webhook دستی |
| اعتبارسنجی initData | خودکار توسط پلتفرم (۴۰۱ قبل از اجرای کد) | `ctx.initData.user` قابل اعتماد است |
| React + WebApp SDK | همان (`telegram-web-app.js`) | برای `Serverless.call` |

## ۳. ساختار پوشه‌ها

```
mini-appbot/
├─ tgcloud/                      # فقط این بخش به‌عنوان کد بک‌اند deploy می‌شود
│  ├─ schema.js
│  ├─ lib/  db.js ids.js settings.js auth.js orders.js
│  │        commands.js i18n.js support.js
│  │        keyboards.js format.js notify.js
│  ├─ handlers/  message.js callback_query.js my_chat_member.js      # تخت (flat)
│  └─ endpoints/ (تخت) getHome listProducts getProduct getImage
│                placeOrder submitReceipt myOrders sendSupport
│                adminStats adminListProducts adminSaveProduct adminDeleteProduct adminUploadImage
│                adminListOrders adminReviewOrder adminGetSettings adminSaveSettings
├─ src/                          # فرانت‌اند Mini App (Vite + React)
│  ├─ main.jsx App.jsx api.js store.js styles.css
│  ├─ lib/fa.js                  # ارقام فارسی، نمایش مبلغ
│  ├─ components/ Header Footer HeroSlider ProductCard Img BottomNav OrderCard
│  └─ pages/ Home Product Cart Checkout Orders Support
│     └─ admin/ AdminDashboard AdminProducts AdminProductForm AdminOrders AdminOrderDetail AdminSettings
├─ docs/  tgcloud-sdk.md  PROMPTS.md
├─ index.html  vite.config.js  package.json  tgcloud.jsonc  CODEOWNERS
├─ .github/ (workflows, scripts, ownership.json, pull_request_template.md)
├─ SPEC.md  DESIGN.md  WORKFLOW.md  README.md
```

`App.jsx` صفحه‌ها را با `import.meta.glob('./pages/**/*.jsx')` و `Header`/`Footer`/`BottomNav` را با glob eager لود می‌کند. مسیریابی: HashRouter.

## ۴. دیتابیس و ارز (`tgcloud/schema.js`)

بدون foreign key. روابط با ستون عددی ساده. زمان‌ها `integer(..., { mode: 'timestamp' })` (ثانیه یونیکس؛ برای خروجی API همیشه با `toUnix()` از `lib/db.js` به عدد تبدیل می‌شود).

**ارز:** قیمت پایه همه محصولات به **تومان** (عدد صحیح) ذخیره می‌شود. مبلغ‌ها در پاسخ API به‌شکل `Money = { irt, afn }` می‌آیند و محاسبه فقط سمت سرور انجام می‌شود. در `lib/settings.js`:

- `toMoney(irt, rate)` (**sync**) → `{ irt, afn }` با `afn = ceil(irt / rate / 10) * 10`. `rate` همان `toman_per_afn` است (هر ۱ افغانی چند تومان).
- `getMoneyConverter()` (async) نرخ را یک‌بار می‌خواند و تابع sync برمی‌گرداند؛ `getRate()` نرخ یا `null`.
- **بدون نرخ ثبت‌شده، `afn` برابر `null` است** و فرانت کلید افغانی را غیرفعال می‌کند؛ `placeOrder` با ارز AFN بدون نرخ `CURRENCY_UNAVAILABLE` می‌دهد.
- مشتری ارز نمایش و پرداخت را انتخاب می‌کند (`IRT` یا `AFN`).

**تصویر:** `Image = { full, thumb }` (دو file_id از کانال ذخیره) یا `{ url }`.

| جدول | ستون‌ها |
| --- | --- |
| `users` | id (pk), tgId (unique), firstName, lastName, username, languageCode, phone, isBlocked (bool), currency, createdAt, lastSeenAt |
| `settings` | key (pk, text), value (json), updatedAt |
| `categories` | id, slug (unique), nameFa, sortOrder, isActive |
| `products` | id, categoryId, nameFa, description, price (تومان)، oldPrice (تومان، اختیاری)، stock, sizes (json آرایه رشته)، colors (json آرایه {name, hex})، photos (json آرایه Image)، isActive, isFeatured, createdAt, updatedAt |
| `orders` | id, code (unique)، userTgId, currency (`IRT` یا `AFN`)، customerName, phone, address, note, subtotalIrt, shippingIrt, totalIrt, totalAfn, payAmount (به ارز انتخابی)، fxRate, status, receiptFileId, receiptAt, adminNote, createdAt, updatedAt |
| `order_items` | id, orderId, productId, nameFa (اسناپ‌شات)، unitPriceIrt, qty, size, color |
| `support_messages` | id, userTgId, direction (`in` یا `out`)، text, adminMsgId, createdAt |

کلیدهای `settings` (کلیدهای قابل ویرایش توسط مدیر در `EDITABLE_KEYS` است):

| کلید | مقدار |
| --- | --- |
| `admin_tg_id` | پیش‌فرض 7566522940 (فنی، قابل ویرایش از میني‌اپ نیست) |
| `shop_name`, `support_text` | متن (۶۰ و ۵۰۰ کاراکتر) |
| `shipping_fee` | تومان، عدد صحیح |
| `default_currency` | `IRT` یا `AFN` |
| `toman_per_afn` | نرخ (عدد مثبت) یا null |
| `webapp_url` | آدرس https میني‌اپ یا null (با `/seturl` یا از صفحه تنظیمات) |
| `pay_irt` | `{ number, holder, bank }` مقصد پرداخت تومانی |
| `pay_afn` | `{ number, holder, bank, note }` مقصد پرداخت افغانی |
| `slides` | حداکثر ۱۰؛ هر اسلاید `{ image, eyebrow, title, subtitle, buttonText, link }` و `link = { type: 'category' یا 'product' یا 'url', value }` یا null |
| `promos` | حداکثر ۲؛ هر کدام `{ theme: 'dark' یا 'light', image, eyebrow, title, text, buttonText, link }` |
| `hero_stats` | `[{ value, label }]` (حداکثر ۶) یا null؛ خالی = نمایش داده نمی‌شود |
| `storage_chat_id`, `shop_chat_id`, `pending_action` | فنی (با دستورهای ربات) |

دسته‌بندی اولیه (`ensureSeed()` در `lib/db.js`): زنانه (`women`)، مردانه (`men`)، اکسسوری (`accessories`).

### وضعیت سفارش

| کلید | نمایش |
| --- | --- |
| `awaiting_receipt` | در انتظار رسید |
| `receipt_review` | در حال بررسی پرداخت |
| `paid` | پرداخت تأیید شد |
| `rejected` | رسید رد شد |
| `processing` | در حال پردازش |
| `shipped` | ارسال شد |
| `cancelled` | لغو شد |

انتقال‌ها (فقط همین‌ها، در `lib/orders.js`):

- `placeOrder` → `awaiting_receipt` (موجودی کم می‌شود)
- `submitReceipt`: `awaiting_receipt` یا `rejected` → `receipt_review`
- `approve`: `receipt_review` → `paid`
- `reject`: `receipt_review` → `rejected` (کاربر دوباره رسید می‌فرستد)
- `processing`: `paid` → `processing`، `shipped`: `processing` → `shipped`
- `cancel`: هر وضعیت بجز `shipped` و `cancelled` → `cancelled` (موجودی برمی‌گردد)

هر انتقال توسط `applyAction` در `lib/orders.js` انجام می‌شود؛ هم `adminReviewOrder` و هم دکمه‌های ربات (`callback_query`) همان را صدا می‌زنند.

## ۵. قرارداد API میني‌اپ (endpoints)

همه با `Telegram.WebApp.Serverless.call(name, input, cb)` صدا زده می‌شوند (در فرانت با wrapperهای `src/api.js`). خطا فقط با `throw new EndpointError(msg, { code, ... })` و در کلاینت `err.parameters.code`. مبلغ‌ها همیشه از دیتابیس محاسبه می‌شوند.

نوع‌ها: `Money = { irt, afn }`، `Image` (بالا)، `ProductCard = { id, nameFa, price: Money, oldPrice: Money یا null, cover: Image یا null, colors (حداکثر ۴), inStock }`، `OrderSummary = { id, code, status, currency, total: Money, createdAt, itemsCount }`.

### مشتری (همه کاربران)

| endpoint | ورودی | خروجی | کدهای خطا |
| --- | --- | --- | --- |
| `getHome` | `{}` | `{ shopName, slides[] (≤۱۰), categories[{ id, slug, nameFa }], promos[] (≤۲), featured: ProductCard[] (≤۸), newArrivals: ProductCard[] (≤۸), currency: { default, tomanPerAfn }, heroStats, isAdmin }` | — |
| `listProducts` | `{ categoryId?, q?, ids?[] (≤۵۰), sort? ('new' یا 'price_asc' یا 'price_desc'), sale?, page?, limit? (≤۵۰، پیش‌فرض ۲۰) }` | `{ items: ProductCard[], total, page }` (فقط محصولات فعال) | `INVALID_INPUT { field }` |
| `getProduct` | `{ id }` | `{ id, nameFa, description, price, oldPrice, stock, sizes[], colors[{ name, hex }], photos: Image[], categoryId }` | `NOT_FOUND` (غیرفعال هم) |
| `getImage` | `{ fileId, size? ('thumb' یا 'full') }` | `{ dataUrl }` | `NOT_FOUND`, `TOO_LARGE` |
| `placeOrder` | `{ items: [{ productId, qty (۱ تا ۲۰), size, color }] (≤۳۰), currency, name (≥۲), phone (۸ تا ۱۵ رقم، ارقام فارسی هم مجاز), address (۱۰ تا ۵۰۰), note? }` | `{ orderId, code, total: Money, subtotal: Money, shipping: Money, currency, pay: { amount, number, holder, bank, note }, status }` | `EMPTY_CART`, `OUT_OF_STOCK { productId }`, `NOT_FOUND { productId }`, `INVALID_INPUT { field }`, `CURRENCY_UNAVAILABLE`, `PAYMENT_UNAVAILABLE { currency }`, `TOO_MANY_PENDING` (بیش از ۵ سفارش بدون رسید) |
| `submitReceipt` | `{ orderId, imageBase64, mime }` (`image/jpeg` یا `png` یا `webp`، حداکثر ۵MB خام) | `{ status: 'receipt_review' }` | `NOT_FOUND`, `BAD_STATE`, `TOO_LARGE`, `INVALID_INPUT`, `STORAGE_ERROR` |
| `myOrders` | `{ page? }` | `{ items: OrderSummary[], page, hasMore }` | — |
| `sendSupport` | `{ text }` (۱ تا ۱۰۰۰) | `{ ok: true }` | `INVALID_INPUT`, `RATE_LIMIT` (بیش از ۲۰ پیام در ساعت), `SUPPORT_UNAVAILABLE` |

### مدیر (همه با `requireAdmin(ctx)` شروع می‌شوند؛ برای غیرمدیر `FORBIDDEN`)

| endpoint | ورودی | خروجی |
| --- | --- | --- |
| `adminStats` | `{}` | `{ today: { orders, revenue: Money }, week: { orders, revenue: Money }, pendingReceipts, lowStock: [{ id, nameFa, stock }], lowStockMax, byStatus }` («امروز» از ۰۰:۰۰ به وقت UTC+03:30) |
| `adminListProducts` | `{ q?, page?, limit? (≤۵۰) }` | `{ items, total, page }`؛ هر ردیف `{ id, categoryId, nameFa, description, price, oldPrice, stock, sizes, colors, photos, cover, isActive, isFeatured, createdAt, updatedAt }` (`price` و `oldPrice` تومان خام، غیرفعال‌ها هم می‌آیند) |
| `adminSaveProduct` | `{ id?, categoryId, nameFa (۲ تا ۱۲۰), description?, price (تومان، ≥۱)، oldPrice?, stock (۰ تا ۱۰۰۰۰۰), sizes[] (≤۲۰), colors[{ name, hex }] (≤۲۰، نام یکتا), photos: Image[] (≤۱۲), isActive?, isFeatured? }` | `{ id }` |
| `adminDeleteProduct` | `{ id }` | `{ ok }` (حذف نرم: `isActive = false`) |
| `adminUploadImage` | `{ imageBase64, mime }` | `{ image: { full, thumb } }` (خطا: `STORAGE_NOT_SET`, `TOO_LARGE`, `INVALID_INPUT`, `STORAGE_ERROR`) |
| `adminListOrders` | `{ status?, page? }` | `{ items: [{ id, code, status, currency, customerName, total: Money, payAmount, itemsCount, hasReceipt, createdAt }], total, page, hasMore }` (۲۰ در هر صفحه) |
| `adminListOrders` | `{ id }` | `{ order, items, customer }`: `order` شامل مشخصات مشتری، `subtotal`، `shipping`، `total` (Money با نرخ ذخیره‌شده روی سفارش)، `payAmount`، `receiptFileId`، `receiptAt`، `adminNote`؛ `customer = { tgId, username, firstName, isBlocked }` |
| `adminReviewOrder` | `{ orderId, action ('approve' یا 'reject' یا 'processing' یا 'shipped' یا 'cancel'), note? }` | `{ status, from, notified }` (خطا: `BAD_STATE`, `NOT_FOUND`, `INVALID_INPUT`) |
| `adminGetSettings` | `{}` | همه کلیدهای `EDITABLE_KEYS` |
| `adminSaveSettings` | بخشی از همان کلیدها | `{ ok, saved: [keys] }` (خطا: `INVALID_INPUT { field }`) |

`isAdmin`: `ctx.initData.user.id` باید با `settings.admin_tg_id` برابر باشد (`lib/auth.js`: `isAdmin`, `isAdminId`, `requireAdmin`, `getUser`). نمایش پنل در میني‌اپ فقط راهنماست؛ امنیت واقعی فقط سمت endpoint است.

### تغییرات دور ۳ (قرارداد جدید؛ هنوز در کد نیست)

- `getHome.categories[]` فیلد `cover: Image یا null` می‌گیرد: اولین عکس جدیدترین محصول فعال همان دسته. (Arash، Mina)
- `adminListProducts { id }`: اگر `id` (عدد صحیح) داده شود موارد `q` و `page` نادیده گرفته می‌شوند و جواب `{ items: [ردیف] یا [], total: ۱ یا ۰, page: 1 }` است (محصول غیرفعال هم برمی‌گردد). (Arash، Kian)
- `api.js` برای کدهای `PAYMENT_UNAVAILABLE`, `TOO_MANY_PENDING`, `STORAGE_NOT_SET`, `STORAGE_ERROR`, `CURRENCY_UNAVAILABLE`, `SUPPORT_UNAVAILABLE` پیام فارسی می‌دهد. (Mina)

## ۶. ربات (handlers)

- `/start`: خوش‌آمدگویی و دکمه `web_app` «ورود به فروشگاه» (آدرس از `webapp_url`؛ بدون آن فقط متن)، `/help`، و deep link `order_<کد>` برای دیدن وضعیت سفارش (فقط صاحب سفارش). کاربر در `users` ثبت/به‌روز می‌شود.
- پشتیبانی: هر پیام متنی کاربر (در چت ربات یا از `sendSupport`) برای مدیر ارسال می‌شود. مدیر با **Reply** روی همان پیام جواب می‌دهد و ربات آن را به کاربر می‌فرستد (نگاشت با `support_messages.adminMsgId`).
- نسخه جایگزین رسید: عکس رسید با کد سفارش (`MS-۶رقم-۴رقم`) در کپشن در چت ربات.
- دستورهای مدیر (فقط از `admin_tg_id`): `/setcard irt شماره|نام دارنده|بانک` و `/setcard afn شماره|نام دارنده|بانک` (سه بخش لازم است)، `/setrate <هر ۱ افغانی چند تومان>`، `/seturl <https آدرس>`، `/setstorage` و `/setshop` (بعد از دستور، یک پست را از آن کانال فوروارد کنید؛ `forward_origin.chat.id` ذخیره می‌شود؛ حالت در `pending_action`).
- اعلان مدیر: با `placeOrder` پیام متنی «سفارش جدید» (`notifyAdminNewOrder`) و با `submitReceipt` عکس رسید همراه جزئیات و دکمه‌های ✅ تأیید / ❌ رد / ⚙️ در حال پردازش / 🚚 ارسال شد / 🚫 لغو (`notifyAdminReceipt`). `callback_data`: `ord:<a|r|p|s|c>:<orderId>`.
- اعلان کاربر: هر تغییر وضعیت سفارش → پیام فارسی با کد سفارش و وضعیت جدید (`notifyUserStatus`)، همراه یادداشت مدیر در صورت وجود.
- `my_chat_member`: بلاک/آنبلاک کاربر را در `users.isBlocked` ثبت می‌کند.
- ارسال پیام: همیشه `parse_mode: 'HTML'` با escape متن کاربر. `BotApiError`: کد ۴۰۳ = کاربر ربات را بلاک کرده؛ ۴۲۹ = بعد از `retry_after` دوباره تلاش.

## ۷. رابط کاربری (src/)

طراحی و چیدمان دقیق در [`DESIGN.md`](DESIGN.md) است؛ از اینجا فقط قراردادها:

- صفحات مشتری: Home، Product، Cart، Checkout، Orders، Support. صفحات مدیر فقط وقتی `getHome.isAdmin` برابر true باشد در ناوبری دیده می‌شوند.
- ارز انتخابی در `store.js` (و `localStorage`) نگه داشته می‌شود؛ مبلغ هرگز سمت کلاینت تبدیل نمی‌شود.
- سبد خرید و علاقه‌مندی‌ها در `localStorage` (علاقه‌مندی‌ها با `listProducts { ids }`).
- آپلود رسید و تصاویر مدیر: کلاینت عکس را در canvas کم‌حجم می‌کند (`prepareImage`: ضلع بلند حداکثر ۱۶۰۰، JPEG کیفیت ۰.۷) و با `submitReceipt` یا `adminUploadImage` می‌فرستد.
- `Img.jsx` همه‌جا با `getImage` (کش در حافظه) کار می‌کند و با `{ url }` هم کار می‌کند.

## ۸. امنیت

- احراز هویت فقط از `ctx.initData.user`؛ هرگز `user_id` از input نپذیرید.
- هر ورودی تایپ، طول و محدوده را چک می‌کند (qty ۱ تا ۲۰، حداکثر ۳۰ اقلام در سبد، `slides` حداکثر ۱۰، `promos` حداکثر ۲).
- شماره تلفن، آدرس و رسید اطلاعات شخصی هستند: در `console.*` ننویسید.
- هیچ سکرتی در ریپو نیست؛ Action قوانین الگوی توکن‌ها را رد می‌کند.

## ۹. اسپایک‌ها

سقف دقیق اندازه request/response endpointها در مستندات نیامده. **هنوز اجرا نشده‌اند** (نیاز به `npx tgcloud run` روی کامپیوتر یا Codespaces):

- **S1 — `getImage`:** آیا تصویر کوچک (`thumb`) و عکس بزرگ اسلاید (`full`) به‌صورت base64 در پاسخ می‌آید؟ اگر نه: محصول و اسلاید با `{ url }` (آدرس مستقیم) کار می‌کند.
- **S2 — `submitReceipt` و `adminUploadImage`:** آیا ورودی base64 حدود ۵۰۰ کیلوبایت پذیرفته می‌شود؟ اگر نه: رسید از طریق ربات (بخش ۶) و عکس محصول با `{ url }`.

## ۱۰. نقشه دورها

هر PR حداکثر ۶ فایل (به‌جز `WORKFLOW.md`). شاخه هر دور: `work/<n>`، `work/<n>-r2`، `work/<n>-r3`.

| دور | وضعیت | محتوا |
| --- | --- | --- |
| ۱ — پایه | ✅ تمام | schema, libها, handlers ربات, endpointهای کاتالوگ, اسکلت فرانت, تنظیمات build و deploy |
| ۲ — قابلیت‌ها | ✅ تمام | سفارش، رسید، پشتیبانی، پنل مدیر (سفارش‌ها، محصولات، تنظیمات)، صفحات مشتری |
| ۳ — هماهنگی | الان | جدول زیر |
| ۴ — رفع باگ | بعد از اولین اجرای واقعی | هر `BUG:` واقعی به صاحب فایل |

**دور ۳** (زنجیره: Atlas → Arash → Mina → Kian؛ Nima و Sana بدون کار):

| نفر | فایل‌ها |
| --- | --- |
| Atlas | `SPEC.md` (همین نسخه) |
| Arash | `tgcloud/endpoints/getHome.js` (فیلد `cover` دسته‌ها)، `tgcloud/endpoints/adminListProducts.js` (ورودی `id`) |
| Mina | `src/api.js` (پیام فارسی کدهای خطا)، `src/pages/Home.jsx` (استفاده از `categories[].cover`) |
| Kian | `src/pages/admin/AdminProductForm.jsx` (استفاده از `adminListProducts { id }`)، `.github/workflows/deploy.yml` (بازنویسی پیام خطا طوری که عبارت `--force` با `tgcloud push` در یک خط نباشد) |
| Nima, Sana | بدون کار |

## ۱۱. چک‌لیست راه‌اندازی (انسانی، به ترتیب)

1. BotFather ← `@MiniShop_Afbot` ← **Serverless** را روشن کنید.
2. Database: `schema.js` را جایگزین کنید، Save بزنید و تغییرات امن (۷ جدول) را اعمال کنید (migrate).
3. کسی با کامپیوتر یا Codespaces `npm install` بزند و `package-lock.json` را commit کند.
4. اولین deploy: اگر Actions فعال است با merge به `main`؛ وگرنه روی کامپیوتر: `npx tgcloud login` (با توکن CLI) و `npm run deploy`. آدرس `https://app<id>.tgcloud.ai/` در خروجی `push` چاپ می‌شود.
5. آدرس بالا را در BotFather به‌عنوان Mini App ربات ثبت کنید و در چت ربات `/seturl <آدرس>` بزنید.
6. در چت ربات (مدیر): `/setcard irt …`، `/setcard afn …`، `/setrate …`، `/setstorage` (فوروارد یک پست از کانال خصوصی)، `/setshop` (اختیاری).
7. میني‌اپ ← پنل مدیریت ← تنظیمات (نام فروشگاه، اسلایدها، بنرها، هزینه ارسال) ← محصولات.
8. اجرای اسپایک S1 و S2 و ثبت نتیجه در Handoff.
9. تست سناریوها: خرید با هر دو ارز، آپلود رسید (میني‌اپ و ربات)، تأیید/رد/ارسال، اعلان‌ها، پشتیبانی و Reply مدیر، بلاک/آنبلاک، اسلایدر، و دسترسی مدیر (کاربر غیرمدیر باید `FORBIDDEN` بگیرد).
