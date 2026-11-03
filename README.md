# Glowing Space BD — Fullstack E-Commerce & Electronics Catalog

Tested 18650 cells, charging modules, car LED lights, and robotics components for makers, students, and engineers in Bangladesh. Built with **Next.js (App Router)**, **React 19**, **Tailwind CSS v4**, and **PostgreSQL** via **Drizzle ORM**.

---

## ⚡ Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+ / v22+
- **npm** or **pnpm**
- **PostgreSQL** (local service or Docker)

### 2. Clone & Install
```bash
git clone https://github.com/enoch77-max/GlowingSpaceBD.git
cd GlowingSpaceBD
npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Contents of `.env`:
```env
# Default points to local PostgreSQL (e.g. via docker-compose up -d)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# Optional storefront settings
NEXT_PUBLIC_SITE_URL=https://glowingspace.com.bd
NEXT_PUBLIC_WHATSAPP_NUMBER=8801700000000
```
> **Zero-Config Build Resiliency**: `src/db/index.ts` includes a safe fallback so running `npm run build` or typechecking in environments without a configured `DATABASE_URL` will never crash or fail during static page generation.

### 4. Start PostgreSQL Database
You can use the included `docker-compose.yml`:
```bash
docker-compose up -d
```
Or start your local PostgreSQL instance on port `5432` with user `postgres`, password `postgres`, and database `app_db`.

### 5. Push Schema to Database
Initialize the tables (`store_orders`, `store_state`) without needing migration files:
```bash
npx drizzle-kit push
```

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js development server at `localhost:3000` |
| `npm run build` | Compiles and builds production-optimized bundle |
| `npm run start` | Runs the compiled production server |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run lint` | Runs ESLint checks |
| `npx tsx --test tests/*.test.mjs` | Executes the unit and integration test suite |
| `npx tsx scripts/verify-inventory-api.mjs` | Runs concurrent order and database verification against live server |

---

## 🏗 Key Features & Architecture

### 1. Inventory & Variant Engine (`src/catalog/inventory.ts`, `src/cart/variants.ts`)
- **Packs · Shared Pieces**: A single physical pool (e.g. 50 cells) automatically calculates available quantities across pack variants (1-cell: 50, 3-cell: 16, 5-cell: 10, 10-cell: 5). Purchasing two 10-cell packs deducts 20 loose cells and recalculates all pack availability immediately.
- **Independent Variant Stock**: For products with distinct hardware variants (e.g., 5 W, 10 W, 15 W modules), each variant manages its own separate stock.
- **One Shared Stock Pool**: For variants that each consume one item from the same general pool.
- **Independent Quantity & Variant Selection**: Choosing a 3-piece variant does not force the cart quantity to 3; quantity represents the number of packs, and totals are computed accurately (`3 pcs × 2 packs = 6 pcs`).

### 2. Verified Brand Marks (`src/icons.tsx`)
- Official, unclipped vector SVGs for **bKash** and **Nagad**, correctly proportioned without text clipping or aspect-ratio distortion.

### 3. Location-Aware Delivery & Clean PDP Layout
- **Dynamic Delivery Charges**: Automatically detects visitor's region (Dhaka `৳70` vs. Outside Dhaka `৳130`) via IP or prior address choices. Pre-selects the correct delivery area at checkout.
- **Zero-Clutter Visual Hierarchy**: Replaced cluttered overlays with clean, organized labels below the image.
- **Product Authenticity ("Original" Capsule)**: Admin toggle to mark authentic goods with an "Original" badge; non-original products display admin-configured quality/compatibility notes in the details & specifications tabs.

### 4. Admin Management & Security (`src/admin/`, `src/server/`)
- **Protected API Routes**: Admin actions (catalog updates, status changes, order cancellations, dispatch batches) require a server-backed authenticated session (`/api/admin/session`).
- **Unsaved Changes Guard**: Prevents accidental loss of work in the product editor with "Unsaved changes" indicator, disabled save button when clean, and explicit discard confirmation dialogs.
- **Transactional Atomic Checkout**: Prevents overselling using PostgreSQL row locks (`SELECT ... FOR UPDATE`), with idempotent order submission to protect against duplicate deductions.
- **Customer Privacy**: Order tracking requires both order ID and mobile number; internal staff notes, costs, and sensitive courier errors are stripped from public responses.

---

## 📁 Project Structure

```
├── .env.example             # Documented environment template
├── docker-compose.yml       # Local PostgreSQL database container
├── drizzle.config.json      # Drizzle ORM configuration
├── package.json
├── tsconfig.json
├── next.config.ts
├── public/                  # Web assets, images, and fonts
├── scripts/
│   └── verify-inventory-api.mjs # Concurrency & checkout API test script
├── tests/
│   ├── inventory.test.mjs   # Variant and stock calculation tests
│   ├── pack-cart.test.mjs   # Cart and pack size integration tests
│   └── audit-fixes.test.mjs # Security & regression tests
└── src/
    ├── app/                 # Next.js App Router (pages and API routes)
    ├── admin/               # Admin console sections, RBAC, workflows
    ├── cart/                # Cart dock, drawer, and variant calculations
    ├── catalog/             # Inventory rules, variant stock math, validation
    ├── db/                  # Drizzle ORM client and database schema
    ├── hooks/               # Custom hooks (delivery region, mobile layout)
    ├── server/              # Server-side catalog and session helpers
    ├── views/               # Views for Home, Shop, Order, Admin, NotFound
    └── components.tsx       # Shared UI components, header, footer, cards
```

---

## 🚀 Deployment

1. Set `DATABASE_URL` in your hosting environment (e.g. Supabase, Neon, AWS RDS, Railway, Render, etc.).
2. Run `npx drizzle-kit push` to create or update the tables.
3. Run `npm run build` and `npm run start`.
