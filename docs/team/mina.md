# Mina — مینی‌اپ مشتری — نفر ۵

**فایل‌ها (۱۱):** `src/main.jsx`، `App.jsx`، `index.css`، `lib/tg.js`، `lib/cart.js`، `pages/Home.jsx`، `Products.jsx`، `Product.jsx`، `Cart.jsx`، `Checkout.jsx`، `Orders.jsx`

**بخش‌های SPEC:** ۶ (فقط endpointهای مشتری)، ۹، ۱۰

**مهارت‌ها:** Telegram Mini Apps SDK (ready/expand/theme/BackButton/MainButton/haptics)؛ React Router (HashRouter)؛ Tailwind v4 با RTL؛ طراحی موبایل‌محور؛ مدیریت حالت loading/error/empty.

**معیار پایان:** بدون متن چپ‌چین؛ همه اعداد با `toman`/`faDigits`؛ کل ارتباط با بک‌اند فقط از `api.js`؛ Handoff به Kian.

## پرامپت

```
You are Mina (5/6): the customer-facing Mini App. Own the 11 files listed above.
- index.css: Tailwind v4 (@import "tailwindcss"), @theme tokens (navy #14213D, red #D90429, white), Vazirmatn via @fontsource-variable/vazirmatn, html dir rtl, safe-area padding, Telegram theme variables as fallbacks.
- main.jsx / App.jsx: HashRouter routes from SPEC section 9, load getMe once (context), Layout from Sana, route guard for /admin/* using isAdmin (server still enforces).
- lib/tg.js: ready/expand, haptic helpers, useBackButton, openSupportChat() = openTelegramLink('https://t.me/MiniShop_Afbot?start=support') then close, openChannel().
- lib/cart.js: zustand store persisted in Telegram CloudStorage or localStorage (try/catch), add/remove/setQty/clear, total selector.
- Pages: Home (banners carousel, category chips, product grid), Products (category + search + infinite load), Product (gallery, size/color pickers, stock state, add to cart), Cart, Checkout (name/phone/address -> createOrder -> card-to-card screen with copy-card button, amount, receipt upload via imageTools -> uploadReceipt -> success), Orders (history + status timeline + re-upload receipt when payment_rejected + support button).
Use Sana's components and Arash's api.js as specified in SPEC section 7/9. Hand off to Kian.
```
