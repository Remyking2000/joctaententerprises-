import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── 1. Categories ────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_categories_active_sort").on(table.isActive, table.sortOrder),
  ],
);

// ── 2. Brands ────────────────────────────────────────────────────────────────

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull().unique(),
    logoUrl: text("logo_url").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_brands_active").on(table.isActive)],
);

// ── 3. Printer Models (for normalized toner/part compatibility) ──────────────

export const printerModels = pgTable(
  "printer_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    series: text("series"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_printer_models_brand").on(table.brandId),
    index("idx_printer_models_name").on(table.name),
  ],
);

// ── 4. Products ──────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    sku: text("sku").notNull().unique(),
    oemPartNumber: text("oem_part_number"),
    productType: text("product_type").notNull().default("toner"),
    condition: text("condition").notNull().default("new"),
    authenticity: text("authenticity").notNull().default("original"),
    pageYield: integer("page_yield"),
    color: text("color"),
    priceKes: numeric("price_kes", { precision: 12, scale: 2 }).notNull(),
    comparePriceKes: numeric("compare_price_kes", { precision: 12, scale: 2 }),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    isPublished: boolean("is_published").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_products_category").on(table.categoryId),
    index("idx_products_brand").on(table.brandId),
    index("idx_products_oem_part").on(table.oemPartNumber),
    index("idx_products_published_featured").on(table.isPublished, table.isFeatured),
    index("idx_products_type_authenticity").on(table.productType, table.authenticity),
    check("chk_products_price_non_negative", sql`${table.priceKes} >= 0`),
    check(
      "chk_products_compare_price_non_negative",
      sql`${table.comparePriceKes} IS NULL OR ${table.comparePriceKes} >= 0`,
    ),
    check("chk_products_stock_non_negative", sql`${table.stockQuantity} >= 0`),
  ],
);

// ── 5. Product Variants (Original vs Compatible / Standard vs XL Yield) ──────

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    oemPartNumber: text("oem_part_number"),
    authenticity: text("authenticity").notNull().default("original"),
    pageYield: integer("page_yield"),
    priceKes: numeric("price_kes", { precision: 12, scale: 2 }).notNull(),
    comparePriceKes: numeric("compare_price_kes", { precision: 12, scale: 2 }),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_product_variants_product").on(table.productId),
    check("chk_variants_price_non_negative", sql`${table.priceKes} >= 0`),
    check("chk_variants_stock_non_negative", sql`${table.stockQuantity} >= 0`),
  ],
);

// ── 6. Product <-> Printer Model Compatibility (Many-to-Many) ────────────────

export const productPrinterCompatibility = pgTable(
  "product_printer_compatibility",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    printerModelId: uuid("printer_model_id")
      .notNull()
      .references(() => printerModels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "pk_product_printer_compatibility",
      columns: [table.productId, table.printerModelId],
    }),
    index("idx_compat_printer_model").on(table.printerModelId),
  ],
);

// ── 7. Inventory (migration 0002_inventory.sql) ──────────────────────────────
// Queried with raw SQL in services/inventory.service.ts (row locks need a
// dedicated client); declared here so the schema stays the single reference.

export const stockItemSettings = pgTable("stock_item_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
  }),
  reorderLevel: integer("reorder_level").notNull().default(3),
  costPriceKes: numeric("cost_price_kes", { precision: 12, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull().default(""),
    variantName: text("variant_name"),
    sku: text("sku").notNull().default(""),
    delta: integer("delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    note: text("note").notNull().default(""),
    unitCostKes: numeric("unit_cost_kes", { precision: 12, scale: 2 }),
    reference: text("reference").notNull().default(""),
    userEmail: text("user_email").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_stock_movements_created").on(table.createdAt)],
);

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  channel: text("channel").notNull().default("walk_in"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("completed"),
  subtotalKes: numeric("subtotal_kes", { precision: 12, scale: 2 }).notNull().default("0"),
  discountKes: numeric("discount_kes", { precision: 12, scale: 2 }).notNull().default("0"),
  totalKes: numeric("total_kes", { precision: 12, scale: 2 }).notNull().default("0"),
  createdBy: text("created_by").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  voidReason: text("void_reason"),
  voidedBy: text("voided_by"),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull().default(""),
  variantName: text("variant_name"),
  sku: text("sku").notNull().default(""),
  quantity: integer("quantity").notNull(),
  listPriceKes: numeric("list_price_kes", { precision: 12, scale: 2 }).notNull(),
  unitPriceKes: numeric("unit_price_kes", { precision: 12, scale: 2 }).notNull(),
  unitCostKes: numeric("unit_cost_kes", { precision: 12, scale: 2 }),
  lineTotalKes: numeric("line_total_kes", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
