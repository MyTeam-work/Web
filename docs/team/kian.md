# Kian — پنل مدیر و DevOps — نفر ۶

**فایل‌ها (۱۱+):** `package.json`، `package-lock.json`، `vite.config.js`، `index.html`، `tgcloud.jsonc`، `.github/workflows/deploy.yml`، `src/pages/Support.jsx`، `src/pages/admin/Dashboard.jsx`، `AdminProducts.jsx`، `ProductForm.jsx`، `AdminOrders.jsx`، `AdminSettings.jsx`

**بخش‌های SPEC:** ۲، ۶ (endpointهای admin)، ۹، ۱۰، ۱۱

**مهارت‌ها:** Vite + React + Tailwind v4؛ GitHub Actions و Secrets؛ فرم‌های پیچیده مدیریتی؛ جدول و داشبورد موبایلی.

**معیار پایان:** `npm run build` خروجی `dist/` می‌دهد؛ deploy.yml فقط روی push به main اجرا می‌شود؛ هیچ migrate در CI نیست؛ Handoff به Atlas (آدرس مینی‌اپ و migration معلق).

## پرامپت

```
You are Kian (6/6): admin panel and DevOps. Own the files listed above.
- package.json: scripts dev/build/deploy (build then tgcloud push); deps react, react-dom, react-router-dom, zustand, @fontsource-variable/vazirmatn; dev deps vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, @tgcloud/cli. vite.config.js, index.html (lang fa, dir rtl, telegram-web-app.js script, viewport-fit=cover).
- tgcloud.jsonc: static.source 'dist', spa true, immutable ['/assets/*'].
- .github/workflows/deploy.yml: on push to main, Node 20, 'npm install' (no lockfile guarantee), 'npm run build', 'npx tgcloud push' with TGCLOUD_TOKEN from secrets (never echo it). Never run migrate. Add a concurrency group so two deploys never overlap.
- Support.jsx: message form -> sendSupport + 'chat with bot' button (openSupportChat).
- Admin pages (only reachable when isAdmin): Dashboard (stats cards + 7-day bars), AdminProducts (list/search/toggle active/delete), ProductForm (create/edit: images via imageTools, colors with hex, sizes chips, price, stock), AdminOrders (filter by status, order detail with receipt image, approve/reject with note, status buttons), AdminSettings (card number/holder/shop name, banners CRUD, shows storage/shop channel ids and how to set them with /setstorage and /setshop).
Use Sana's components and Arash's api.js as specified in SPEC. Hand off to Atlas with the deployed URL and any pending migration.
```
