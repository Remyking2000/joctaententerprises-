import { z } from "zod";
import { kesMoneySchema, type ProductType } from "./catalog.schema.js";

// ── Stock movement reasons ───────────────────────────────────────────────────

/**
 * Every change to a stock quantity is recorded in the ledger with one of these.
 *
 * - opening       first quantity recorded for an item (migration or new product)
 * - receive       stock delivered by a supplier
 * - sale          sold to a customer (recorded through the sales screen)
 * - sale_void     a recorded sale was voided and its units returned to the shelf
 * - return        a customer brought an item back
 * - damage        written off: damaged, expired or faulty
 * - internal_use  used in-house, e.g. a part fitted during a printer service
 * - correction    a manual fix, including stock edited on the product form
 * - stock_take    the difference found during a physical count
 */
export const STOCK_REASONS = [
  "opening",
  "receive",
  "sale",
  "sale_void",
  "return",
  "damage",
  "internal_use",
  "correction",
  "stock_take",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

/** Reasons staff can pick when adjusting a single item by hand. */
export const MANUAL_ADJUST_REASONS = [
  "receive",
  "return",
  "damage",
  "internal_use",
  "correction",
] as const;
export type ManualAdjustReason = (typeof MANUAL_ADJUST_REASONS)[number];

export const SALES_CHANNELS = [
  "walk_in",
  "whatsapp",
  "phone",
  "website",
  "other",
] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const PAYMENT_METHODS = [
  "cash",
  "mpesa",
  "bank_transfer",
  "card",
  "credit",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Default reorder level for items that have never been configured. */
export const DEFAULT_REORDER_LEVEL = 3;

/** Minimum stock threshold: any quantity under 3 (< 3) is automatically low and needs restocking. */
export const MIN_RESTOCK_THRESHOLD = 3;

// ── Read models ──────────────────────────────────────────────────────────────

/**
 * One thing that sits on a shelf and is counted: a product without variants,
 * or one variant of a product that has them (e.g. "Original" vs "Compatible").
 */
export interface StockItem {
  /** `productId` or `productId::variantId`. Stable across renames. */
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  oemPartNumber: string | null;
  productType: ProductType;
  categoryName: string | null;
  brandName: string | null;
  thumbnailUrl: string;
  isPublished: boolean;
  /** False for a variant that has been deactivated on the product form. */
  isActive: boolean;
  stockQuantity: number;
  reorderLevel: number;
  /** What one unit costs Jocta. Null when it has never been recorded. */
  costPriceKes: string | null;
  priceKes: string;
  status: StockStatus;
  lastMovementAt: string | null;
}

export interface StockMovement {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  /** Signed change: +12 received, -3 sold. Never 0. */
  delta: number;
  /** Quantity on hand immediately after this movement. */
  balanceAfter: number;
  reason: StockReason;
  note: string;
  unitCostKes: string | null;
  /** Groups movements made together: a receipt, a stock take, a sale. */
  reference: string;
  userEmail: string;
  createdAt: string;
}

export interface InventoryStats {
  /** Number of stock items (products without variants + variants). */
  totalItems: number;
  totalUnits: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  /** Items holding stock with no recorded cost — their value is missing below. */
  uncosted: number;
  stockCostValueKes: string;
  stockRetailValueKes: string;
}

export interface ActivityPoint {
  /** Nairobi calendar date, YYYY-MM-DD. */
  date: string;
  unitsIn: number;
  unitsOut: number;
}

export interface SalesSummary {
  revenueKes: string;
  grossProfitKes: string;
  /** Revenue from lines whose unit cost was known, so profit is meaningful. */
  costedRevenueKes: string;
  transactions: number;
  unitsSold: number;
}

export interface InventoryDashboard {
  stats: InventoryStats;
  lowStockItems: StockItem[];
  recentMovements: StockMovement[];
  activity: ActivityPoint[];
  salesLast30Days: SalesSummary;
}

export interface SaleLine {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  /** Catalogue price at the time of sale. */
  listPriceKes: string;
  /** Price actually charged per unit. */
  unitPriceKes: string;
  /** Cost per unit at the time of sale, for profit reporting. */
  unitCostKes: string | null;
  lineTotalKes: string;
}

export interface Sale {
  id: string;
  reference: string;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  note: string;
  status: "completed" | "voided";
  subtotalKes: string;
  discountKes: string;
  totalKes: string;
  createdBy: string;
  createdAt: string;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  lines: SaleLine[];
}

export interface SalesReport {
  /** Inclusive Nairobi dates, YYYY-MM-DD. */
  from: string;
  to: string;
  summary: SalesSummary & {
    discountKes: string;
    averageSaleKes: string;
    voidedTransactions: number;
  };
  byChannel: { channel: SalesChannel; transactions: number; revenueKes: string }[];
  byPaymentMethod: {
    paymentMethod: PaymentMethod;
    transactions: number;
    revenueKes: string;
  }[];
  topProducts: {
    key: string;
    name: string;
    sku: string;
    quantity: number;
    revenueKes: string;
    grossProfitKes: string | null;
  }[];
  daily: { date: string; transactions: number; unitsSold: number; revenueKes: string }[];
}

export interface BulkStockResult {
  reference: string;
  applied: number;
  unchanged: number;
  movements: StockMovement[];
}

// ── Input schemas ────────────────────────────────────────────────────────────

const itemRefShape = {
  productId: z.string().trim().min(1, "A product is required"),
  variantId: z.string().trim().min(1).nullable().optional(),
};

const noteSchema = z.string().trim().max(500).default("");

export const stockAdjustSchema = z
  .object({
    ...itemRefShape,
    reason: z.enum(MANUAL_ADJUST_REASONS),
    /** Relative change: +12 or -3. */
    delta: z.coerce.number().int().optional(),
    /** Absolute target quantity (used by "correction" to set an exact count). */
    newQuantity: z.coerce.number().int().min(0).optional(),
    note: noteSchema,
    unitCostKes: kesMoneySchema.nullable().optional(),
  })
  .refine((v) => (v.delta === undefined) !== (v.newQuantity === undefined), {
    message: "Provide either a quantity change or a new quantity, not both",
    path: ["delta"],
  })
  .refine((v) => v.delta === undefined || v.delta !== 0, {
    message: "Quantity change cannot be zero",
    path: ["delta"],
  });
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const receiveStockSchema = z.object({
  /** Supplier delivery note or invoice number. */
  supplierReference: z.string().trim().max(120).default(""),
  note: noteSchema,
  lines: z
    .array(
      z.object({
        ...itemRefShape,
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        unitCostKes: kesMoneySchema.nullable().optional(),
      }),
    )
    .min(1, "Add at least one item")
    .max(500),
});
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

export const stockTakeSchema = z.object({
  note: noteSchema,
  counts: z
    .array(
      z.object({
        ...itemRefShape,
        countedQuantity: z.coerce.number().int().min(0, "Counts cannot be negative"),
      }),
    )
    .min(1, "Count at least one item")
    .max(5000),
});
export type StockTakeInput = z.infer<typeof stockTakeSchema>;

export const stockSettingsSchema = z
  .object({
    ...itemRefShape,
    reorderLevel: z.coerce.number().int().min(0).max(100000).optional(),
    /** `null` clears a cost recorded in error; omit to leave it unchanged. */
    costPriceKes: kesMoneySchema.nullable().optional(),
    priceKes: kesMoneySchema.optional(),
  })
  .refine((v) => v.reorderLevel !== undefined || v.costPriceKes !== undefined || v.priceKes !== undefined, {
    message: "Nothing to update",
  });
export type StockSettingsInput = z.infer<typeof stockSettingsSchema>;

export const stockMovementsQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  variantId: z.string().trim().min(1).optional(),
  reason: z.enum(STOCK_REASONS).optional(),
  reference: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});
export type StockMovementsQuery = z.infer<typeof stockMovementsQuerySchema>;

export const createSaleSchema = z.object({
  channel: z.enum(SALES_CHANNELS).default("walk_in"),
  paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
  customerName: z.string().trim().max(120).default(""),
  customerPhone: z.string().trim().max(30).default(""),
  note: noteSchema,
  lines: z
    .array(
      z.object({
        ...itemRefShape,
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        /** Defaults to the catalogue price when omitted. */
        unitPriceKes: kesMoneySchema.optional(),
      }),
    )
    .min(1, "Add at least one item")
    .max(100),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const voidSaleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Give a short reason for voiding this sale")
    .max(300),
});
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be YYYY-MM-DD");

export const salesQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: z.enum(["completed", "voided"]).optional(),
});
export type SalesQuery = z.infer<typeof salesQuerySchema>;

export const salesReportQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM")
    .optional(),
});
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;

export function stockItemKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

// Request bodies as the client sends them (defaults still optional).
export type StockAdjustPayload = z.input<typeof stockAdjustSchema>;
export type ReceiveStockPayload = z.input<typeof receiveStockSchema>;
export type StockTakePayload = z.input<typeof stockTakeSchema>;
export type StockSettingsPayload = z.input<typeof stockSettingsSchema>;
export type CreateSalePayload = z.input<typeof createSaleSchema>;
