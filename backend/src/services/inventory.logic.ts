/**
 * Pure inventory rules and calculations, shared by the PostgreSQL and in-memory
 * (test) storage paths in inventory.service.ts. Nothing here touches
 * storage, so every rule is unit-testable on its own.
 *
 * Money is handled in integer cents to avoid floating point drift, and
 * returned as 2-decimal strings to match the NUMERIC(12,2) columns.
 */
import type {
  ActivityPoint,
  InventoryStats,
  PaymentMethod,
  Sale,
  SalesChannel,
  SalesReport,
  SalesSummary,
  StockItem,
  StockMovement,
  StockStatus,
} from "@jocta/shared";
import { PAYMENT_METHODS, SALES_CHANNELS } from "@jocta/shared";
import { AppError } from "../middleware/error.middleware.js";

// ── Money ────────────────────────────────────────────────────────────────────

export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "5200" -> "5200.00", matching what NUMERIC(12,2) columns return. */
export function normalizeKes<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? fromCents(toCents(value)) : value) as T;
}

// ── Time (Kenya is UTC+3 all year, no daylight saving) ───────────────────────

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date in Nairobi for an instant, as YYYY-MM-DD. */
export function nairobiDate(instant: Date | string | number): string {
  const t = new Date(instant).getTime();
  return new Date(t + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant at which a Nairobi calendar date begins. */
export function nairobiDayStart(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - NAIROBI_OFFSET_MS);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** First and last Nairobi dates of a month ("2026-11"), defaulting to now. */
export function monthRange(month?: string, now: Date = new Date()): { from: string; to: string } {
  const ym = month ?? nairobiDate(now).slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Half-open UTC instant range [start, end) covering inclusive Nairobi dates. */
export function dateRangeToInstants(from: string, to: string): { start: Date; end: Date } {
  return { start: nairobiDayStart(from), end: nairobiDayStart(addDays(to, 1)) };
}

// ── References ───────────────────────────────────────────────────────────────

/** e.g. `RCV-20261105-4F2A` — short enough to read out over the phone. */
export function makeReference(prefix: string, now: Date = new Date()): string {
  const stamp = nairobiDate(now).replace(/-/g, "");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `${prefix}-${stamp}-${rand}`;
}

// ── Stock rules ──────────────────────────────────────────────────────────────

export const MIN_RESTOCK_THRESHOLD = 3;

export function stockStatus(
  quantity: number,
  reorderLevel: number = MIN_RESTOCK_THRESHOLD,
): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity < MIN_RESTOCK_THRESHOLD || quantity <= reorderLevel) return "low_stock";
  return "in_stock";
}

export function isLowStock(
  quantity: number,
  reorderLevel: number = MIN_RESTOCK_THRESHOLD,
): boolean {
  return quantity > 0 && (quantity < MIN_RESTOCK_THRESHOLD || quantity <= reorderLevel);
}

export function needsRestock(
  quantity: number,
  reorderLevel: number = MIN_RESTOCK_THRESHOLD,
): boolean {
  return quantity < MIN_RESTOCK_THRESHOLD || quantity <= reorderLevel;
}

/**
 * Turns a relative (`delta`) or absolute (`newQuantity`) change into the
 * signed delta and resulting balance, refusing anything that would take stock
 * below zero.
 */
export function resolveAdjustment(
  previous: number,
  change: { delta?: number; newQuantity?: number },
  label: string,
): { delta: number; next: number } {
  const delta =
    change.delta !== undefined
      ? Math.trunc(change.delta)
      : Math.trunc(change.newQuantity ?? previous) - previous;
  const next = previous + delta;
  if (next < 0) {
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      `${label} has ${previous} in stock — cannot remove ${Math.abs(delta)}.`,
    );
  }
  return { delta, next };
}

export function itemLabel(productName: string, variantName: string | null): string {
  return variantName ? `${productName} (${variantName})` : productName;
}

// ── Dashboard calculations ───────────────────────────────────────────────────

export function computeInventoryStats(items: StockItem[]): InventoryStats {
  let totalUnits = 0;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let uncosted = 0;
  let costCents = 0;
  let retailCents = 0;

  for (const item of items) {
    const qty = Math.max(0, item.stockQuantity);
    totalUnits += qty;
    if (item.status === "out_of_stock") outOfStock += 1;
    else if (item.status === "low_stock") lowStock += 1;
    else inStock += 1;

    if (qty > 0 && item.costPriceKes === null) uncosted += 1;
    costCents += qty * toCents(item.costPriceKes);
    retailCents += qty * toCents(item.priceKes);
  }

  return {
    totalItems: items.length,
    totalUnits,
    inStock,
    lowStock,
    outOfStock,
    uncosted,
    stockCostValueKes: fromCents(costCents),
    stockRetailValueKes: fromCents(retailCents),
  };
}

/** Units in and out per Nairobi day for the last `days` days, quiet days included. */
export function buildActivity(
  movements: Pick<StockMovement, "delta" | "createdAt">[],
  days: number,
  now: Date = new Date(),
): ActivityPoint[] {
  const today = nairobiDate(now);
  const points = new Map<string, ActivityPoint>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    points.set(date, { date, unitsIn: 0, unitsOut: 0 });
  }
  for (const m of movements) {
    const point = points.get(nairobiDate(m.createdAt));
    if (!point) continue;
    if (m.delta > 0) point.unitsIn += m.delta;
    else point.unitsOut += -m.delta;
  }
  return [...points.values()];
}

// ── Sales calculations ───────────────────────────────────────────────────────

export function summarizeSales(sales: Sale[]): SalesSummary {
  let revenue = 0;
  let costedRevenue = 0;
  let cost = 0;
  let units = 0;
  let transactions = 0;

  for (const sale of sales) {
    if (sale.status !== "completed") continue;
    transactions += 1;
    for (const line of sale.lines) {
      const lineTotal = toCents(line.lineTotalKes);
      revenue += lineTotal;
      units += line.quantity;
      if (line.unitCostKes !== null) {
        costedRevenue += lineTotal;
        cost += toCents(line.unitCostKes) * line.quantity;
      }
    }
  }

  return {
    revenueKes: fromCents(revenue),
    grossProfitKes: fromCents(costedRevenue - cost),
    costedRevenueKes: fromCents(costedRevenue),
    transactions,
    unitsSold: units,
  };
}

export function buildSalesReport(sales: Sale[], from: string, to: string): SalesReport {
  const completed = sales.filter((s) => s.status === "completed");
  const summary = summarizeSales(completed);

  let discount = 0;
  const channels = new Map<SalesChannel, { transactions: number; revenue: number }>(
    SALES_CHANNELS.map((c) => [c, { transactions: 0, revenue: 0 }]),
  );
  const payments = new Map<PaymentMethod, { transactions: number; revenue: number }>(
    PAYMENT_METHODS.map((p) => [p, { transactions: 0, revenue: 0 }]),
  );
  const products = new Map<
    string,
    { name: string; sku: string; quantity: number; revenue: number; cost: number; costKnown: boolean }
  >();
  const daily = new Map<string, { transactions: number; unitsSold: number; revenue: number }>();
  for (let date = from; date <= to; date = addDays(date, 1)) {
    daily.set(date, { transactions: 0, unitsSold: 0, revenue: 0 });
  }

  for (const sale of completed) {
    const total = toCents(sale.totalKes);
    discount += toCents(sale.discountKes);

    const ch = channels.get(sale.channel);
    if (ch) {
      ch.transactions += 1;
      ch.revenue += total;
    }
    const pm = payments.get(sale.paymentMethod);
    if (pm) {
      pm.transactions += 1;
      pm.revenue += total;
    }

    const day = daily.get(nairobiDate(sale.createdAt));
    if (day) {
      day.transactions += 1;
      day.revenue += total;
    }

    for (const line of sale.lines) {
      if (day) day.unitsSold += line.quantity;
      const key = line.variantId
        ? `${line.productId ?? line.sku}::${line.variantId}`
        : line.productId ?? line.sku;
      const entry = products.get(key) ?? {
        name: itemLabel(line.productName, line.variantName),
        sku: line.sku,
        quantity: 0,
        revenue: 0,
        cost: 0,
        costKnown: true,
      };
      entry.quantity += line.quantity;
      entry.revenue += toCents(line.lineTotalKes);
      if (line.unitCostKes === null) entry.costKnown = false;
      else entry.cost += toCents(line.unitCostKes) * line.quantity;
      products.set(key, entry);
    }
  }

  const transactions = summary.transactions;

  return {
    from,
    to,
    summary: {
      ...summary,
      discountKes: fromCents(discount),
      averageSaleKes: fromCents(
        transactions > 0 ? Math.round(toCents(summary.revenueKes) / transactions) : 0,
      ),
      voidedTransactions: sales.filter((s) => s.status === "voided").length,
    },
    byChannel: [...channels.entries()].map(([channel, v]) => ({
      channel,
      transactions: v.transactions,
      revenueKes: fromCents(v.revenue),
    })),
    byPaymentMethod: [...payments.entries()].map(([paymentMethod, v]) => ({
      paymentMethod,
      transactions: v.transactions,
      revenueKes: fromCents(v.revenue),
    })),
    topProducts: [...products.entries()]
      .map(([key, v]) => ({
        key,
        name: v.name,
        sku: v.sku,
        quantity: v.quantity,
        revenueKes: fromCents(v.revenue),
        grossProfitKes: v.costKnown ? fromCents(v.revenue - v.cost) : null,
      }))
      .sort((a, b) => toCents(b.revenueKes) - toCents(a.revenueKes) || b.quantity - a.quantity)
      .slice(0, 10),
    daily: [...daily.entries()].map(([date, v]) => ({
      date,
      transactions: v.transactions,
      unitsSold: v.unitsSold,
      revenueKes: fromCents(v.revenue),
    })),
  };
}
