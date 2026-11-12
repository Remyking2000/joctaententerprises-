import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import type { InventoryDashboard, StockItem } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  Card,
  DeltaText,
  Notice,
  PageHeader,
  REASON_LABELS,
  StatCard,
  StockBadge,
  errorMessage,
  formatDateTime,
  formatDay,
  itemName,
} from "./ui";
import {
  AdjustStockModal,
  ItemSettingsModal,
  stockCostValue,
  stockRetailValue,
} from "./StockLevelsPage";
import { useCatalogRefresh } from "../lib/sync";

export function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [quickBusyKey, setQuickBusyKey] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [configuring, setConfiguring] = useState<StockItem | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, stockItems] = await Promise.all([
        inventoryApi.getDashboard(),
        inventoryApi.getItems(),
      ]);
      setData(dashboardData);
      setItems(stockItems);
    } catch (err) {
      setError(errorMessage(err, "Failed to load inventory overview."));
    } finally {
      setLoading(false);
    }
  }

  // Reload when products, stock or sales change in admin or inventory
  useCatalogRefresh(() => void load());

  useEffect(() => {
    void load();
  }, []);

  const activeItems = useMemo(
    () =>
      items
        .filter((i) => i.isActive !== false)
        .sort((a, b) => stockRetailValue(b) - stockRetailValue(a) || itemName(a).localeCompare(itemName(b))),
    [items],
  );

  async function handleQuickDelta(item: StockItem, delta: number) {
    const target = item.stockQuantity + delta;
    if (target < 0) return;
    setQuickBusyKey(item.key);
    setError(null);
    try {
      const { item: updated } = await inventoryApi.adjust({
        productId: item.productId,
        variantId: item.variantId,
        reason: "correction",
        newQuantity: target,
        note: `Quick ${delta > 0 ? `+${delta}` : delta} stock adjustment from Overview`,
      });
      setToast(
        `${itemName(updated)}: ${updated.stockQuantity} on hand · Retail value ${formatKes(stockRetailValue(updated))}.`,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not adjust stock quantity."));
    } finally {
      setQuickBusyKey(null);
    }
  }

  if (loading && !data) {
    return <Card className="p-10 text-center text-sm text-ink-muted">Loading inventory…</Card>;
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Notice kind="error">{error}</Notice>
        <button type="button" onClick={load} className="neo-button-secondary text-xs">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;
  const { stats, lowStockItems, recentMovements, activity, salesLast30Days } = data;
  const maxActivity = Math.max(1, ...activity.flatMap((a) => [a.unitsIn, a.unitsOut]));
  const costedRev = parseFloat(salesLast30Days.costedRevenueKes);
  const marginPct =
    costedRev > 0 ? Math.round((parseFloat(salesLast30Days.grossProfitKes) / costedRev) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Overview"
        subtitle="Live stock levels, retail & cost valuation, recent movements, and 30-day sales."
        actions={
          <>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="neo-button-secondary text-xs py-2 px-3"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link to="/inventory/receive" className="neo-button-secondary text-xs py-2 px-3.5">
              <PackagePlus className="h-4 w-4" />
              Receive Stock
            </Link>
            <Link to="/inventory/stock-take" className="neo-button-secondary text-xs py-2 px-3.5">
              <ClipboardCheck className="h-4 w-4" />
              Stock Take
            </Link>
            <Link to="/inventory/sales/new" className="neo-button-primary text-xs py-2 px-3.5">
              <ShoppingCart className="h-4 w-4" />
              Record Sale
            </Link>
          </>
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {toast && (
        <Notice kind="success" onClose={() => setToast(null)}>
          {toast}
        </Notice>
      )}

      {/* Primary figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Stock value (cost)"
          value={formatKes(stats.stockCostValueKes)}
          tone={stats.uncosted > 0 && parseFloat(stats.stockCostValueKes) === 0 ? "warn" : "default"}
          hint={
            stats.uncosted > 0 ? (
              <Link to="/inventory/stock?status=uncosted" className="text-amber-700 font-semibold underline">
                {stats.uncosted} item{stats.uncosted === 1 ? "" : "s"} missing a cost
              </Link>
            ) : (
              `Across ${stats.totalUnits} units on hand`
            )
          }
        />
        <StatCard
          label="Stock value (retail)"
          value={formatKes(stats.stockRetailValueKes)}
          tone="good"
          hint={
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>
                {stats.totalUnits} unit{stats.totalUnits === 1 ? "" : "s"} across {stats.totalItems} item
                {stats.totalItems === 1 ? "" : "s"}
              </span>
              <Link to="/inventory/stock?sort=value_desc" className="font-semibold text-brand-red underline">
                Breakdown
              </Link>
            </span>
          }
        />
        <StatCard
          label="Low stock"
          value={stats.lowStock}
          tone={stats.lowStock > 0 ? "warn" : "good"}
          hint={
            <Link to="/inventory/stock?status=low_stock" className="underline">
              View items
            </Link>
          }
        />
        <StatCard
          label="Out of stock"
          value={stats.outOfStock}
          tone={stats.outOfStock > 0 ? "danger" : "good"}
          hint={
            <Link to="/inventory/stock?status=out_of_stock" className="underline">
              View items
            </Link>
          }
        />
      </div>

      {/* Live Stock Valuation Breakdown by Product */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
              Stock Valuation by Product
            </h2>
            <p className="text-xs text-ink-secondary">
              Adjust quantity, selling price, or unit cost below — Stock Value (Retail) and Stock Value (Cost) update automatically.
            </p>
          </div>
          <Link
            to="/inventory/stock"
            className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1"
          >
            Full stock table <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {activeItems.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-muted">
            No products in inventory yet.{" "}
            <Link to="/inventory/products/new" className="font-bold text-brand-red underline">
              Add a product
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Product</th>
                  <th className="px-2.5 py-2.5 font-bold">Status</th>
                  <th className="px-2.5 py-2.5 font-bold text-center">On hand</th>
                  <th className="px-2.5 py-2.5 font-bold text-right">Selling price</th>
                  <th className="px-2.5 py-2.5 font-bold text-right">Retail value</th>
                  <th className="px-2.5 py-2.5 font-bold text-right">Unit cost</th>
                  <th className="px-2.5 py-2.5 font-bold text-right">Cost value</th>
                  <th className="px-3 py-2.5 font-bold text-right">Quick actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {activeItems.map((item) => {
                  const busy = quickBusyKey === item.key;
                  const rVal = stockRetailValue(item);
                  const cVal = stockCostValue(item);
                  return (
                    <tr key={item.key} className="hover:bg-canvas-ivory/50">
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/inventory/products/${item.productId}/edit`}
                          className="font-bold text-ink-charcoal hover:text-brand-red"
                        >
                          {itemName(item)}
                        </Link>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {item.sku}
                          {item.brandName ? ` · ${item.brandName}` : ""}
                        </p>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <StockBadge status={item.status} />
                      </td>
                      <td className="px-2.5 py-2.5 text-center">
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
                          <span className="text-sm font-black text-ink-charcoal min-w-[2rem] text-center">
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
                      <td className="px-2.5 py-2.5 text-right font-semibold text-ink-charcoal">
                        {formatKes(item.priceKes)}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-black text-emerald-700">
                        {formatKes(rVal)}
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
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
                      <td className="px-2.5 py-2.5 text-right font-bold text-ink-charcoal">
                        {item.costPriceKes ? formatKes(cVal) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
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
                            className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border px-2 py-1.5 font-semibold text-ink-secondary hover:bg-canvas-ivory hover:text-ink-charcoal"
                            title="Edit selling price, unit cost & reorder level"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Price & Cost
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-canvas-ivory border-t-2 border-surface-border text-xs font-black text-ink-charcoal">
                <tr>
                  <td className="px-3 py-2.5 uppercase tracking-wide text-[10px] text-ink-muted" colSpan={2}>
                    Total ({stats.totalItems} item{stats.totalItems === 1 ? "" : "s"})
                  </td>
                  <td className="px-2.5 py-2.5 text-center">{stats.totalUnits} units</td>
                  <td className="px-2.5 py-2.5 text-right text-ink-muted">—</td>
                  <td className="px-2.5 py-2.5 text-right text-emerald-700">
                    {formatKes(stats.stockRetailValueKes)}
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-ink-muted">—</td>
                  <td className="px-2.5 py-2.5 text-right">
                    {formatKes(stats.stockCostValueKes)}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Sales last 30 days + 14-day stock movement bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
                Sales · Last 30 days
              </h2>
              <p className="text-xs text-ink-secondary">
                {salesLast30Days.transactions} sales · {salesLast30Days.unitsSold} units sold
              </p>
            </div>
            <Link
              to="/inventory/reports"
              className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1"
            >
              Monthly report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface-border pt-4">
            <div>
              <p className="text-[11px] font-bold uppercase text-ink-muted">Revenue</p>
              <p className="mt-1 text-lg font-black text-ink-charcoal">
                {formatKes(salesLast30Days.revenueKes)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-ink-muted">Gross profit</p>
              <p className="mt-1 text-lg font-black text-emerald-700">
                {formatKes(salesLast30Days.grossProfitKes)}
              </p>
              <p className="text-[11px] text-ink-muted">
                {marginPct !== null
                  ? `${marginPct}% margin on costed items`
                  : "Set unit costs on stock to see profit"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
                Units In vs Out · 14 days
              </h2>
              <p className="text-xs text-ink-secondary">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />
                In (received, returned) ·{" "}
                <span className="inline-block h-2 w-2 rounded-full bg-brand-red mr-1" />
                Out (sold, damaged, used)
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-14 gap-1 items-end h-24" aria-label="14 day stock activity">
            {activity.map((point) => (
              <div
                key={point.date}
                className="flex flex-col items-center gap-1 h-full justify-end"
                title={`${formatDay(point.date)}: +${point.unitsIn} in, -${point.unitsOut} out`}
              >
                <div className="w-full flex gap-0.5 items-end flex-1">
                  <div
                    className="flex-1 bg-emerald-500 rounded-t-sm"
                    style={{
                      height: point.unitsIn
                        ? `${Math.max(8, Math.round((point.unitsIn / maxActivity) * 100))}%`
                        : "2px",
                      opacity: point.unitsIn ? 1 : 0.2,
                    }}
                  />
                  <div
                    className="flex-1 bg-brand-red rounded-t-sm"
                    style={{
                      height: point.unitsOut
                        ? `${Math.max(8, Math.round((point.unitsOut / maxActivity) * 100))}%`
                        : "2px",
                      opacity: point.unitsOut ? 1 : 0.2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
            <span>{activity[0] ? formatDay(activity[0].date) : ""}</span>
            <span>Today</span>
          </div>
        </Card>
      </div>

      {/* Needs restocking + recent movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs Restocking
            </h2>
            <Link
              to="/inventory/stock?status=low_stock"
              className="text-xs font-bold text-brand-red hover:underline"
            >
              All stock
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="mt-6 text-xs text-ink-muted py-6 text-center">
              Every active item is above its reorder level.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {lowStockItems.map((item) => (
                <li key={item.key} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-charcoal truncate">{itemName(item)}</p>
                    <p className="font-mono text-[10px] text-ink-muted">
                      {item.sku} · {item.stockQuantity < 3 ? (
                        <span className="font-bold text-amber-700">Restock needed (&lt; 3 units)</span>
                      ) : (
                        `reorder at ${item.reorderLevel}`
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-ink-charcoal">{item.stockQuantity}</span>
                    <StockBadge status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
              Recent Stock Movements
            </h2>
            <Link
              to="/inventory/movements"
              className="text-xs font-bold text-brand-red hover:underline"
            >
              Full history
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="mt-6 text-xs text-ink-muted py-6 text-center">No movements recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-border">
              {recentMovements.map((m) => (
                <li key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-charcoal truncate">{itemName(m)}</p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {REASON_LABELS[m.reason]} · {formatDateTime(m.createdAt)}
                      {m.note ? ` — ${m.note}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <DeltaText delta={m.delta} />
                    <p className="text-[10px] text-ink-muted">bal {m.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {adjusting && (
        <AdjustStockModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(updated, delta) => {
            setAdjusting(null);
            setToast(
              delta === 0
                ? `${itemName(updated)} was already at ${updated.stockQuantity}.`
                : `${itemName(updated)}: ${delta > 0 ? `+${delta}` : delta} → ${updated.stockQuantity} on hand · Retail value ${formatKes(stockRetailValue(updated))}.`,
            );
            void load();
          }}
        />
      )}

      {configuring && (
        <ItemSettingsModal
          item={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(updated) => {
            setConfiguring(null);
            setToast(
              `Saved pricing & settings for ${itemName(updated)} · Retail value ${formatKes(stockRetailValue(updated))}.`,
            );
            void load();
          }}
        />
      )}
    </div>
  );
}
