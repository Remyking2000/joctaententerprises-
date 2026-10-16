-- ============================================================================
-- Migration: 0001_initial_catalog.sql
-- Purpose: Foundational catalog tables for Jocta Enterprises
-- Tables: categories, brands, printer_models, products, product_variants,
--         product_printer_compatibility
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_active_sort ON categories (is_active, sort_order);

-- 2. Brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brands_active ON brands (is_active);

-- 3. Printer Models (Normalized lookup for toner & part compatibility)
CREATE TABLE printer_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands (id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  series TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_printer_models_brand ON printer_models (brand_id);
CREATE INDEX idx_printer_models_name ON printer_models (name);

-- 4. Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES brands (id) ON DELETE SET NULL,
  sku TEXT NOT NULL UNIQUE,
  oem_part_number TEXT,
  product_type TEXT NOT NULL DEFAULT 'toner'
    CHECK (product_type IN ('toner', 'ink', 'drum', 'printer_part', 'consumable', 'printer')),
  condition TEXT NOT NULL DEFAULT 'new'
    CHECK (condition IN ('new', 'refurbished')),
  authenticity TEXT NOT NULL DEFAULT 'original'
    CHECK (authenticity IN ('original', 'compatible', 'both')),
  page_yield INTEGER CHECK (page_yield IS NULL OR page_yield > 0),
  color TEXT,
  price_kes NUMERIC(12, 2) NOT NULL CHECK (price_kes >= 0),
  compare_price_kes NUMERIC(12, 2) CHECK (compare_price_kes IS NULL OR compare_price_kes >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand_id);
CREATE INDEX idx_products_oem_part ON products (oem_part_number);
CREATE INDEX idx_products_published_featured ON products (is_published, is_featured);
CREATE INDEX idx_products_type_authenticity ON products (product_type, authenticity);

-- 5. Product Variants (Supports selectable Original vs. Compatible or Standard vs. XL options)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  oem_part_number TEXT,
  authenticity TEXT NOT NULL DEFAULT 'original'
    CHECK (authenticity IN ('original', 'compatible')),
  page_yield INTEGER CHECK (page_yield IS NULL OR page_yield > 0),
  price_kes NUMERIC(12, 2) NOT NULL CHECK (price_kes >= 0),
  compare_price_kes NUMERIC(12, 2) CHECK (compare_price_kes IS NULL OR compare_price_kes >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product ON product_variants (product_id);

-- 6. Product <-> Printer Model Compatibility (Normalized Many-to-Many Join Table)
CREATE TABLE product_printer_compatibility (
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  printer_model_id UUID NOT NULL REFERENCES printer_models (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_product_printer_compatibility PRIMARY KEY (product_id, printer_model_id)
);

CREATE INDEX idx_compat_printer_model ON product_printer_compatibility (printer_model_id);
