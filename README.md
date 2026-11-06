# Jocta Enterprises

E-commerce storefront and future inventory management platform for **Jocta Enterprises** (printer toners, printer spare parts, consumables, and printers).

## Project Structure

- `shared/` (`@jocta/shared`) — Shared TypeScript types and Zod validation schemas (catalog filters, sorting, printer model queries, KES money validation, API response types).
- `backend/` (`@jocta/backend`) — Express 5 + TypeScript REST API, Drizzle ORM schema, transactional SQL migration runner, and idempotent development seed script.
- `frontend/` (`@jocta/frontend`) — React 18 + TypeScript + Vite + Tailwind CSS v3 with Bright Neomorphism design tokens, Homepage, Shop Catalogue, Product Detail Page, and Printer Compatibility Finder.

## Brand Logo Asset Location

Place the official Jocta Enterprises circular red logo image at:
```
frontend/public/logo.png
```
`JoctaLogo.tsx` automatically renders `/logo.png` when present and falls back to a solid-red circular emblem (`#E9252A`) until the file is added.

## Prerequisites

- **Node.js** 20+ (verified on Node.js 24)
- **npm** 10+
- **PostgreSQL** 15+ (for local database operations)

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure local environment variables:**
   Copy `.env.example` to `.env` and update `DATABASE_URL` with your local PostgreSQL credentials:
   ```bash
   cp .env.example .env
   ```

3. **Create the local PostgreSQL database:**
   ```sql
   CREATE DATABASE jocta_dev;
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Optional — Seed or remove demonstration catalogue data:**
   All demonstration records are explicitly prefixed with `[DEMO]` / `demo-` / `DEMO-` and use `ON CONFLICT DO NOTHING` so real client data is never overwritten.
   ```bash
   # Insert demonstration categories, brands, printer models, and products
   npm run db:seed

   # Safely remove ONLY demonstration records (slug LIKE 'demo-%' / sku LIKE 'DEMO-%')
   npm run db:seed:clean
   ```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev:backend` | Start the Express 5 backend API in watch mode (`http://localhost:4000`) |
| `npm run dev:frontend` | Start the Vite React frontend dev server (`http://localhost:5173`) |
| `npm run build` | Run composite TypeScript type-checking and build the production frontend bundle into `dist/` |
| `npm run typecheck` | Run TypeScript project reference checks (`tsc -b`) across `shared`, `frontend`, and `backend` |
| `npm test` | Run automated unit and API tests via Vitest |
| `npm run db:migrate` | Apply pending SQL migrations in `backend/src/db/migrations/` |
| `npm run db:verify` | Verify PostgreSQL connection and list applied migrations |
| `npm run db:seed` | Insert idempotent `[DEMO]` catalogue records for local development |
| `npm run db:seed:clean` | Remove all `[DEMO]` catalogue records safely |
| `npm run db:generate` | Generate Drizzle SQL migrations from `backend/src/db/schema.ts` |

## Inventory

The inventory system is a separate workspace at `/inventory`, apart from the catalogue admin panel at `/admin`. Both use the same admin Google sign-in and link to each other. It reads and writes the same `stock_quantity` columns the storefront uses, so there is no second copy of stock to drift.

- **Stock items** — every product without variants, and every variant (e.g. Original vs Compatible) of products that have them, is counted separately. A product with variants shows the total of its active variants on the storefront.
- **Stock ledger** — every change writes a row to `stock_movements` with the reason, the resulting balance, the staff email and an optional reference, so the latest balance always matches the quantity on hand. Stock edited on the product form is recorded too (as an opening balance or a correction).
- **Screens** — Overview (stock value at cost and retail, low/out-of-stock, 14-day activity, 30-day sales and profit), Stock Levels (adjust, reorder level, cost price, CSV export), Receive Stock (multi-line supplier deliveries), Stock Take (physical count, only differences recorded), Stock History, Sales (record walk-in / WhatsApp / phone sales with M-Pesa, cash, bank, card or credit; void returns stock) and a monthly Sales Report (revenue, gross profit, channels, payment methods, top products).
- **Costs stay private** — cost prices live in `stock_item_settings`, never on the product rows the public catalogue returns.
- **Safety** — each operation is one transaction with row locks, so a multi-line receipt or sale lands completely or not at all, and two people selling the last unit at the same time cannot take stock below zero. Days are counted in Nairobi time.

Run `npm run db:migrate` to apply `0002_inventory.sql`; it records an opening balance for stock already on hand.
