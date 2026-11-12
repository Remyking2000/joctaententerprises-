/**
 * Inventory: stock levels, the stock movement ledger, receiving, stock takes,
 * and sales recorded by staff.
 *
 * Stock quantities live on the SAME products / product_variants rows the
 * storefront reads; nothing here keeps a second copy that could drift. What
 * this module guarantees is that no quantity changes without a matching
 * ledger row saying who changed it, why, and to what balance.
 *
 * Storage follows the rest of the backend: PostgreSQL, or an in-memory
 * dataset when automated tests install one. Both sit behind the small
 * `InventoryStore` interface below so every business rule is written once.
 * Each write runs as one transaction — in PostgreSQL with row locks, in
 * memory against a copy that is only kept if the whole operation succeeds.
 */
import { randomUUID } from "node:crypto";
import type pg from "pg";
import {
  DEFAULT_REORDER_LEVEL,
  stockItemKey,
  type BulkStockResult,
  type CreateSaleInput,
  type InventoryDashboard,
  type ManualAdjustReason,
  type ProductType,
  type ReceiveStockInput,
  type Sale,
  type SaleLine,
  type SalesQuery,
  type SalesReport,
  type SalesReportQuery,
  type StockAdjustInput,
  type StockItem,
  type StockMovement,
  type StockMovementsQuery,
  type StockReason,
  type StockSettingsInput,
  type StockTakeInput,
  type VoidSaleInput,
} from "@jocta/shared";
import { getPool } from "../config/db.js";
import { AppError } from "../middleware/error.middleware.js";
import {
  getActiveInMemoryDataset,
  saveInMemoryDataset,
  type CatalogDataset,
} from "./catalog.service.js";
import {
  buildActivity,
  buildSalesReport,
  computeInventoryStats,
  dateRangeToInstants,
  fromCents,
  itemLabel,
  makeReference,
  monthRange,
  nairobiDate,
  normalizeKes,
  nairobiDayStart,
  addDays,
  resolveAdjustment,
  stockStatus,
  summarizeSales,
  toCents,
} from "./inventory.logic.js";

// ── Storage contract ─────────────────────────────────────────────────────────

interface ItemRef {
  productId: string;
  variantId?: string | null;
}

/** A stock item read inside a transaction (locked in PostgreSQL). */
interface LockedItem {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  stockQuantity: number;
  priceKes: string;
  costPriceKes: string | null;
  reorderLevel: number;
  /** True when a product has variants, so stock must be moved per variant. */
  requiresVariant: boolean;
}

type NewMovement = Omit<StockMovement, "id" | "createdAt">;

type NewSale = Omit<
  Sale,
  "id" | "createdAt" | "status" | "voidReason" | "voidedBy" | "voidedAt" | "lines"
> & { lines: Omit<SaleLine, "id">[] };

interface MovementFilter {
  productId?: string;
  variantId?: string;
  reason?: StockReason;
  reference?: string;
  search?: string;
  since?: Date;
  limit: number;
}

interface SalesFilter {
  start?: Date;
  end?: Date;
  status?: "completed" | "voided";
}

interface StockTx {
  findItem(ref: ItemRef): Promise<LockedItem | null>;
  setQuantity(item: LockedItem, quantity: number): Promise<void>;
  setPrice(item: LockedItem, priceKes: string): Promise<void>;
  saveSettings(
    item: LockedItem,
    patch: { reorderLevel?: number; costPriceKes?: string | null },
  ): Promise<void>;
  addMovement(movement: NewMovement): Promise<StockMovement>;
  addSale(sale: NewSale): Promise<Sale>;
  findSale(id: string): Promise<Sale | null>;
  markSaleVoided(id: string, reason: string, by: string): Promise<Sale>;
}

interface InventoryStore {
  transaction<T>(fn: (tx: StockTx) => Promise<T>): Promise<T>;
  listItems(): Promise<StockItem[]>;
  listMovements(filter: MovementFilter): Promise<StockMovement[]>;
  listSales(filter: SalesFilter): Promise<Sale[]>;
}

// ── Shared composition ───────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  oemPartNumber: string | null;
  productType: ProductType;
  thumbnailUrl: string;
  isPublished: boolean;
  priceKes: string;
  stockQuantity: number;
  categoryName: string | null;
  brandName: string | null;
}

interface VariantRow {
  id: string;
  productId: string;
  name: string;
  sku: string;
  oemPartNumber: string | null;
  priceKes: string;
  stockQuantity: number;
  isActive: boolean;
}

interface SettingsRow {
  reorderLevel: number;
  costPriceKes: string | null;
}

/**
 * Builds the stock item list: one row per product without variants, and one
 * per variant for products that have them.
 */
function composeStockItems(
  productRows: ProductRow[],
  variantRows: VariantRow[],
  settings: Map<string, SettingsRow>,
  lastMovement: Map<string, string>,
): StockItem[] {
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.productId) ?? [];
    list.push(v);
    variantsByProduct.set(v.productId, list);
  }

  const items: StockItem[] = [];
  for (const p of productRows) {
    const variants = variantsByProduct.get(p.id) ?? [];
    const base = {
      productId: p.id,
      productName: p.name,
      productType: p.productType,
      categoryName: p.categoryName,
      brandName: p.brandName,
      thumbnailUrl: p.thumbnailUrl,
      isPublished: p.isPublished,
    };

    const rows =
      variants.length === 0
        ? [
            {
              variantId: null,
              variantName: null,
              sku: p.sku,
              oemPartNumber: p.oemPartNumber,
              priceKes: p.priceKes,
              stockQuantity: p.stockQuantity,
              isActive: true,
            },
          ]
        : variants.map((v) => ({
            variantId: v.id,
            variantName: v.name,
            sku: v.sku,
            oemPartNumber: v.oemPartNumber ?? p.oemPartNumber,
            priceKes: v.priceKes,
            stockQuantity: v.stockQuantity,
            isActive: v.isActive,
          }));

    for (const r of rows) {
      const key = stockItemKey(p.id, r.variantId);
      const s = settings.get(key);
      const reorderLevel = s?.reorderLevel ?? DEFAULT_REORDER_LEVEL;
      items.push({
        ...base,
        ...r,
        key,
        reorderLevel,
        costPriceKes: s?.costPriceKes ?? null,
        status: stockStatus(r.stockQuantity, reorderLevel),
        lastMovementAt: lastMovement.get(key) ?? null,
      });
    }
  }

  return items.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      (a.variantName ?? "").localeCompare(b.variantName ?? ""),
  );
}

function matchesSearch(m: StockMovement, search: string): boolean {
  const q = search.toLowerCase();
  return [m.productName, m.variantName ?? "", m.sku, m.note, m.reference, m.userEmail]
    .some((field) => field.toLowerCase().includes(q));
}

// ── In-memory store (automated tests) ──────────────────────────────

interface InventoryState {
  settings: Record<string, SettingsRow>;
  movements: StockMovement[];
  sales: Sale[];
}

type InventoryDataset = CatalogDataset & { inventory?: InventoryState };

function memoryItems(ds: InventoryDataset): StockItem[] {
  const inv = ds.inventory;
  const productRows: ProductRow[] = ds.products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    oemPartNumber: p.oemPartNumber,
    productType: p.productType,
    thumbnailUrl: p.thumbnailUrl,
    isPublished: p.isPublished,
    priceKes: p.priceKes,
    stockQuantity: p.stockQuantity,
    categoryName: ds.categories.find((c) => c.id === p.categoryId)?.name ?? null,
    brandName: p.brandId
      ? ds.brands.find((b) => b.id === p.brandId)?.name ?? null
      : null,
  }));
  const variantRows: VariantRow[] = [...ds.variants]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((v) => ({
      id: v.id,
      productId: v.productId,
      name: v.name,
      sku: v.sku,
      oemPartNumber: v.oemPartNumber,
      priceKes: v.priceKes,
      stockQuantity: v.stockQuantity,
      isActive: v.isActive,
    }));
  const settings = new Map(Object.entries(inv?.settings ?? {}));
  const last = new Map<string, string>();
  for (const m of inv?.movements ?? []) {
    if (!m.productId) continue;
    const key = stockItemKey(m.productId, m.variantId);
    const prev = last.get(key);
    if (!prev || m.createdAt > prev) last.set(key, m.createdAt);
  }
  return composeStockItems(productRows, variantRows, settings, last);
}

/**
 * Gives a dataset its inventory state the first time it is needed, with one
 * opening movement per item already holding stock so the ledger reconciles
 * with the quantities from its first row.
 */
function ensureInventoryState(ds: InventoryDataset): InventoryState {
  if (ds.inventory) return ds.inventory;
  const now = new Date().toISOString();
  const state: InventoryState = { settings: {}, movements: [], sales: [] };
  ds.inventory = state;
  for (const item of memoryItems(ds)) {
    if (item.stockQuantity <= 0) continue;
    state.movements.push({
      id: randomUUID(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      delta: item.stockQuantity,
      balanceAfter: item.stockQuantity,
      reason: "opening",
      note: "Opening balance recorded when inventory tracking was enabled",
      unitCostKes: null,
      reference: "",
      userEmail: "",
      createdAt: now,
    });
  }
  return state;
}

/** Newest first; ties keep the most recently recorded first. */
function newestFirst<T extends { createdAt: string }>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => b.row.createdAt.localeCompare(a.row.createdAt) || b.index - a.index)
    .map(({ row }) => row);
}

class MemoryStockTx implements StockTx {
  constructor(private readonly ds: InventoryDataset) {}

  private get state(): InventoryState {
    return ensureInventoryState(this.ds);
  }

  async findItem(ref: ItemRef): Promise<LockedItem | null> {
    const product = this.ds.products.find((p) => p.id === ref.productId);
    if (!product) return null;
    const variants = this.ds.variants.filter((v) => v.productId === product.id);
    const variant = ref.variantId
      ? variants.find((v) => v.id === ref.variantId)
      : undefined;
    if (ref.variantId && !variant) return null;

    const key = stockItemKey(product.id, variant?.id);
    const s = this.state.settings[key];
    return {
      key,
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantName: variant?.name ?? null,
      sku: variant?.sku ?? product.sku,
      stockQuantity: variant ? variant.stockQuantity : product.stockQuantity,
      priceKes: variant?.priceKes ?? product.priceKes,
      costPriceKes: s?.costPriceKes ?? null,
      reorderLevel: s?.reorderLevel ?? DEFAULT_REORDER_LEVEL,
      requiresVariant: !variant && variants.length > 0,
    };
  }

  async setQuantity(item: LockedItem, quantity: number): Promise<void> {
    const now = new Date().toISOString();
    const product = this.ds.products.find((p) => p.id === item.productId);
    if (!product) return;
    if (item.variantId) {
      const variant = this.ds.variants.find((v) => v.id === item.variantId);
      if (variant) variant.stockQuantity = quantity;
      product.stockQuantity = this.ds.variants
        .filter((v) => v.productId === product.id && v.isActive)
        .reduce((sum, v) => sum + v.stockQuantity, 0);
    } else {
      product.stockQuantity = quantity;
    }
    product.updatedAt = now;
  }

  async setPrice(item: LockedItem, priceKes: string): Promise<void> {
    const now = new Date().toISOString();
    const product = this.ds.products.find((p) => p.id === item.productId);
    if (!product) return;
    if (item.variantId) {
      const variant = this.ds.variants.find((v) => v.id === item.variantId);
      if (variant) variant.priceKes = priceKes;
    } else {
      product.priceKes = priceKes;
    }
    item.priceKes = priceKes;
    product.updatedAt = now;
  }

  async saveSettings(
    item: LockedItem,
    patch: { reorderLevel?: number; costPriceKes?: string | null },
  ): Promise<void> {
    const current = this.state.settings[item.key] ?? {
      reorderLevel: DEFAULT_REORDER_LEVEL,
      costPriceKes: null,
    };
    this.state.settings[item.key] = {
      reorderLevel: patch.reorderLevel ?? current.reorderLevel,
      costPriceKes:
        patch.costPriceKes !== undefined ? patch.costPriceKes : current.costPriceKes,
    };
  }

  async addMovement(movement: NewMovement): Promise<StockMovement> {
    const row: StockMovement = {
      ...movement,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.state.movements.push(row);
    return row;
  }

  async addSale(sale: NewSale): Promise<Sale> {
    const row: Sale = {
      ...sale,
      id: randomUUID(),
      status: "completed",
      createdAt: new Date().toISOString(),
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
      lines: sale.lines.map((l) => ({ ...l, id: randomUUID() })),
    };
    this.state.sales.push(row);
    return row;
  }

  async findSale(id: string): Promise<Sale | null> {
    return this.state.sales.find((s) => s.id === id) ?? null;
  }

  async markSaleVoided(id: string, reason: string, by: string): Promise<Sale> {
    const sale = this.state.sales.find((s) => s.id === id);
    if (!sale) throw new AppError(404, "NOT_FOUND", "Sale not found.");
    sale.status = "voided";
    sale.voidReason = reason;
    sale.voidedBy = by;
    sale.voidedAt = new Date().toISOString();
    return sale;
  }
}

class MemoryInventoryStore implements InventoryStore {
  constructor(private readonly ds: InventoryDataset) {
    ensureInventoryState(ds);
  }

  async transaction<T>(fn: (tx: StockTx) => Promise<T>): Promise<T> {
    // Work on a copy and only keep it if everything succeeded, so a failed
    // line in a receipt or sale leaves nothing half-applied.
    const draft = structuredClone(this.ds) as InventoryDataset;
    const result = await fn(new MemoryStockTx(draft));
    Object.assign(this.ds, draft);
    saveInMemoryDataset(this.ds);
    return result;
  }

  async listItems(): Promise<StockItem[]> {
    return memoryItems(this.ds);
  }

  async listMovements(filter: MovementFilter): Promise<StockMovement[]> {
    const since = filter.since?.toISOString();
    const rows = ensureInventoryState(this.ds).movements.filter(
      (m) =>
        (!filter.productId || m.productId === filter.productId) &&
        (!filter.variantId || m.variantId === filter.variantId) &&
        (!filter.reason || m.reason === filter.reason) &&
        (!filter.reference || m.reference === filter.reference) &&
        (!since || m.createdAt >= since) &&
        (!filter.search || matchesSearch(m, filter.search)),
    );
    return newestFirst(rows).slice(0, filter.limit);
  }

  async listSales(filter: SalesFilter): Promise<Sale[]> {
    const start = filter.start?.toISOString();
    const end = filter.end?.toISOString();
    const rows = ensureInventoryState(this.ds).sales.filter(
      (s) =>
        (!start || s.createdAt >= start) &&
        (!end || s.createdAt < end) &&
        (!filter.status || s.status === filter.status),
    );
    return newestFirst(rows);
  }
}

// ── PostgreSQL store ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

function mapMovement(r: any): StockMovement {
  return {
    id: r.id,
    productId: r.product_id,
    variantId: r.variant_id,
    productName: r.product_name,
    variantName: r.variant_name,
    sku: r.sku,
    delta: Number(r.delta),
    balanceAfter: Number(r.balance_after),
    reason: r.reason,
    note: r.note,
    unitCostKes: r.unit_cost_kes,
    reference: r.reference,
    userEmail: r.user_email,
    createdAt: iso(r.created_at)!,
  };
}

function mapSale(r: any, lines: any[]): Sale {
  return {
    id: r.id,
    reference: r.reference,
    channel: r.channel,
    paymentMethod: r.payment_method,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    note: r.note,
    status: r.status,
    subtotalKes: r.subtotal_kes,
    discountKes: r.discount_kes,
    totalKes: r.total_kes,
    createdBy: r.created_by,
    createdAt: iso(r.created_at)!,
    voidReason: r.void_reason,
    voidedBy: r.voided_by,
    voidedAt: iso(r.voided_at),
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.product_id,
      variantId: l.variant_id,
      productName: l.product_name,
      variantName: l.variant_name,
      sku: l.sku,
      quantity: Number(l.quantity),
      listPriceKes: l.list_price_kes,
      unitPriceKes: l.unit_price_kes,
      unitCostKes: l.unit_cost_kes,
      lineTotalKes: l.line_total_kes,
    })),
  };
}

async function insertMovement(db: Queryable, m: NewMovement): Promise<StockMovement> {
  const { rows } = await db.query(
    `INSERT INTO stock_movements
       (product_id, variant_id, product_name, variant_name, sku, delta, balance_after,
        reason, note, unit_cost_kes, reference, user_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      m.productId,
      m.variantId,
      m.productName,
      m.variantName,
      m.sku,
      m.delta,
      m.balanceAfter,
      m.reason,
      m.note,
      m.unitCostKes,
      m.reference,
      m.userEmail,
    ],
  );
  return mapMovement(rows[0]);
}

async function loadSales(db: Queryable, saleRows: any[]): Promise<Sale[]> {
  if (saleRows.length === 0) return [];
  const { rows: lineRows } = await db.query(
    `SELECT * FROM sale_items WHERE sale_id = ANY($1::uuid[]) ORDER BY sort_order ASC`,
    [saleRows.map((s) => s.id)],
  );
  const bySale = new Map<string, any[]>();
  for (const l of lineRows) {
    const list = bySale.get(l.sale_id) ?? [];
    list.push(l);
    bySale.set(l.sale_id, list);
  }
  return saleRows.map((s) => mapSale(s, bySale.get(s.id) ?? []));
}

class PgStockTx implements StockTx {
  constructor(private readonly client: pg.PoolClient) {}

  async findItem(ref: ItemRef): Promise<LockedItem | null> {
    if (!isUuid(ref.productId) || (ref.variantId && !isUuid(ref.variantId))) {
      return null;
    }

    let row: any;
    if (ref.variantId) {
      const res = await this.client.query(
        `SELECT v.product_id, v.id AS variant_id, p.name AS product_name, v.name AS variant_name,
                v.sku, v.stock_quantity, v.price_kes, false AS requires_variant
           FROM product_variants v
           JOIN products p ON p.id = v.product_id
          WHERE v.id = $1 AND v.product_id = $2
          FOR UPDATE OF v`,
        [ref.variantId, ref.productId],
      );
      row = res.rows[0];
    } else {
      const res = await this.client.query(
        `SELECT p.id AS product_id, NULL::uuid AS variant_id, p.name AS product_name,
                NULL::text AS variant_name, p.sku, p.stock_quantity, p.price_kes,
                EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id) AS requires_variant
           FROM products p
          WHERE p.id = $1
          FOR UPDATE`,
        [ref.productId],
      );
      row = res.rows[0];
    }
    if (!row) return null;

    const settings = await this.client.query(
      row.variant_id
        ? `SELECT reorder_level, cost_price_kes FROM stock_item_settings WHERE variant_id = $1`
        : `SELECT reorder_level, cost_price_kes FROM stock_item_settings WHERE product_id = $1 AND variant_id IS NULL`,
      [row.variant_id ?? row.product_id],
    );
    const s = settings.rows[0];

    return {
      key: stockItemKey(row.product_id, row.variant_id),
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      stockQuantity: Number(row.stock_quantity),
      priceKes: row.price_kes,
      costPriceKes: s?.cost_price_kes ?? null,
      reorderLevel: s ? Number(s.reorder_level) : DEFAULT_REORDER_LEVEL,
      requiresVariant: Boolean(row.requires_variant),
    };
  }

  async setQuantity(item: LockedItem, quantity: number): Promise<void> {
    if (item.variantId) {
      await this.client.query(
        `UPDATE product_variants SET stock_quantity = $2, updated_at = now() WHERE id = $1`,
        [item.variantId, quantity],
      );
      // The product row carries the total of its active variants, which is
      // what the storefront shows for the product as a whole.
      await this.client.query(
        `UPDATE products
            SET stock_quantity = (
                  SELECT COALESCE(SUM(stock_quantity), 0)
                    FROM product_variants
                   WHERE product_id = $1 AND is_active = true),
                updated_at = now()
          WHERE id = $1`,
        [item.productId],
      );
    } else {
      await this.client.query(
        `UPDATE products SET stock_quantity = $2, updated_at = now() WHERE id = $1`,
        [item.productId, quantity],
      );
    }
  }

  async setPrice(item: LockedItem, priceKes: string): Promise<void> {
    if (item.variantId) {
      await this.client.query(
        `UPDATE product_variants SET price_kes = $2, updated_at = now() WHERE id = $1`,
        [item.variantId, priceKes],
      );
    } else {
      await this.client.query(
        `UPDATE products SET price_kes = $2, updated_at = now() WHERE id = $1`,
        [item.productId, priceKes],
      );
    }
    item.priceKes = priceKes;
  }

  async saveSettings(
    item: LockedItem,
    patch: { reorderLevel?: number; costPriceKes?: string | null },
  ): Promise<void> {
    const reorder = patch.reorderLevel ?? item.reorderLevel;
    const cost = patch.costPriceKes !== undefined ? patch.costPriceKes : item.costPriceKes;
    if (item.variantId) {
      await this.client.query(
        `INSERT INTO stock_item_settings (product_id, variant_id, reorder_level, cost_price_kes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (variant_id) WHERE variant_id IS NOT NULL
         DO UPDATE SET reorder_level = EXCLUDED.reorder_level,
                       cost_price_kes = EXCLUDED.cost_price_kes,
                       updated_at = now()`,
        [item.productId, item.variantId, reorder, cost],
      );
    } else {
      await this.client.query(
        `INSERT INTO stock_item_settings (product_id, variant_id, reorder_level, cost_price_kes)
         VALUES ($1, NULL, $2, $3)
         ON CONFLICT (product_id) WHERE variant_id IS NULL
         DO UPDATE SET reorder_level = EXCLUDED.reorder_level,
                       cost_price_kes = EXCLUDED.cost_price_kes,
                       updated_at = now()`,
        [item.productId, reorder, cost],
      );
    }
    item.reorderLevel = reorder;
    item.costPriceKes = cost;
  }

  async addMovement(m: NewMovement): Promise<StockMovement> {
    return insertMovement(this.client, m);
  }

  async addSale(sale: NewSale): Promise<Sale> {
    const { rows } = await this.client.query(
      `INSERT INTO sales
         (reference, channel, payment_method, customer_name, customer_phone, note,
          subtotal_kes, discount_kes, total_kes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        sale.reference,
        sale.channel,
        sale.paymentMethod,
        sale.customerName,
        sale.customerPhone,
        sale.note,
        sale.subtotalKes,
        sale.discountKes,
        sale.totalKes,
        sale.createdBy,
      ],
    );
    const saleRow = rows[0];
    for (const [index, l] of sale.lines.entries()) {
      await this.client.query(
        `INSERT INTO sale_items
           (sale_id, product_id, variant_id, product_name, variant_name, sku, quantity,
            list_price_kes, unit_price_kes, unit_cost_kes, line_total_kes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          saleRow.id,
          l.productId,
          l.variantId,
          l.productName,
          l.variantName,
          l.sku,
          l.quantity,
          l.listPriceKes,
          l.unitPriceKes,
          l.unitCostKes,
          l.lineTotalKes,
          index,
        ],
      );
    }
    const [loaded] = await loadSales(this.client, [saleRow]);
    return loaded;
  }

  async findSale(id: string): Promise<Sale | null> {
    if (!isUuid(id)) return null;
    const { rows } = await this.client.query(
      `SELECT * FROM sales WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) return null;
    const [sale] = await loadSales(this.client, rows);
    return sale;
  }

  async markSaleVoided(id: string, reason: string, by: string): Promise<Sale> {
    const { rows } = await this.client.query(
      `UPDATE sales
          SET status = 'voided', void_reason = $2, voided_by = $3, voided_at = now()
        WHERE id = $1
        RETURNING *`,
      [id, reason, by],
    );
    const [sale] = await loadSales(this.client, rows);
    return sale;
  }
}

class PgInventoryStore implements InventoryStore {
  async transaction<T>(fn: (tx: StockTx) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(new PgStockTx(client));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async listItems(): Promise<StockItem[]> {
    const pool = getPool();
    const [productsRes, variantsRes, settingsRes, lastRes] = await Promise.all([
      pool.query(
        `SELECT p.id, p.name, p.sku, p.oem_part_number, p.product_type, p.thumbnail_url,
                p.is_published, p.price_kes, p.stock_quantity,
                c.name AS category_name, b.name AS brand_name
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN brands b ON b.id = p.brand_id`,
      ),
      pool.query(
        `SELECT id, product_id, name, sku, oem_part_number, price_kes, stock_quantity, is_active
           FROM product_variants
          ORDER BY sort_order ASC, name ASC`,
      ),
      pool.query(
        `SELECT product_id, variant_id, reorder_level, cost_price_kes FROM stock_item_settings`,
      ),
      pool.query(
        `SELECT product_id, variant_id, MAX(created_at) AS last_at
           FROM stock_movements
          WHERE product_id IS NOT NULL
          GROUP BY product_id, variant_id`,
      ),
    ]);

    const settings = new Map<string, SettingsRow>(
      settingsRes.rows.map((r: any) => [
        stockItemKey(r.product_id, r.variant_id),
        { reorderLevel: Number(r.reorder_level), costPriceKes: r.cost_price_kes },
      ]),
    );
    const last = new Map<string, string>(
      lastRes.rows.map((r: any) => [stockItemKey(r.product_id, r.variant_id), iso(r.last_at)!]),
    );

    return composeStockItems(
      productsRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        oemPartNumber: r.oem_part_number,
        productType: r.product_type,
        thumbnailUrl: r.thumbnail_url,
        isPublished: r.is_published,
        priceKes: r.price_kes,
        stockQuantity: Number(r.stock_quantity),
        categoryName: r.category_name,
        brandName: r.brand_name,
      })),
      variantsRes.rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        name: r.name,
        sku: r.sku,
        oemPartNumber: r.oem_part_number,
        priceKes: r.price_kes,
        stockQuantity: Number(r.stock_quantity),
        isActive: r.is_active,
      })),
      settings,
      last,
    );
  }

  async listMovements(filter: MovementFilter): Promise<StockMovement[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      where.push(clause.replace("?", `$${params.length}`));
    };

    if (filter.productId) {
      if (!isUuid(filter.productId)) return [];
      add("product_id = ?::uuid", filter.productId);
    }
    if (filter.variantId) {
      if (!isUuid(filter.variantId)) return [];
      add("variant_id = ?::uuid", filter.variantId);
    }
    if (filter.reason) add("reason = ?", filter.reason);
    if (filter.reference) add("reference = ?", filter.reference);
    if (filter.since) add("created_at >= ?", filter.since);
    if (filter.search) {
      params.push(`%${filter.search}%`);
      const p = `$${params.length}`;
      where.push(
        `(product_name ILIKE ${p} OR variant_name ILIKE ${p} OR sku ILIKE ${p}
          OR note ILIKE ${p} OR reference ILIKE ${p} OR user_email ILIKE ${p})`,
      );
    }
    params.push(filter.limit);

    const { rows } = await getPool().query(
      `SELECT * FROM stock_movements
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC
        LIMIT $${params.length}`,
      params,
    );
    return rows.map(mapMovement);
  }

  async listSales(filter: SalesFilter): Promise<Sale[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM sales
        WHERE ($1::timestamptz IS NULL OR created_at >= $1)
          AND ($2::timestamptz IS NULL OR created_at < $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT 5000`,
      [filter.start ?? null, filter.end ?? null, filter.status ?? null],
    );
    return loadSales(pool, rows);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function getStore(): InventoryStore {
  const inMemory = getActiveInMemoryDataset();
  return inMemory ? new MemoryInventoryStore(inMemory) : new PgInventoryStore();
}

// ── Business rules ───────────────────────────────────────────────────────────

async function requireItem(tx: StockTx, ref: ItemRef): Promise<LockedItem> {
  const item = await tx.findItem(ref);
  if (!item) {
    throw new AppError(404, "NOT_FOUND", "That product or variant no longer exists.");
  }
  if (item.requiresVariant) {
    throw new AppError(
      400,
      "VARIANT_REQUIRED",
      `${item.productName} has variants — choose which one (e.g. Original or Compatible).`,
    );
  }
  return item;
}

/** Locks items in a stable order so two concurrent operations queue instead of deadlocking. */
async function lockAll(tx: StockTx, refs: ItemRef[]): Promise<Map<string, LockedItem>> {
  const unique = new Map<string, ItemRef>();
  for (const ref of refs) unique.set(stockItemKey(ref.productId, ref.variantId), ref);
  const locked = new Map<string, LockedItem>();
  for (const key of [...unique.keys()].sort()) {
    locked.set(key, await requireItem(tx, unique.get(key)!));
  }
  return locked;
}

function movementFor(
  item: LockedItem,
  delta: number,
  reason: StockReason,
  extra: { note?: string; unitCostKes?: string | null; reference?: string; userEmail?: string },
): NewMovement {
  return {
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    delta,
    balanceAfter: item.stockQuantity,
    reason,
    note: extra.note ?? "",
    unitCostKes: extra.unitCostKes ?? null,
    reference: extra.reference ?? "",
    userEmail: extra.userEmail ?? "",
  };
}

const INCREASING_REASONS: ManualAdjustReason[] = ["receive", "return"];
const DECREASING_REASONS: ManualAdjustReason[] = ["damage", "internal_use"];

function joinNote(...parts: (string | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(" — ");
}

async function findStockItem(store: InventoryStore, ref: ItemRef): Promise<StockItem> {
  const key = stockItemKey(ref.productId, ref.variantId);
  const item = (await store.listItems()).find((i) => i.key === key);
  if (!item) throw new AppError(404, "NOT_FOUND", "Stock item not found.");
  return item;
}

export interface ProductStockSnapshot {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  costPriceKes?: string | null;
}

export const InventoryService = {
  async listItems(): Promise<StockItem[]> {
    return getStore().listItems();
  },

  async getDashboard(now: Date = new Date()): Promise<InventoryDashboard> {
    const store = getStore();
    const items = await store.listItems();
    const activityDays = 14;
    const since = nairobiDayStart(addDays(nairobiDate(now), -(activityDays - 1)));

    const [windowMovements, recentMovements, recentSales] = await Promise.all([
      store.listMovements({ since, limit: 20000 }),
      store.listMovements({ limit: 10 }),
      store.listSales({ start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }),
    ]);

    return {
      stats: computeInventoryStats(items),
      lowStockItems: items
        .filter((i) => i.isActive && i.status !== "in_stock")
        .sort((a, b) => a.stockQuantity - b.stockQuantity || a.productName.localeCompare(b.productName))
        .slice(0, 12),
      recentMovements,
      activity: buildActivity(
        windowMovements.filter((m) => m.reason !== "opening"),
        activityDays,
        now,
      ),
      salesLast30Days: summarizeSales(recentSales),
    };
  },

  async listMovements(query: StockMovementsQuery): Promise<StockMovement[]> {
    return getStore().listMovements(query);
  },

  /** One manual change to one item: a delivery, a return, a write-off or a fix. */
  async adjust(
    input: StockAdjustInput,
    userEmail: string,
  ): Promise<{ item: StockItem; movement: StockMovement | null }> {
    const store = getStore();
    const unitCostKes = normalizeKes(input.unitCostKes);
    const movement = await store.transaction(async (tx) => {
      const item = await requireItem(tx, input);
      const label = itemLabel(item.productName, item.variantName);
      const { delta, next } = resolveAdjustment(item.stockQuantity, input, label);

      if (delta === 0) return null;
      if (INCREASING_REASONS.includes(input.reason) && delta < 0) {
        throw new AppError(400, "INVALID_ADJUSTMENT", "Received or returned stock must add units.");
      }
      if (DECREASING_REASONS.includes(input.reason) && delta > 0) {
        throw new AppError(400, "INVALID_ADJUSTMENT", "Damaged or used stock must remove units.");
      }

      await tx.setQuantity(item, next);
      item.stockQuantity = next;
      // A delivery with a unit cost becomes the item's standing cost price.
      if (input.reason === "receive" && unitCostKes != null) {
        await tx.saveSettings(item, { costPriceKes: unitCostKes });
      }
      return tx.addMovement(
        movementFor(item, delta, input.reason, {
          note: input.note,
          unitCostKes: input.reason === "receive" ? unitCostKes ?? item.costPriceKes : null,
          userEmail,
        }),
      );
    });

    return { item: await findStockItem(store, input), movement };
  },

  /** A supplier delivery of one or more items, recorded under one reference. */
  async receive(input: ReceiveStockInput, userEmail: string): Promise<BulkStockResult> {
    const reference = makeReference("RCV");
    const note = joinNote(
      input.supplierReference ? `Supplier ref ${input.supplierReference}` : undefined,
      input.note,
    );

    return getStore().transaction(async (tx) => {
      const locked = await lockAll(tx, input.lines);
      const movements: StockMovement[] = [];
      for (const line of input.lines) {
        const item = locked.get(stockItemKey(line.productId, line.variantId))!;
        item.stockQuantity += line.quantity;
        await tx.setQuantity(item, item.stockQuantity);
        const unitCostKes = normalizeKes(line.unitCostKes);
        if (unitCostKes != null) {
          await tx.saveSettings(item, { costPriceKes: unitCostKes });
        }
        movements.push(
          await tx.addMovement(
            movementFor(item, line.quantity, "receive", {
              note,
              unitCostKes: unitCostKes ?? item.costPriceKes,
              reference,
              userEmail,
            }),
          ),
        );
      }
      return { reference, applied: movements.length, unchanged: 0, movements };
    });
  },

  /**
   * Commits a physical count. Each counted item is set to what was found on
   * the shelf; matching counts write nothing, differences become one
   * `stock_take` movement each, all under one reference.
   */
  async stockTake(input: StockTakeInput, userEmail: string): Promise<BulkStockResult> {
    const keys = input.counts.map((c) => stockItemKey(c.productId, c.variantId));
    if (new Set(keys).size !== keys.length) {
      throw new AppError(400, "DUPLICATE_COUNT", "Each item can only be counted once per stock take.");
    }
    const reference = makeReference("STK");

    return getStore().transaction(async (tx) => {
      const locked = await lockAll(tx, input.counts);
      const movements: StockMovement[] = [];
      let unchanged = 0;
      for (const count of input.counts) {
        const item = locked.get(stockItemKey(count.productId, count.variantId))!;
        const previous = item.stockQuantity;
        const delta = count.countedQuantity - previous;
        if (delta === 0) {
          unchanged += 1;
          continue;
        }
        item.stockQuantity = count.countedQuantity;
        await tx.setQuantity(item, item.stockQuantity);
        movements.push(
          await tx.addMovement(
            movementFor(item, delta, "stock_take", {
              note: joinNote(`Counted ${count.countedQuantity}, system had ${previous}`, input.note),
              reference,
              userEmail,
            }),
          ),
        );
      }
      return { reference, applied: movements.length, unchanged, movements };
    });
  },

  /** Reorder level, cost price and retail price. Settings, not stock — no ledger row. */
  async updateSettings(input: StockSettingsInput): Promise<StockItem> {
    const store = getStore();
    await store.transaction(async (tx) => {
      const item = await requireItem(tx, input);
      if (input.priceKes !== undefined) {
        const normalizedPrice = normalizeKes(input.priceKes);
        if (normalizedPrice) {
          await tx.setPrice(item, normalizedPrice);
        }
      }
      if (input.reorderLevel !== undefined || input.costPriceKes !== undefined) {
        await tx.saveSettings(item, {
          reorderLevel: input.reorderLevel,
          costPriceKes: normalizeKes(input.costPriceKes),
        });
      }
    });
    return findStockItem(store, input);
  },


  /** Records a sale made in the shop, by phone or on WhatsApp, and deducts the stock. */
  async createSale(input: CreateSaleInput, userEmail: string): Promise<Sale> {
    const reference = makeReference("SALE");

    return getStore().transaction(async (tx) => {
      const locked = await lockAll(tx, input.lines);

      const wanted = new Map<string, number>();
      for (const line of input.lines) {
        const key = stockItemKey(line.productId, line.variantId);
        wanted.set(key, (wanted.get(key) ?? 0) + line.quantity);
      }
      for (const [key, quantity] of wanted) {
        const item = locked.get(key)!;
        if (item.stockQuantity < quantity) {
          throw new AppError(
            409,
            "INSUFFICIENT_STOCK",
            `Only ${item.stockQuantity} of ${itemLabel(item.productName, item.variantName)} in stock — cannot sell ${quantity}.`,
          );
        }
      }

      let subtotal = 0;
      let total = 0;
      const lines: Omit<SaleLine, "id">[] = input.lines.map((line) => {
        const item = locked.get(stockItemKey(line.productId, line.variantId))!;
        const listCents = toCents(item.priceKes);
        const unitCents = line.unitPriceKes !== undefined ? toCents(line.unitPriceKes) : listCents;
        subtotal += listCents * line.quantity;
        total += unitCents * line.quantity;
        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          quantity: line.quantity,
          listPriceKes: fromCents(listCents),
          unitPriceKes: fromCents(unitCents),
          unitCostKes: item.costPriceKes,
          lineTotalKes: fromCents(unitCents * line.quantity),
        };
      });

      const sale = await tx.addSale({
        reference,
        channel: input.channel,
        paymentMethod: input.paymentMethod,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        note: input.note,
        subtotalKes: fromCents(subtotal),
        discountKes: fromCents(Math.max(0, subtotal - total)),
        totalKes: fromCents(total),
        createdBy: userEmail,
        lines,
      });

      for (const line of input.lines) {
        const item = locked.get(stockItemKey(line.productId, line.variantId))!;
        item.stockQuantity -= line.quantity;
        await tx.setQuantity(item, item.stockQuantity);
        await tx.addMovement(
          movementFor(item, -line.quantity, "sale", {
            note: joinNote(`Sale ${reference}`, input.customerName),
            unitCostKes: item.costPriceKes,
            reference,
            userEmail,
          }),
        );
      }

      return sale;
    });
  },

  async listSales(query: SalesQuery, now: Date = new Date()): Promise<Sale[]> {
    const fallback = monthRange(undefined, now);
    const from = query.from ?? fallback.from;
    const to = query.to ?? fallback.to;
    if (from > to) {
      throw new AppError(400, "INVALID_RANGE", "The start date must be before the end date.");
    }
    const { start, end } = dateRangeToInstants(from, to);
    return getStore().listSales({ start, end, status: query.status });
  },

  /** Cancels a sale and puts its units back on the shelf. */
  async voidSale(id: string, input: VoidSaleInput, userEmail: string): Promise<Sale> {
    return getStore().transaction(async (tx) => {
      const sale = await tx.findSale(id);
      if (!sale) throw new AppError(404, "NOT_FOUND", "Sale not found.");
      if (sale.status === "voided") {
        throw new AppError(409, "ALREADY_VOIDED", `Sale ${sale.reference} is already voided.`);
      }

      const lines = [...sale.lines].sort((a, b) =>
        stockItemKey(a.productId ?? "", a.variantId).localeCompare(
          stockItemKey(b.productId ?? "", b.variantId),
        ),
      );
      for (const line of lines) {
        // A product deleted since the sale has no shelf to return stock to.
        if (!line.productId) continue;
        const item = await tx.findItem({ productId: line.productId, variantId: line.variantId });
        if (!item || item.requiresVariant) continue;
        item.stockQuantity += line.quantity;
        await tx.setQuantity(item, item.stockQuantity);
        await tx.addMovement(
          movementFor(item, line.quantity, "sale_void", {
            note: joinNote(`Voided sale ${sale.reference}`, input.reason),
            unitCostKes: line.unitCostKes,
            reference: sale.reference,
            userEmail,
          }),
        );
      }

      return tx.markSaleVoided(sale.id, input.reason, userEmail);
    });
  },

  async salesReport(query: SalesReportQuery, now: Date = new Date()): Promise<SalesReport> {
    const { from, to } = monthRange(query.month, now);
    const { start, end } = dateRangeToInstants(from, to);
    const sales = await getStore().listSales({ start, end });
    return buildSalesReport(sales, from, to);
  },

  // ── Hooks for the product form (admin.service.ts) ──────────────────────────

  /**
   * Keeps a product's own stock figure equal to the total of its active
   * variants. Stock for products with variants is counted per variant, so a
   * total typed on the product form (or nudged with quick +/- buttons) would
   * otherwise drift from what is actually on the shelf. Returns the product's
   * stock after syncing, or null when it has no variants (its own figure is
   * then the real count and is left alone).
   */
  async syncProductTotal(productId: string): Promise<number | null> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) {
      const variants = inMemory.variants.filter((v) => v.productId === productId);
      if (variants.length === 0) return null;
      const product = inMemory.products.find((p) => p.id === productId);
      if (!product) return null;
      const total = variants
        .filter((v) => v.isActive)
        .reduce((sum, v) => sum + v.stockQuantity, 0);
      if (product.stockQuantity !== total) {
        product.stockQuantity = total;
        saveInMemoryDataset(inMemory);
      }
      return total;
    }

    if (!isUuid(productId)) return null;
    const { rows } = await getPool().query(
      `UPDATE products p
          SET stock_quantity = (
                SELECT COALESCE(SUM(v.stock_quantity), 0)
                  FROM product_variants v
                 WHERE v.product_id = p.id AND v.is_active = true)
        WHERE p.id = $1
          AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
        RETURNING p.stock_quantity`,
      [productId],
    );
    return rows[0] ? Number(rows[0].stock_quantity) : null;
  },

  /**
   * Makes sure the in-memory ledger exists before the catalogue is changed,
   * so its opening balances describe stock as it was before the change.
   */
  async prepare(): Promise<void> {
    const inMemory = getActiveInMemoryDataset();
    if (inMemory) ensureInventoryState(inMemory as InventoryDataset);
  },

  /** Current quantity of every stock item belonging to one product. */
  async snapshotProductStock(productId: string): Promise<Map<string, ProductStockSnapshot>> {
    const items = (await getStore().listItems()).filter((i) => i.productId === productId);
    return new Map(
      items.map((i) => [
        i.key,
        {
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantName: i.variantName,
          sku: i.sku,
          quantity: i.stockQuantity,
          costPriceKes: i.costPriceKes,
        },
      ]),
    );
  },

  /**
   * Writes ledger rows for stock changed on the product form, so the history
   * stays complete even when stock is edited outside the inventory screens.
   */
  async recordProductFormChanges(
    before: Map<string, ProductStockSnapshot>,
    after: Map<string, ProductStockSnapshot>,
    userEmail: string,
  ): Promise<void> {
    const movements: NewMovement[] = [];
    for (const [key, now] of after) {
      const previous = before.get(key)?.quantity;
      const delta = now.quantity - (previous ?? 0);
      if (delta === 0) continue;
      movements.push({
        productId: now.productId,
        variantId: now.variantId,
        productName: now.productName,
        variantName: now.variantName,
        sku: now.sku,
        delta,
        balanceAfter: now.quantity,
        reason: previous === undefined ? "opening" : "correction",
        note:
          previous === undefined
            ? "Opening stock entered on the product form"
            : "Stock edited on the product form",
        unitCostKes: previous === undefined ? (now.costPriceKes ?? null) : null,
        reference: "",
        userEmail,
      });
    }
    if (movements.length === 0) return;

    const inMemory = getActiveInMemoryDataset() as InventoryDataset | null;
    if (inMemory) {
      const state = ensureInventoryState(inMemory);
      const createdAt = new Date().toISOString();
      for (const m of movements) state.movements.push({ ...m, id: randomUUID(), createdAt });
      saveInMemoryDataset(inMemory);
      return;
    }

    const pool = getPool();
    for (const m of movements) await insertMovement(pool, m);
  },

  /**
   * Saves optional cost price and reorder level submitted directly from the
   * product creation/edit form (top-level product or its variants).
   */
  async saveProductFormSettings(
    productId: string,
    input: {
      costPriceKes?: string | null;
      reorderLevel?: number;
      variants?: Array<{
        sku: string;
        costPriceKes?: string | null;
        reorderLevel?: number;
      }>;
    },
  ): Promise<void> {
    const store = getStore();
    const items = (await store.listItems()).filter((i) => i.productId === productId);
    if (items.length === 0) return;

    await store.transaction(async (tx) => {
      if (input.variants && input.variants.length > 0) {
        for (const vInput of input.variants) {
          if (vInput.costPriceKes === undefined && vInput.reorderLevel === undefined) continue;
          const matching = items.find((i) => i.variantId && i.sku === vInput.sku);
          if (!matching) continue;
          const locked = await tx.findItem({
            productId: matching.productId,
            variantId: matching.variantId,
          });
          if (!locked) continue;
          await tx.saveSettings(locked, {
            reorderLevel: vInput.reorderLevel,
            costPriceKes:
              vInput.costPriceKes !== undefined ? normalizeKes(vInput.costPriceKes) : undefined,
          });
        }
      } else if (input.costPriceKes !== undefined || input.reorderLevel !== undefined) {
        const locked = await tx.findItem({ productId, variantId: null });
        if (locked && !locked.requiresVariant) {
          await tx.saveSettings(locked, {
            reorderLevel: input.reorderLevel,
            costPriceKes:
              input.costPriceKes !== undefined ? normalizeKes(input.costPriceKes) : undefined,
          });
        }
      }
    });
  },
};
