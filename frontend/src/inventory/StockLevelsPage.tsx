import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, History, Minus, Plus, RefreshCw, Search, SlidersHorizontal, Wrench } from "lucide-react";
import {
  MANUAL_ADJUST_REASONS,
  type ManualAdjustReason,
  type StockItem,
  type StockStatus,
} from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  Card,
  Modal,
  Notice,
  PageHeader,
  REASON_LABELS,
  StatCard,
  StockBadge,
  downloadCsv,
  errorMessage,
  formatDateTime,
  inputClass,
  itemName,
  todayInNairobi,
  useStockItems,
} from "./ui";

type SortKey = "name" | "stock_asc" | "stock_desc" | "value_desc" | "cost_desc";
type FilterKey = "all" | StockStatus | "uncosted";

const REASON_HELP: Record<ManualAdjustReason, string> = {
  receive: "Units delivered by a supplier. Enter a positive number.",
  return: "Units brought back by a customer in resaleable condition.",
  damage: "Units damaged, faulty or expired — removed from stock.",
  internal_use: "Units used in-house, e.g. fitted during a printer service.",
  correction: "Set the exact count on the shelf after checking.",
};

export function stockCostValue(item: StockItem): number {
  return item.costPriceKes
    ? (parseFloat(item.costPriceKes) || 0) * Math.max(0, item.stockQuantity)
    : 0;
}

export function stockRetailValue(item: StockItem): number {
  return (parseFloat(item.priceKes) || 0) * Math.max(0, item.stockQuantity);
}

export function StockLevelsPage() {
  const { items, setItems, loading, error, reload } = useStockItems();
  const [params, setParams] = useSearchParams();
  const statusFilter = (params.get("status") ?? params.get("filter") ?? "all") as FilterKey;
  const initialQuery = params.get("q") ?? "";
  const initialSort = (params.get("sort") as SortKey) || "name";

  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [configuring, setConfiguring] = useState<StockItem | null>(null);
  const [quickBusyKey, setQuickBusyKey] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeItems = useMemo(() => items.filter((i) => i.isActive !== false), [items]);

  const categories = useMemo(
    () => [...new Set(activeItems.map((i) => i.categoryName).filter(Boolean) as string[])].sort(),
    [activeItems],
  );
  const brands = useMemo(
    () => [...new Set(activeItems.map((i) => i.brandName).filter(Boolean) as string[])].sort(),
    [activeItems],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeItems
      .filter((i) => {
        if (statusFilter === "uncosted") return i.stockQuantity > 0 && i.costPriceKes === null;
        if (statusFilter !== "all" && i.status !== statusFilter) return false;
        return true;
      })
      .filter((i) => !category || i.categoryName === category)
      .filter((i) => !brand || i.brandName === brand)
      .filter(
        (i) =>
          !q ||
          [i.productName, i.variantName ?? "", i.sku, i.oemPartNumber ?? "", i.brandName ?? ""]
            .some((f) => f.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (sort === "stock_asc") return a.stockQuantity - b.stockQuantity;
        if (sort === "stock_desc") return b.stockQuantity - a.stockQuantity;
        if (sort === "value_desc") return stockRetailValue(b) - stockRetailValue(a);
        if (sort === "cost_desc") return stockCostValue(b) - stockCostValue(a);
        return itemName(a).localeCompare(itemName(b));
      });
  }, [activeItems, statusFilter, category, brand, search, sort]);

  const counts = useMemo(
    () => ({
      all: activeItems.length,
      in_stock: activeItems.filter((i) => i.status === "in_stock").length,
      low_stock: activeItems.filter((i) => i.status === "low_stock").length,
      out_of_stock: activeItems.filter((i) => i.status === "out_of_stock").length,
      uncosted: activeItems.filter((i) => i.stockQuantity > 0 && i.costPriceKes === null).length,
    }),
    [activeItems],
  );

  const summary = useMemo(() => {
    let units = 0;
    let retailValue = 0;
    let costValue = 0;
    let costedRetailValue = 0;
    let uncosted = 0;
    for (const item of filtered) {
      const qty = Math.max(0, item.stockQuantity);
      units += qty;
      const rVal = stockRetailValue(item);
      const cVal = stockCostValue(item);
      retailValue += rVal;
      costValue += cVal;
      if (item.costPriceKes !== null) {
        costedRetailValue += rVal;
      } else if (qty > 0) {
        uncosted += 1;
      }
    }
    return {
      units,
      retailValue,
      costValue,
      costedRetailValue,
      grossMargin: costedRetailValue - costValue,
      uncosted,
    };
  }, [filtered]);

  function setStatus(next: FilterKey) {
    const copy = new URLSearchParams(params);
    copy.delete("filter");
    if (next === "all") copy.delete("status");
    else copy.set("status", next);
    setParams(copy);
  }

  function replaceItem(updated: StockItem) {
    setItems((prev) => prev.map((i) => (i.key === updated.key ? updated : i)));
  }

  async function handleQuickDelta(item: StockItem, delta: number) {
    const target = item.stockQuantity + delta;
    if (target < 0) return;
    setQuickBusyKey(item.key);
    setQuickError(null);
    try {
      const { item: updated } = await inventoryApi.adjust({
        productId: item.productId,
        variantId: item.variantId,
        reason: "correction",
        newQuantity: target,
        note: `Quick ${delta > 0 ? `+${delta}` : delta} stock adjustment from Stock Levels`,
      });
      replaceItem(updated);
      setToast(
        `${itemName(updated)}: ${updated.stockQuantity} on hand · Retail value ${formatKes(stockRetailValue(updated))}.`,
      );
    } catch (err) {
      setQuickError(errorMessage(err, "Could not update stock quantity."));
    } finally {
      setQuickBusyKey(null);
    }
  }

  function exportCsv() {
    downloadCsv(`jocta-stock-${todayInNairobi()}.csv`, [
      [
        "Product",
        "Variant",
        "SKU",
        "OEM Part #",
        "Brand",
        "Category",
        "On Hand",
        "Reorder Level",
        "Status",
        "Selling Price (KES)",
        "Retail Value (KES)",
        "Unit Cost (KES)",
        "Cost Value (KES)",
        "Last Movement",
      ],
      ...filtered.map((i) => [
        i.productName,
        i.variantName ?? "",
        i.sku,
        i.oemPartNumber ?? "",
        i.brandName ?? "",
        i.categoryName ?? "",
        i.stockQuantity,
        i.reorderLevel,
        i.status,
        i.priceKes,
        stockRetailValue(i).toFixed(2),
        i.costPriceKes ?? "",
        i.costPriceKes ? stockCostValue(i).toFixed(2) : "",
        formatDateTime(i.lastMovementAt),
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Levels & Valuation"
        subtitle="Live quantities, selling prices, unit costs, and retail & cost valuation for every product and variant."
        actions={
          <>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="neo-button-secondary text-xs py-2 px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="neo-button-secondary text-xs py-2 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      {/* Live Valuation Summary Strip — adjusts dynamically with quantity, price, cost & filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Stock value (retail)"
          value={formatKes(summary.retailValue)}
          tone="good"
          hint={`${summary.units} unit${summary.units === 1 ? "" : "s"} across ${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Stock value (cost)"
          value={formatKes(summary.costValue)}
          tone={summary.uncosted > 0 ? "warn" : "default"}
          hint={
            summary.uncosted > 0 ? (
              <button
                type="button"
                onClick={() => setStatus(statusFilter === "uncosted" ? "all" : "uncosted")}
                className="text-amber-700 font-semibold underline text-left"
              >
                {summary.uncosted} item{summary.uncosted === 1 ? "" : "s"} missing a cost — click to filter
              </button>
            ) : (
              `All ${filtered.length} item${filtered.length === 1 ? "" : "s"} have a unit cost`
            )
          }
        />
        <StatCard
          label="Projected gross margin"
          value={formatKes(summary.grossMargin)}
          tone={summary.grossMargin > 0 ? "good" : "default"}
          hint={
            summary.costedRetailValue > 0
              ? `${Math.round((summary.grossMargin / summary.costedRetailValue) * 100)}% margin on costed stock`
              : "Set unit costs to track gross margin"
          }
        />
        <StatCard
          label="Stock alerts"
          value={`${counts.low_stock} low · ${counts.out_of_stock} out`}
          tone={counts.out_of_stock > 0 ? "danger" : counts.low_stock > 0 ? "warn" : "good"}
          hint={`${counts.in_stock} of ${counts.all} items healthy`}
        />
      </div>

      {/* Filter pills + search */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `All (${counts.all})`],
              ["low_stock", `Low stock (${counts.low_stock})`],
              ["out_of_stock", `Out of stock (${counts.out_of_stock})`],
              ["in_stock", `In stock (${counts.in_stock})`],
              ["uncosted", `Missing cost (${counts.uncosted})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`rounded-neo-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === key
                  ? "bg-brand-red text-white"
                  : "bg-canvas-ivory text-ink-secondary hover:text-ink-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, OEM part #…"
              aria-label="Search stock"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by brand"
            className={inputClass}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
            className={inputClass}
          >
            <option value="name">Sort: name</option>
            <option value="value_desc">Sort: highest retail value</option>
            <option value="cost_desc">Sort: highest cost value</option>
            <option value="stock_asc">Sort: lowest stock</option>
            <option value="stock_desc">Sort: highest stock</option>
          </select>
        </div>
      </Card>

      {error && <Notice kind="error">{error}</Notice>}
      {quickError && (
        <Notice kind="error" onClose={() => setQuickError(null)}>
          {quickError}
        </Notice>
      )}
      {toast && (
        <Notice kind="success" onClose={() => setToast(null)}>
          {toast}
        </Notice>
      )}

      {/* Phones & narrow tablets: one card per item */}
      <div className="md:hidden space-y-2.5">
        {loading && items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">Loading stock…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">No stock items match those filters.</Card>
        ) : (
          filtered.map((item) => {
            const busy = quickBusyKey === item.key;
            const rVal = stockRetailValue(item);
            const cVal = stockCostValue(item);
            return (
              <Card key={item.key} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/inventory/products/${item.productId}/edit`}
                      className="font-bold text-sm text-ink-charcoal hover:text-brand-red leading-snug block"
                    >
                      {itemName(item)}
                    </Link>
                    <p className="font-mono text-[11px] text-ink-muted break-all">
                      {item.sku}
                      {item.oemPartNumber && item.oemPartNumber !== item.sku
                        ? ` · OEM ${item.oemPartNumber}`
                        : ""}
                    </p>
                  </div>
                  <StockBadge status={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-neo-sm bg-canvas-ivory px-3 py-2 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-ink-muted">On hand</p>
                    <div className="mt-1 inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busy || item.stockQuantity <= 0}
                        onClick={() => void handleQuickDelta(item, -1)}
                        aria-label={`Decrease stock for ${itemName(item)}`}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-neo-sm border border-surface-border bg-surface-white hover:border-brand-red disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-black text-ink-charcoal min-w-[1.75rem] text-center">
                        {item.stockQuantity}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleQuickDelta(item, 1)}
                        aria-label={`Increase stock for ${itemName(item)}`}
                        className="h-6 w-6 inline-flex items-center justify-center rounded-neo-sm border border-surface-border bg-surface-white hover:border-brand-red disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-ink-muted">Retail value</p>
                    <p className="font-black text-emerald-700">{formatKes(rVal)}</p>
                    <p className="text-[10px] text-ink-muted">@ {formatKes(item.priceKes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-ink-muted">Cost value</p>
                    <p className="font-bold text-ink-charcoal">
                      {item.costPriceKes ? (
                        formatKes(cVal)
                      ) : (
                        <span className="text-amber-700 font-semibold">Cost not set</span>
                      )}
                    </p>
                    {item.costPriceKes && (
                      <p className="text-[10px] text-ink-muted">@ {formatKes(item.costPriceKes)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setAdjusting(item)}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-neo-sm bg-ink-charcoal text-white py-2 font-bold hover:bg-brand-red transition-colors"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Adjust stock
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfiguring(item)}
                      aria-label={`Pricing, cost and reorder level for ${itemName(item)}`}
                      className="flex-1 inline-flex items-center justify-center rounded-neo-sm border border-surface-border py-2 hover:bg-canvas-ivory"
                      title="Edit selling price, unit cost & reorder level"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      to={`/inventory/movements?productId=${item.productId}${
                        item.variantId ? `&variantId=${item.variantId}` : ""
                      }`}
                      aria-label={`History for ${itemName(item)}`}
                      className="flex-1 inline-flex items-center justify-center rounded-neo-sm border border-surface-border py-2 hover:bg-canvas-ivory"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Item</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 font-bold text-center">On hand</th>
                <th className="px-3 py-3 font-bold text-right">Selling price</th>
                <th className="px-3 py-3 font-bold text-right">Retail value</th>
                <th className="px-3 py-3 font-bold text-right">Unit cost</th>
                <th className="px-3 py-3 font-bold text-right">Cost value</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-ink-muted">
                    Loading stock…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-ink-muted">
                    No stock items match those filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const busy = quickBusyKey === item.key;
                  const rVal = stockRetailValue(item);
                  const cVal = stockCostValue(item);
                  return (
                    <tr
                      key={item.key}
                      className={!item.isActive ? "opacity-50" : "hover:bg-canvas-ivory/50"}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/inventory/products/${item.productId}/edit`}
                          className="font-bold text-ink-charcoal hover:text-brand-red"
                        >
                          {itemName(item)}
                        </Link>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {item.sku}
                          {item.oemPartNumber && item.oemPartNumber !== item.sku
                            ? ` · OEM ${item.oemPartNumber}`
                            : ""}
                          {item.categoryName ? ` · ${item.categoryName}` : ""}
                          {!item.isPublished ? " · Draft" : ""}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StockBadge status={item.status} />
                        <p className="mt-0.5 text-[10px] text-ink-muted">
                          {item.stockQuantity < 3 ? (
                            <span className="font-bold text-amber-700">Restock needed (&lt; 3)</span>
                          ) : (
                            `Reorder ≤ ${item.reorderLevel}`
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border bg-canvas-ivory p-0.5">
                          <button
                            type="button"
                            disabled={busy || item.stockQuantity <= 0}
                            onClick={() => void handleQuickDelta(item, -1)}
                            aria-label={`Decrease stock for ${itemName(item)}`}
                            className="h-6 w-6 inline-flex items-center justify-center rounded-neo-sm bg-surface-white text-ink-charcoal hover:bg-brand-red hover:text-white disabled:opacity-40 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-black text-ink-charcoal min-w-[2.25rem] text-center">
                            {item.stockQuantity}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleQuickDelta(item, 1)}
                            aria-label={`Increase stock for ${itemName(item)}`}
                            className="h-6 w-6 inline-flex items-center justify-center rounded-neo-sm bg-surface-white text-ink-charcoal hover:bg-brand-red hover:text-white disabled:opacity-40 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-ink-charcoal">
                        {formatKes(item.priceKes)}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-emerald-700">
                        {formatKes(rVal)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {item.costPriceKes ? (
                          <span className="font-semibold text-ink-charcoal">
                            {formatKes(item.costPriceKes)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfiguring(item)}
                            className="text-amber-700 font-semibold underline"
                          >
                            Set cost
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-ink-charcoal">
                        {item.costPriceKes ? formatKes(cVal) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjusting(item)}
                            className="inline-flex items-center gap-1 rounded-neo-sm bg-ink-charcoal text-white px-2.5 py-1.5 font-bold hover:bg-brand-red transition-colors"
                          >
                            <Wrench className="h-3 w-3" />
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfiguring(item)}
                            title="Selling price, unit cost & reorder level"
                            aria-label={`Pricing, cost and reorder level for ${itemName(item)}`}
                            className="rounded-neo-sm border border-surface-border px-2 py-1.5 font-semibold text-ink-secondary hover:bg-canvas-ivory hover:text-ink-charcoal inline-flex items-center gap-1"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Price & Cost</span>
                          </button>
                          <Link
                            to={`/inventory/movements?productId=${item.productId}${
                              item.variantId ? `&variantId=${item.variantId}` : ""
                            }`}
                            title="Stock history"
                            aria-label={`History for ${itemName(item)}`}
                            className="p-1.5 rounded-neo-sm border border-surface-border hover:bg-canvas-ivory"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-canvas-ivory border-t-2 border-surface-border text-xs font-black text-ink-charcoal">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wide text-[10px] text-ink-muted" colSpan={2}>
                    Total ({filtered.length} item{filtered.length === 1 ? "" : "s"})
                  </td>
                  <td className="px-3 py-3 text-center">{summary.units} units</td>
                  <td className="px-3 py-3 text-right text-ink-muted">—</td>
                  <td className="px-3 py-3 text-right text-emerald-700">
                    {formatKes(summary.retailValue)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">—</td>
                  <td className="px-3 py-3 text-right">
                    {summary.costValue > 0 ? formatKes(summary.costValue) : "—"}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {adjusting && (
        <AdjustStockModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(updated, delta) => {
            replaceItem(updated);
            setAdjusting(null);
            setToast(
              delta === 0
                ? `${itemName(updated)} was already at ${updated.stockQuantity}.`
                : `${itemName(updated)}: ${delta > 0 ? `+${delta}` : delta} → ${updated.stockQuantity} on hand · Retail value ${formatKes(stockRetailValue(updated))}.`,
            );
          }}
        />
      )}

      {configuring && (
        <ItemSettingsModal
          item={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(updated) => {
            replaceItem(updated);
            setConfiguring(null);
            setToast(
              `Saved pricing & settings for ${itemName(updated)} · Retail value ${formatKes(stockRetailValue(updated))}.`,
            );
          }}
        />
      )}
    </div>
  );
}

export function AdjustStockModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockItem;
  onClose: () => void;
  onSaved: (item: StockItem, delta: number) => void;
}) {
  const [reason, setReason] = useState<ManualAdjustReason>("receive");
  const [amount, setAmount] = useState("1");
  const [unitCost, setUnitCost] = useState(item.costPriceKes ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExact = reason === "correction";
  const isRemoving = reason === "damage" || reason === "internal_use";
  const parsed = parseInt(amount, 10);
  const next = Number.isNaN(parsed)
    ? item.stockQuantity
    : isExact
      ? parsed
      : item.stockQuantity + (isRemoving ? -Math.abs(parsed) : Math.abs(parsed));
  const delta = next - item.stockQuantity;

  const unitPrice = parseFloat(item.priceKes) || 0;
  const effectiveUnitCost =
    reason === "receive" && unitCost.trim() !== ""
      ? parseFloat(unitCost) || 0
      : item.costPriceKes
        ? parseFloat(item.costPriceKes) || 0
        : null;
  const nextRetailValue = Math.max(0, next) * unitPrice;
  const retailDelta = delta * unitPrice;
  const nextCostValue =
    effectiveUnitCost !== null ? Math.max(0, next) * effectiveUnitCost : null;

  function changeReason(nextReason: ManualAdjustReason) {
    setReason(nextReason);
    if (nextReason === "correction") setAmount(String(item.stockQuantity));
    else if (amount === String(item.stockQuantity) || parseInt(amount, 10) <= 0) setAmount("1");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = isExact
        ? {
            productId: item.productId,
            variantId: item.variantId,
            reason,
            newQuantity: parsed,
            note,
          }
        : {
            productId: item.productId,
            variantId: item.variantId,
            reason,
            delta: isRemoving ? -Math.abs(parsed) : Math.abs(parsed),
            note,
            unitCostKes: reason === "receive" && unitCost.trim() ? unitCost.trim() : undefined,
          };
      const result = await inventoryApi.adjust(payload);
      onSaved(result.item, result.movement?.delta ?? 0);
    } catch (err) {
      setError(errorMessage(err, "Could not adjust stock."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Adjust stock · ${itemName(item)}`} onClose={onClose}>
      <p className="text-xs text-ink-secondary">
        Current on hand: <span className="font-bold text-ink-charcoal">{item.stockQuantity}</span> ·
        Selling price: <span className="font-bold text-ink-charcoal">{formatKes(item.priceKes)}</span> ·
        Reorder at: {item.reorderLevel}
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-3.5 text-xs">
        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-reason">
            Reason
          </label>
          <select
            id="adj-reason"
            value={reason}
            onChange={(e) => changeReason(e.target.value as ManualAdjustReason)}
            className={inputClass}
          >
            {MANUAL_ADJUST_REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">{REASON_HELP[reason]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-qty">
              {isExact ? "New quantity on hand" : isRemoving ? "Units to remove" : "Units to add"}
            </label>
            <input
              id="adj-qty"
              type="number"
              min={isExact ? 0 : 1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          {reason === "receive" && (
            <div>
              <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-cost">
                Unit cost (KES)
              </label>
              <input
                id="adj-cost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-note">
            Note
          </label>
          <input
            id="adj-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Supplier, job card, customer name…"
            maxLength={500}
            className={inputClass}
          />
        </div>

        <div className="rounded-neo-sm bg-canvas-ivory px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Resulting on hand</span>
            <span className={`text-sm font-black ${next < 0 ? "text-brand-red" : "text-ink-charcoal"}`}>
              {next} units ({delta >= 0 ? `+${delta}` : delta})
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-surface-border/60 pt-1.5">
            <span className="text-ink-secondary">Resulting stock value (retail)</span>
            <span className="font-black text-emerald-700">
              {formatKes(nextRetailValue)}{" "}
              {delta !== 0 && (
                <span className="text-[11px] font-semibold text-ink-muted">
                  ({retailDelta >= 0 ? `+${formatKes(retailDelta)}` : `−${formatKes(Math.abs(retailDelta))}`})
                </span>
              )}
            </span>
          </div>
          {nextCostValue !== null && (
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Resulting stock value (cost)</span>
              <span className="font-bold text-ink-charcoal">{formatKes(nextCostValue)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="neo-button-secondary text-xs py-2 px-3.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || next < 0 || (!isExact && delta === 0)}
            className="neo-button-primary text-xs py-2 px-4"
          >
            {saving ? "Saving…" : "Save adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ItemSettingsModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockItem;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
}) {
  const [price, setPrice] = useState(String(parseFloat(item.priceKes) || 0));
  const [cost, setCost] = useState(item.costPriceKes ?? "");
  const [reorder, setReorder] = useState(String(item.reorderLevel));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitPrice = parseFloat(price) || 0;
  const unitCost = cost.trim() ? parseFloat(cost) || 0 : null;
  const qty = Math.max(0, item.stockQuantity);
  const previewRetailValue = qty * unitPrice;
  const previewCostValue = unitCost !== null ? qty * unitCost : null;
  const unitMargin = unitCost !== null ? unitPrice - unitCost : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await inventoryApi.updateSettings({
        productId: item.productId,
        variantId: item.variantId,
        reorderLevel: parseInt(reorder, 10) || 0,
        costPriceKes: cost.trim() ? cost.trim() : null,
        priceKes: price.trim() ? price.trim() : undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Pricing, cost & reorder · ${itemName(item)}`} onClose={onClose}>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="cfg-price">
              Selling / Retail price (KES)
            </label>
            <input
              id="cfg-price"
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Used for storefront price and Stock Value (Retail).
            </p>
          </div>
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="cfg-cost">
              Unit cost price (KES)
            </label>
            <input
              id="cfg-cost"
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Leave blank if unknown"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              What one unit costs Jocta. Used for Stock Value (Cost) & profit.
            </p>
          </div>
        </div>

        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="cfg-reorder">
            Low-stock reorder level
          </label>
          <input
            id="cfg-reorder"
            type="number"
            min={0}
            max={100000}
            required
            value={reorder}
            onChange={(e) => setReorder(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-ink-muted">
            Flagged as low stock when on-hand quantity falls to or below this number.
          </p>
        </div>

        <div className="rounded-neo-sm bg-canvas-ivory px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Current units on hand</span>
            <span className="font-black text-ink-charcoal">{qty} units</span>
          </div>
          <div className="flex items-center justify-between border-t border-surface-border/60 pt-1.5">
            <span className="text-ink-secondary">Stock value (retail)</span>
            <span className="font-black text-emerald-700">{formatKes(previewRetailValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Stock value (cost)</span>
            <span className="font-bold text-ink-charcoal">
              {previewCostValue !== null ? formatKes(previewCostValue) : "Cost not set"}
            </span>
          </div>
          {unitMargin !== null && (
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">Unit margin</span>
              <span className={`font-bold ${unitMargin >= 0 ? "text-emerald-700" : "text-brand-red"}`}>
                {formatKes(unitMargin)} / unit
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="neo-button-secondary text-xs py-2 px-3.5"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="neo-button-primary text-xs py-2 px-4">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
