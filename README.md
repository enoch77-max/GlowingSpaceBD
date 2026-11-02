# Glowing Space BD — Frontend (MVP)

React 19 + Vite + Tailwind CSS v4 + TypeScript. No runtime deps beyond React. Tiny built-in router (`src/router.tsx`) for semantic URLs.

## Routes
- **Storefront:** `/` · `/shop` · `/shop/:category` · `/product/:slug` · `/cart` · `/checkout` · `/order/:id` · `/track` · `/login`
- **Admin Console:** `/admin` · `/admin/orders` · `/admin/products` · `/admin/storefront` · `/admin/coupons` · `/admin/settings` · `/admin/secrets` · `/admin/team` · `/admin/audit`

## Structure
- `src/icons.tsx` — hand-drawn SVG icon set (no icon library), logo.
- `src/data.ts` — catalog (SKUs, categories, pay type `cod`/`prepay`), coupons, FAQ. Swap for API later.
- `src/store.tsx` — cart, coupon, auth (phone OTP mock), orders — persisted to localStorage.
- `src/seo.ts` — per-page title/meta/OG/canonical + JSON-LD (Organization, FAQ, Product, Breadcrumb).
- `src/components.tsx` — header, search preview, footer, product card, badges.
- `src/cart/` — cart dock (floating bubble + drawer/sheet panels) and cart-panel state.
- `src/pages/` — Home, Shop (catalog/PDP), Order (cart/checkout/confirm/track/login), and a 404 page.
- `public/sitemap.xml`, `public/robots.txt` — regenerate sitemap when SKUs change.

## Develop
```
cp .env.example .env
npm install
npm run dev
```
Demo: coupons `WELCOME10`, `STUDENT5`; OTP accepts any 4 digits. Checkout, SMS, payments, inventory reservation, and courier updates are not live. No actual money is collected.

## Design system
Tokens live at the top of `src/index.css` (`--color-ink`, `--color-paper`, `--color-sand`, `--color-brand`). Typeface: Inter (400–800) via Google Fonts with Noto Sans Bengali fallback for the ৳ glyph, tight display tracking. Icons: 24px grid, 1.7 stroke, from `src/icons.tsx`. Product imagery uses generated studio photos in `public/img` plus a few remote stock shots — replace all with real SKU photography before launch.

## Deploy (Vercel / Netlify / Cloudflare Pages)
1. Build command `npm run build`, output `dist`.
2. Set `VITE_SITE_URL` and `VITE_WHATSAPP_NUMBER` env vars.
3. SPA fallback so deep links work:
   - Netlify: `public/_redirects` → `/* /index.html 200`
   - Vercel: `vercel.json` → `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`
   - Cloudflare Pages: automatic.
4. For best SEO later, add prerendering (e.g. `vite-plugin-prerender`) or move to SSR when the backend lands.

## Backend hooks (next phase)
Replace localStorage in `store.tsx` with API calls: `POST /otp`, `POST /orders`, `GET /orders/:id?phone=`, bKash/Nagad payment gateway callbacks.

## Search

`src/search.ts` ranks the catalogue client-side against SKU, name, category, spec values and a curated alias table, so plain language works: "load shedding" finds the router UPS kit, "wifi board" finds the ESP32, "h4 bulb" finds the headlights. Ranking favours exact SKU matches, then name matches, then aliases and spec text, with lifts for a matching category, in-stock items and popular parts. An exact SKU query returns only that part, badged "Exact SKU".

`SmartSearch` in `src/components.tsx` renders the preview panel: product rows with thumbnail, price, stock and COD/advance badge, matched text highlighted, plus category shortcuts. With no query it shows recent searches (stored in `localStorage`), popular searches and a category browser. Arrow keys, Home/End, Enter and Escape work; `/` or Ctrl/Cmd+K focuses the field. Edit `POPULAR` and `ALIASES` in `src/search.ts` to tune suggestions and vocabulary.

## Motion and interaction

- **Hero carousel** (`src/hero.tsx`): product slides auto-advance every 4.6 seconds. Manage slides in Admin > Storefront; edit `SLIDE_MS` to change timing. Playback pauses on hover, keyboard focus, off-screen, or via the pause button. Arrow keys and swipe also work.
- **Dispatch countdown**: set the courier cutoff hour or disable the countdown in Admin > Storefront.
- **Shared helpers** (`src/motion.tsx`): scroll reveals, count-up numbers, the store-highlights ticker and the add-to-cart flight animation.
- **Reduced motion**: visitors who enable "reduce motion" on their device get instant transitions, no autoplay and a static ticker.

## Navigation behavior

- `src/router.tsx` keeps normal link semantics (including open-in-new-tab), handles direct URLs and hashes, and stores scroll/focus for each browser history entry. New pages render at the top immediately; Back/Forward and reload restore the position of the page you were on. There is no site-wide smooth scrolling or page translation.
- Catalog price, stock, COD, and sort selections are reflected in the URL, so results survive refresh and Back/Forward. The catalog uses the same search matching as the preview panel.
- Returning to a product with Back/Forward restores its gallery, quantity, tab, and scroll position. The home page retains its selected hero slide and trending tab. Checkout details are kept in `sessionStorage` only until the preview order is placed, so signing in or editing the cart does not discard the form.
- Product pages provide a contextual Back to results/cart/home control; the cart's Continue shopping action returns to the last browsing context. Order confirmation links straight into the local tracking lookup. Missing pages get a recoverable 404 instead of silently showing the home page.

## Admin Workspace

Open `/admin/orders` for the operational queue. The refreshed workspace separates Orders, Products, Storefront, Coupons, Checkout, Team, Activity Log, and Vault. Only permitted sections, command results, and mutation controls render for each role. Support sees only Orders and Products, with note-taking but no fulfillment or payment mutation controls.

Orders support inline status/payment capsules, filtered queues, 25/50/100-row pagination, selected/all-matching bulk updates with validation and skip reports, CSV export, and a desktop drawer/mobile dialog with previous/next navigation. Unsaved details are protected and order changes are recorded locally. Coupons have a dedicated list and editor with usage limits, BDT schedules, and live calculation preview.

See `docs/admin-operations.md` for the interaction rules, role matrix, and production backend requirements. The role selector and local persistence remain frontend demo features, not a security boundary. Server-side authentication, authorization, pagination, concurrency control, audit persistence, courier jobs, and payment reconciliation are still required before live use. Vault credential updates are disabled without a configured backend; no simulated successful secret writes occur.

`src/admin/admin.css` and `src/admin/ui.tsx` define the shared admin visual language. Fonts load from Google Fonts CDN with system fallbacks; product photos are JPEGs in `public/img/`.

## Cart Dock

The floating WhatsApp bubble is gone. Customers stay in the store:

- **Phone and tablet (<1024px):** a floating cart bubble appears once a product is in the cart. It opens a compact bottom sheet, and the page behind it is lightly blurred. The bubble is hidden while the cart is empty.
- **Desktop (≥1024px):** the header cart button opens the right-hand drawer; the floating bubble is not shown.
- Both surfaces list cart items with images, price, COD/advance badge and SKU. Quantity can be edited, items can be deleted, and checkout can be started without leaving the page. Escape, scrim taps and the close button dismiss the panel; focus returns to the control that opened it.
- Adding a product flies its thumbnail into the cart bubble, which then does a jump-pop settle animation. The same cart is reachable from the mobile bottom-nav cart tab and the full `/cart` page.
- `src/cart/cartPanel.tsx` owns the panel state and breakpoint; `src/cart/CartDock.tsx` renders the bubble and the two panel surfaces.

## Performance And Checks

- Search builds an index once per immutable product/category array pair and releases unused indexes through weak references. Admin edits replace those arrays, so updated products and aliases appear in search immediately.
- Analytics aggregates orders in one pass per date range. Shared currency and date formatters are reused rather than rebuilt for every table cell.
- Orders and dispatch mount only the layout for the current viewport; waiting orders and large batch lists are paginated. Toast messages update independently of the store, and only the visible hero countdown runs.
- The default hero is preloaded on a first home visit only. Other carousel images are warmed during idle time after load, except on data-saver or 2G connections. Local product photos have responsive 480px and 1024px WebP variants; `<picture>` retains the original JPEGs as fallbacks and keeps older saved image URLs working. The previously missing local Inter and taka fonts are included; the taka font is subset to the currency glyph.
- Run `node --test tests/*.test.mjs` for search and chart regression checks. Run `node scripts/benchmark.mjs` for repeatable synthetic search/analytics timings.
- The existing Vite single-file plugin includes all route code in one HTML file, so these changes reduce runtime work rather than splitting the storefront and admin into separate network chunks. Production hosting should compress and cache the output and static assets.
