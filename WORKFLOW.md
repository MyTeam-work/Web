# WORKFLOW — چک‌لیست زنجیره‌ای

زنجیره دور ۳: Atlas → Arash → Mina → Kian (Nima و Sana در این دور کاری ندارند). زنجیره کامل: Atlas → Nima → Sana → Arash → Mina → Kian. Dara نفر اضافه است و در زنجیره نیست؛ فقط روی فایل‌هایی کار می‌کند که در خط `- LIMIT:` زیر آمده‌اند.

قرارداد همه‌چیز در [`SPEC.md`](SPEC.md) است (نسخه ۱.۲، همگام با کد). نفرات فرانت‌اند و نوتیفیکیشن‌ها باید [`DESIGN.md`](DESIGN.md) را هم بخوانند. مرجع فنی پلتفرم: [`docs/tgcloud-sdk.md`](docs/tgcloud-sdk.md). پرامپت هر نفر: [`docs/PROMPTS.md`](docs/PROMPTS.md). Handoffهای دورهای ۱ و ۲ در تاریخچه git همین فایل مانده‌اند؛ قرارداد نهایی همه‌شان (شکل پاسخ‌ها، دستورها، تنظیمات) در SPEC آمده است.

دور فعلی: **۳ — هماهنگی**

## چک‌لیست این دور

هر نفر فقط تیک خودش را می‌زند. کسی که خطش عبارت «بدون کار» دارد در این دور نوبتی ندارد و به آن تیک نمی‌خورد.

- [x] **Atlas** — `SPEC.md` (همگام‌سازی با کد + چک‌لیست راه‌اندازی)
- [ ] **Nima** — (بدون کار در دور ۳)
- [ ] **Sana** — (بدون کار در دور ۳)
- [x] **Arash** — `tgcloud/endpoints/getHome.js` (فیلد `cover` دسته‌ها)، `tgcloud/endpoints/adminListProducts.js` (ورودی `id`)
- [x] **Mina** — `src/api.js` (پیام فارسی کدهای خطا)، `src/pages/Home.jsx` (استفاده از `categories[].cover`)
- [x] **Kian** — `src/pages/admin/AdminProductForm.jsx` (استفاده از `adminListProducts { id }`)، `.github/workflows/deploy.yml` (بازنویسی پیام خطا)
- [ ] **Dara** — (نفر اضافه؛ بدون کار در دور ۳ مگر اینکه `BUG:` روی چهار فایل او ثبت شود)

## قوانین اجباری

قوانین ۱، ۳، ۴، ۵، ۷، ۹ و ۱۰ را Action با نام `Mandatory Rules` روی هر PR بررسی می‌کند (وقتی Actions خاموش است، مدیر آن‌ها را دستی چک می‌کند). PR نقض‌کننده نباید merge شود.

1. هر نفر فقط فایل‌های خودش را تغییر می‌دهد. شاخه باید تازه باشد و نام آن `work/<n>-r3` (برای دور بعد `-r4`) با شروع از آخرین `main`؛ شاخه‌های دورهای قبل را دوباره استفاده نکن.
2. فقط آخرین Handoff خطاب به خودت، `SPEC.md`، `docs/tgcloud-sdk.md` و (برای فرانت‌اند/نوتیفیکیشن) `DESIGN.md` را بخوان. اسکن کل پروژه ممنوع است.
3. بدون تیک خودت و نوشتن Handoff، نوبت نفر بعد نمی‌رسد.
4. فقط Atlas به `schema.js` دست می‌زند. بقیه با برچسب `SCHEMA:` درخواست می‌دهند.
5. `push` و `migrate` دستی ممنوع (مگر با اجازه مدیر برای اولین راه‌اندازی). فقط CI deploy می‌کند و `migrate` فقط با تأیید مدیر.
6. کار نفر قبلی بازبینی نمی‌شود. ایراد را با برچسب `BUG:` در Handoff بنویس.
7. توکن و پوشه `.tgcloud/` هرگز commit نمی‌شود. `TGCLOUD_TOKEN` فقط در GitHub Secrets. لینک دعوت کانال خصوصی هم هرگز در ریپو نیاید.
8. کارهای دستی در پنل BotFather را محمدی با برچسب `PANEL:` انجام می‌دهد؛ بعد از Save در پنل، Kian باید `npx tgcloud pull` بزند.
9. اگر کسی به سقف رسید یا مدیر بار کاری را جابجا کرد، Handoff با برچسب `LIMIT:` (نوشته‌شده به‌صورت خط کاملاً بیرون‌رفته و شروع‌شده با `- LIMIT:`) و فهرست دقیق فایل‌ها می‌نویسد؛ Dara همان‌ها را ادامه می‌دهد.
10. هر PR حداکثر ۶ فایل (به‌جز `WORKFLOW.md`) دارد.

برچسب‌های مجاز در Handoff: `SCHEMA:` `PANEL:` `BUG:` `LIMIT:`

## قالب Handoff

```
## Handoff: <من> → <نفر بعدی>
- کار من انجام شد: <فایل‌ها>
- توابع/خروجی‌های قابل استفاده: <نام + امضا>
- کار تو: فقط <فایل‌های او>
- برچسب‌ها در صورت نیاز: SCHEMA / PANEL / BUG / LIMIT
- نیازی به خواندن فایل دیگری نیست
```

## Handoffها (جدیدترین بالا)

<!-- هر نفر بخش خودش را درست زیر این خط اضافه می‌کند -->

## Handoff: Kian -> Atlas
- کار من انجام شد (دور ۳، شاخه `work/kian-r3`): `src/pages/admin/AdminProductForm.jsx` و `.github/workflows/deploy.yml`. کد هنوز build یا اجرا نشده است (محیط من شبکه ندارد). با اجازه مدیر پروژه، برای هماهنگی فایل‌های دیگر (`SPEC.md`، `package.json`، نسخه فعلی `deploy.yml`) را فقط خواندم.
  - `AdminProductForm.jsx`: محصول در حالت ویرایش با یک درخواست `adminListProducts({ id })` بارگذاری می‌شود (محصول غیرفعال هم می‌آید). حلقه گشتن در همه صفحه‌ها و استفاده از state مسیر حذف شد. شناسه نامعتبر یا پاسخ `items: []` پیام «محصول پیدا نشد» می‌دهد. متن خطاها حالا از `errorMessage(err)` در `api.js` (Mina) می‌آید؛ جدول محلی `uploadMessage` و `SERVER_FIELDS` حذف شد. خطای `INVALID_INPUT` روی فیلدهای `nameFa`، `categoryId`، `description`، `price`، `oldPrice`، `stock` و `colors` زیر همان فیلد هم نشان داده می‌شود و برای بقیه فیلدها فقط toast می‌آید.
  - `deploy.yml`: فقط مرحله «Deploy to tgcloud» تغییر کرد (تغییرات دیگران حفظ شد). پیام خطا بازنویسی شد تا عبارت `--force` اصلاً در فایل نباشد (طبق SPEC بخش ۱۰)؛ در شکست، خلاصه‌ای در Job Summary نوشته می‌شود (بدون retry)؛ بعد از deploy موفق، آدرس `https://app<id>.tgcloud.ai/` از `push.log` پیدا و در Job Summary چاپ می‌شود (برای قدم ۴ و ۵ چک‌لیست SPEC بخش ۱۱).
- توابع/خروجی‌های قابل استفاده: تغییری در امضای هیچ تابعی نبود. `AdminProductForm` همچنان `export default AdminProductForm()` برای `/admin/products/new` و `/admin/products/:id` است.
- کار تو (Atlas): زنجیره دور ۳ با من تمام می‌شود. بعد از آن طبق SPEC بخش ۱۰: دور ۴ (رفع باگ) بعد از اولین اجرای واقعی و ثبت هر `BUG:` واقعی به صاحب فایل. قبل از آن، قدم‌های انسانی چک‌لیست SPEC بخش ۱۱ (BotFather، migrate، اولین deploy، `/seturl`، `/setcard`، `/setrate`، `/setstorage`، اسپایک‌های S1 و S2) باید انجام شود.
- برچسب‌ها در صورت نیاز:
  - BUG: (کد اجرا نشده) فرض‌ها: `adminListProducts({ id })` همان‌طور که Arash نوشته `{ items: [ردیف]|[], total, page }` می‌دهد؛ `ApiError` فیلد `.field` و `.code` دارد (طبق Handoff Mina)؛ در `push.log` آدرس با الگوی `https://app<حروف و عدد>.tgcloud.ai` چاپ می‌شود (اگر قالب چاپ فرق داشته باشد فقط Job Summary بدون آدرس می‌ماند و deploy خراب نمی‌شود)؛ دستور `tgcloud fetch` که کسی به `deploy.yml` اضافه کرده در `@tgcloud/cli` وجود دارد (در صورت نبود، فقط هشدار می‌دهد و ادامه می‌دهد).
  - BUG: (برای دور ۴) `src/pages/admin/AdminProducts.jsx` هنوز `state={{ product }}` را روی لینک‌های ویرایش می‌فرستد که دیگر استفاده نمی‌شود (بی‌ضرر است) و `src/pages/Checkout.jsx` هنوز پیام‌های محلی خطا دارد که با پیام‌های جدید `api.js` تکرار شده‌اند. این دو فایل در جدول دور ۳ من نبودند و دست نزدم.
  - SCHEMA: ندارم.
  - PANEL: ندارم (مراحل انسانی در SPEC بخش ۱۱ هستند؛ `TGCLOUD_TOKEN` باید در GitHub Secrets ساخته شده باشد).
- نیازی به خواندن فایل دیگری نیست.

## Handoff: Mina -> Kian
- کار من انجام شد (دور ۳): `src/api.js` و `src/pages/Home.jsx`. کد هنوز build یا اجرا نشده است.
  - `src/api.js`: پیام فارسی برای همه کدهای خطای endpointهای دور ۱ و ۲ اضافه شد: `PAYMENT_UNAVAILABLE`، `TOO_MANY_PENDING`، `STORAGE_NOT_SET`، `STORAGE_ERROR`، `CURRENCY_UNAVAILABLE`، `SUPPORT_UNAVAILABLE` (جدید) و `OUT_OF_STOCK`، `EMPTY_CART`، `BAD_STATE`، `TOO_LARGE`، `NOT_FOUND`، `FORBIDDEN`، `RATE_LIMIT` (متن بهتر شد). برای `INVALID_INPUT` حالا پیام هر فیلد جدا است (`err.params.field`): `name`، `phone`، `address`، `note`، `items`، `productId`، `qty`، `size`، `color`، `currency`، `text`، `image`، `imageBase64`، `mime`، `orderId`، `id`، `categoryId`، `nameFa`، `description`، `price`، `oldPrice`، `stock`، `sizes`، `colors`، `photos`، `q`. فیلد ناشناخته یا بدون `field` همان پیام عمومی «اطلاعات واردشده درست نیست» را می‌گیرد. `NOT_FOUND` یا `OUT_OF_STOCK` همراه `params.productId` (از `placeOrder`) پیام «یکی از کالاهای سبد شما دیگر در فروشگاه موجود نیست» / «موجودی یکی از کالاها کافی نیست» را می‌دهد. امضای هیچ تابعی عوض نشد.
  - `src/pages/Home.jsx`: کارت دسته‌ها از `categories[].cover` استفاده می‌کنند و درخواست‌های `listProducts { categoryId, limit: 1 }` برای عکس دسته‌ها حذف شد. اگر `cover` خالی (`null`) یا undefined باشد آیکن جایگزین نشان داده می‌شود و صفحه خراب نمی‌شود.
- توابع/خروجی‌های قابل استفاده (برای `AdminProductForm.jsx`):
  - `errorMessage(err)` از `src/api.js` همیشه متن فارسی مناسب را برمی‌گرداند؛ لازم نیست در Checkout یا فرم محصول متن خطا را خودت بنویسی. برای فیلدهای فرم از `err.field` (نام فیلد) و `err.userMessage` استفاده کن؛ برای سبد از `err.params.productId` (در `OUT_OF_STOCK` و `NOT_FOUND`) برای پیدا کردن ردیف مشکل‌دار.
  - `adminListProducts({ id })` (`src/api.js`) را همان‌طور که Arash در Handoff قبلی نوشته صدا بزن: `{ items: [ردیف]|[], total, page }`؛ ردیف شامل `price` و `oldPrice` به‌صورت عدد خام تومان است.
  - `prepareImage(file)` و `adminUploadImage({ imageBase64, mime })` بدون تغییر هستند؛ `STORAGE_NOT_SET` و `STORAGE_ERROR` حالا پیام فارسی مخصوص دارند.
- کار تو (Kian): فقط `src/pages/admin/AdminProductForm.jsx` و `.github/workflows/deploy.yml` (طبق جدول دور ۳).
- برچسب‌ها در صورت نیاز:
  - BUG: (کد اجرا نشده) تا وقتی نسخه جدید `getHome` از Arash deploy نشود، `categories[].cover` در پاسخ نیست و کارت دسته‌ها فقط آیکن جایگزین نشان می‌دهند (پس از deploy عکس‌ها خودکار می‌آیند). فیلدهای فرم تنظیمات (`adminSaveSettings`) در جدول `FIELD_MESSAGES` نیستند و پیام عمومی می‌گیرند؛ اگر Dara لازم دید با `BUG:` بخواهد اضافه شود.
  - SCHEMA: ندارم.
  - PANEL: ندارم.
- نیازی به خواندن فایل دیگری نیست.

## Handoff: Arash → Mina
- کار من انجام شد (دور ۳): `tgcloud/endpoints/getHome.js` و `tgcloud/endpoints/adminListProducts.js`. باقی قراردادها دست‌نخورده‌اند. کد اجرا نشده است.
- توابع/خروجی‌های قابل استفاده:
  - `getHome` (فقط فیلد جدید): هر آیتم `categories` حالا `{ id, slug, nameFa, cover }` است. `cover` از نوع `Image` (`{ full, thumb }` یا `{ url }`) یا `null` است. مقدار آن اولین عکس معتبر جدیدترین محصول **فعال** همان دسته است که عکس دارد (ترتیب `createdAt` نزولی، بعد `id` نزولی). اگر دسته محصول فعال با عکس ندارد `null` می‌شود (برای `null` ابزار جایگزین/رنگ پس‌زمینه نشان بده). برای پیدا کردن عکس، ۲۰۰ محصول فعال جدیدتر اسکن می‌شود؛ دسته‌ای که همه محصولاتش قدیمی‌تر از آن‌ها باشند `null` می‌گیرد. دیگر لازم نیست برای عکس دسته‌ها `listProducts { categoryId, limit: 1 }` صدا بزنی.
  - `adminListProducts { id }` (برای Kian): با `id` (عدد صحیح ۱ تا ۲۱۴۷۴۸۳۶۴۷) فقط همان محصول برمی‌گردد و `q` و `page` نادیده گرفته می‌شوند: `{ items: [ردیف], total: 1, page: 1 }`، یا `{ items: [], total: 0, page: 1 }` اگر وجود ندارد. محصول غیرفعال هم برمی‌گردد. `id` غیرعدد صحیح یا خارج از محدوده → `INVALID_INPUT { field: 'id' }`. شکل ردیف همان قبلی است: `{ id, categoryId, nameFa, description, price(تومان), oldPrice|null(تومان), stock, sizes[], colors[{name,hex}], photos: Image[], cover, isActive, isFeatured, createdAt, updatedAt }`. بدون `id` رفتار قبلی (`q`، `page`، `limit`) است.
- کار تو (Mina): فقط `src/api.js` (پیام فارسی کدهای خطا) و `src/pages/Home.jsx` (استفاده از `categories[].cover`). کدهای خطایی که endpointهای دور ۲ من برمی‌گردانند و در پیام‌های فارسی `api.js` باید پوشش داده شوند: `PAYMENT_UNAVAILABLE`، `TOO_MANY_PENDING`، `STORAGE_NOT_SET`، `STORAGE_ERROR`، `CURRENCY_UNAVAILABLE`، `OUT_OF_STOCK`، `EMPTY_CART`، `BAD_STATE`، `TOO_LARGE`، `NOT_FOUND`، `FORBIDDEN`، `RATE_LIMIT`، `INVALID_INPUT` (با `parameters.field`). هر کدام در Handoff دور ۲ من و SPEC شرح داده شده‌اند.
- برچسب‌ها در صورت نیاز:
  - BUG: (کد اجرا نشده) فرض‌های جدید: ترتیب `orderBy(desc(createdAt), desc(id))` با spread آرایه در `.orderBy(...newest)` کار می‌کند؛ ستون `photos` (json) آرایه parse‌شده برمی‌گرداند؛ `eq(products.id, id)` با `.get()` در `adminListProducts` درست است. تمام کدهای دور ۱ و ۲ من هم هنوز اجرا نشده‌اند.
  - اسپایک‌های S1 و S2 هنوز اندازه‌گیری نشده‌اند (محیط من `tgcloud run` ندارد). دستورهای اجرا در Handoffهای دورهای ۱ و ۲ من (در تاریخچه git همین فایل) هستند؛ مالک (محمدی) باید اجرا کند و عددها را به Atlas بدهد. عدد ساختگی ننوشتم.
  - SCHEMA: ندارم.
  - PANEL: ندارم.
- نیازی به خواندن فایل دیگری نیست.

## Handoff: Atlas → Arash
- کار من انجام شد (دور ۳): `SPEC.md` نسخه ۱.۲. فقط مستندات همگام شده؛ هیچ کدی تغییر نکرد. شامل: شکل دقیق همه پاسخ‌های واقعی از Handoffs دورهای ۱ و ۲، کلیدهای `settings` (از جمله `webapp_url` و شکل `hero_stats`)، `toMoney(irt, rate)` به‌صورت sync با `afn = null` بدون نرخ، دستورهای ربات (`/seturl`، `/setcard` با سه بخش)، و چک‌لیست راه‌اندازی (بخش ۱۱).
- LIMIT: Atlas → Dara (با درخواست مدیر، برای کم کردن بار Atlas): مالکیت این چهار فایل از این به بعد با Dara است (در `.github/ownership.json` هم منتقل شده): `tgcloud/handlers/my_chat_member.js`، `tgcloud/endpoints/adminGetSettings.js`، `tgcloud/endpoints/adminSaveSettings.js`، `src/pages/admin/AdminSettings.jsx`. Atlas دیگر آن‌ها را تغییر نمی‌دهد. Dara فقط برای رفع `BUG:` یا درخواست مدیر روی همین چهار فایل کار می‌کند. قرارداد آن‌ها در SPEC بخش ۵ (`adminGetSettings`، `adminSaveSettings`) و کلیدهای `settings` در بخش ۴ است. `lib/settings.js` (مال Atlas) همچنان `EDITABLE_KEYS` و `DEFAULTS` را نگه می‌دارد؛ اگر Dara کلید جدیدی لازم دارد با برچسب `SCHEMA:` از Atlas بخواهد.
- کار تو (Arash، دور ۳، فقط دو فایل): شاخه `work/arash-r3` از آخرین `main`.
  - `tgcloud/endpoints/getHome.js`: هر آیتم `categories` فیلد جدید `cover` بگیرد؛ مقدار آن اولین عکس (`photos[0]`، همان شکل `Image`) جدیدترین محصول **فعال** همان دسته است (برای مرتب‌سازی: `createdAt` نزولی، بعد `id` نزولی) یا `null` اگر محصول یا عکسی ندارد. باقی خروجی `getHome` دقیقاً مثل قبل بماند. بهتر است یک کوئری برای همه دسته‌ها (مثلاً محصولات فعال با ترتیب جدیدتر به قدیمی با `limit` معقول مثل ۲۰۰) و انتخاب اولین در هر دسته در کد باشد.
  - `tgcloud/endpoints/adminListProducts.js`: ورودی اختیاری جدید `id` (عدد صحیح ۱ تا ۲۱۴۷۴۸۳۶۴۷). اگر آمد، `q` و `page` نادیده گرفته می‌شوند و جواب `{ items: [ردیف], total: 1, page: 1 }` یا `{ items: [], total: 0, page: 1 }` است (محصول غیرفعال هم برگردانده می‌شود). نوع نادرست `id` → `INVALID_INPUT { field: 'id' }`. شکل ردیف دقیقاً همان قبلی باشد.
  - هیچ قرارداد دیگری را تغییر نده. اسپایک S2 را همچنان مالک (محمدی) باید اجرا کند؛ ننوشتن عدد ساختگی درست است.
- Handoff تو به Mina باید بگوید: شکل دقیق `categories[].cover` و اینکه درخواست‌های `listProducts { categoryId, limit: 1 }` برای عکس دسته‌ها دیگر لازم نیست. و به Kian: شکل جدید `adminListProducts { id }`.
- برچسب‌ها در صورت نیاز:
  - BUG: (کد اجرا نشده) همه کدها همچنان اجرا نشده‌اند. اگر کسی به `tgcloud run` دسترسی دارد، نتیجه را در Handoff بنویسد.
  - PANEL: مراحل راه‌اندازی انسانی (BotFather، `package-lock.json`، اولین deploy، دستورهای مدیر) در SPEC بخش ۱۱ هستند.
  - SCHEMA: ندارم.
- نیازی به خواندن فایل دیگری نیست.
