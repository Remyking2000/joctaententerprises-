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
