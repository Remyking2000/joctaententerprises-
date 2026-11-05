-- ============================================================================
-- Migration: 0002_inventory.sql
-- Purpose: Inventory management for Jocta Enterprises
-- Tables: stock_item_settings, stock_movements, sales, sale_items
--
-- products.stock_quantity and product_variants.stock_quantity stay the single
-- source of truth for "how many do we have" — the storefront, the admin panel
-- and the inventory screens all read those same columns. This migration adds
-- the history behind those numbers, per-item costing and reorder levels, and
-- in-store / phone / WhatsApp sales that deduct stock.
-- ============================================================================

-- 1. Per-item inventory settings
--
-- Kept out of the products table on purpose: the public catalogue API returns
-- whole product rows, and what Jocta pays per unit must never reach customers.
-- A "stock item" is a product without variants (variant_id IS NULL) or one
-- variant of a product that has them.
CREATE TABLE stock_item_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  reorder_level INTEGER NOT NULL DEFAULT 3,
  cost_price_kes NUMERIC(12, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_stock_settings_reorder_non_negative CHECK (reorder_level >= 0),
  CONSTRAINT chk_stock_settings_cost_non_negative CHECK (cost_price_kes IS NULL OR cost_price_kes >= 0)
);

CREATE UNIQUE INDEX uq_stock_settings_product
  ON stock_item_settings (product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX uq_stock_settings_variant
  ON stock_item_settings (variant_id) WHERE variant_id IS NOT NULL;

-- 2. Stock movement ledger
--
-- Every change to a stock quantity writes one row here, including the
-- resulting balance, so the newest balance_after for an item always equals its
-- stock_quantity. Product/variant links are SET NULL on delete and the names
-- and SKU are snapshotted, so deleting a discontinued product does not erase
-- the record of stock that was received, sold or written off while it existed.
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  variant_name TEXT,
  sku TEXT NOT NULL DEFAULT '',
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  unit_cost_kes NUMERIC(12, 2),
  reference TEXT NOT NULL DEFAULT '',
  user_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_stock_movements_delta_non_zero CHECK (delta <> 0),
  CONSTRAINT chk_stock_movements_balance_non_negative CHECK (balance_after >= 0),
  CONSTRAINT chk_stock_movements_reason CHECK (reason IN (
    'opening', 'receive', 'sale', 'sale_void', 'return',
    'damage', 'internal_use', 'correction', 'stock_take'
  ))
);

CREATE INDEX idx_stock_movements_product_created
  ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_stock_movements_variant_created
  ON stock_movements (variant_id, created_at DESC) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_stock_movements_created
  ON stock_movements (created_at DESC);
CREATE INDEX idx_stock_movements_reference
  ON stock_movements (reference) WHERE reference <> '';

-- 3. Sales recorded by staff (walk-in, WhatsApp, phone, ...)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'walk_in',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',
  subtotal_kes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_kes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_kes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  void_reason TEXT,
  voided_by TEXT,
  voided_at TIMESTAMPTZ,
  CONSTRAINT chk_sales_status CHECK (status IN ('completed', 'voided')),
  CONSTRAINT chk_sales_channel CHECK (channel IN ('walk_in', 'whatsapp', 'phone', 'website', 'other')),
  CONSTRAINT chk_sales_payment CHECK (payment_method IN ('cash', 'mpesa', 'bank_transfer', 'card', 'credit')),
  CONSTRAINT chk_sales_totals_non_negative CHECK (subtotal_kes >= 0 AND total_kes >= 0)
);

CREATE INDEX idx_sales_created ON sales (created_at DESC);
CREATE INDEX idx_sales_status_created ON sales (status, created_at DESC);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  variant_name TEXT,
  sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL,
  list_price_kes NUMERIC(12, 2) NOT NULL,
  unit_price_kes NUMERIC(12, 2) NOT NULL,
  unit_cost_kes NUMERIC(12, 2),
  line_total_kes NUMERIC(12, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT chk_sale_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_sale_items_prices_non_negative CHECK (list_price_kes >= 0 AND unit_price_kes >= 0)
);

CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);

-- 4. Opening balances
--
-- Stock that is already on the shelf gets one 'opening' movement per item so
-- the ledger reconciles with stock_quantity from its very first row.
-- Products with variants are counted per variant; the product row itself only
-- holds their total.
INSERT INTO stock_movements (product_id, product_name, sku, delta, balance_after, reason, note)
SELECT p.id, p.name, p.sku, p.stock_quantity, p.stock_quantity, 'opening',
       'Opening balance recorded when inventory tracking was enabled'
FROM products p
WHERE p.stock_quantity > 0
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id);

INSERT INTO stock_movements (product_id, variant_id, product_name, variant_name, sku, delta, balance_after, reason, note)
SELECT v.product_id, v.id, p.name, v.name, v.sku, v.stock_quantity, v.stock_quantity, 'opening',
       'Opening balance recorded when inventory tracking was enabled'
FROM product_variants v
JOIN products p ON p.id = v.product_id
WHERE v.stock_quantity > 0;
