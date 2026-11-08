import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, PackagePlus, RefreshCw, ShoppingCart } from "lucide-react";
import type { InventoryDashboard } from "@jocta/shared";
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
import { useCatalogRefresh } from "../lib/sync";

export function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await inventoryApi.getDashboard());
    } catch (err) {
      setError(errorMessage(err, "Failed to load the inventory dashboard."));
    } finally {
      setLoading(false);
    }
  }

  // Reload when products, stock or sales change in admin or inventory
  useCatalogRefresh(() => void load());

  useEffect(() => {
    void load();
  }, []);

  const stats = data?.stats;
  const sales = data?.salesLast30Days;
  const maxActivity = Math.max(
    1,
    ...(data?.activity ?? []).map((p) => Math.max(p.unitsIn, p.unitsOut)),
  );
  const margin =
    sales && parseFloat(sales.costedRevenueKes) > 0
      ? Math.round((parseFloat(sales.grossProfitKes) / parseFloat(sales.costedRevenueKes)) * 100)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand, what it is worth, and what needs reordering."
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
            <Link to="/inventory/sales/new" className="neo-button-primary text-xs py-2 px-3.5">
              <ShoppingCart className="h-4 w-4" />
              Record Sale
            </Link>
          </>
        }
      />

      {error && (
        <Notice kind="error">
          {error}{" "}
          <button type="button" onClick={load} className="underline">
            Retry
          </button>
        </Notice>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            to: "/inventory/receive",
            icon: PackagePlus,
            title: "Receive stock",
            text: "Log a supplier delivery and its costs.",
          },
          {
            to: "/inventory/stock-take",
            icon: ClipboardCheck,
            title: "Stock take",
            text: "Count the shelves and fix differences.",
          },
          {
            to: "/inventory/sales/new",
            icon: ShoppingCart,
            title: "Record a sale",
            text: "Walk-in, phone or WhatsApp orders.",
          },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="neo-card-interactive rounded-neo border border-surface-border bg-surface-white p-4 flex items-start gap-3"
          >
            <span className="h-9 w-9 shrink-0 rounded-neo-sm bg-brand-red-tint text-brand-red flex items-center justify-center">
              <a.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink-charcoal">{a.title}</span>
              <span className="block text-xs text-ink-secondary">{a.text}</span>
            </span>
          </Link>
        ))}
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-xs text-ink-muted">
          <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
          Loading inventory…
        </div>
      ) : stats && sales ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Stock value (cost)"
              value={formatKes(stats.stockCostValueKes)}
              hint={
                stats.uncosted > 0 ? (
                  <Link to="/inventory/stock?filter=uncosted" className="text-amber-700 underline">
                    {stats.uncosted} item{stats.uncosted === 1 ? "" : "s"} missing a cost
                  </Link>
                ) : (
                  "All stocked items have a cost"
                )
              }
            />
            <StatCard
              label="Stock value (retail)"
              value={formatKes(stats.stockRetailValueKes)}
              hint={`${stats.totalUnits.toLocaleString("en-KE")} units across ${stats.totalItems} items`}
            />
            <StatCard
              label="Low stock"
              value={stats.lowStock}
              tone={stats.lowStock > 0 ? "warn" : "good"}
              hint={<Link to="/inventory/stock?filter=low" className="underline">View items</Link>}
            />
            <StatCard
              label="Out of stock"
              value={stats.outOfStock}
              tone={stats.outOfStock > 0 ? "danger" : "good"}
              hint={<Link to="/inventory/stock?filter=out" className="underline">View items</Link>}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Sales · last 30 days" value={formatKes(sales.revenueKes)} hint={`${sales.transactions} sales, ${sales.unitsSold} units`} />
            <StatCard
              label="Gross profit · 30 days"
              value={formatKes(sales.grossProfitKes)}
              tone="good"
              hint={margin !== null ? `${margin}% margin on costed sales` : "Record costs to see profit"}
            />
            <div className="col-span-2">
              <Card className="p-4 h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                    Stock movement · 14 days
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-ink-secondary">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> In
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-brand-red" /> Out
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1 h-20" aria-label="Units in and out per day">
                  {data!.activity.map((p) => (
                    <div
                      key={p.date}
                      className="flex-1 flex items-end gap-px h-full"
                      title={`${formatDay(p.date)}: +${p.unitsIn} in, −${p.unitsOut} out`}
                    >
                      <div
                        className="flex-1 rounded-t-sm bg-emerald-500"
                        style={{ height: `${(p.unitsIn / maxActivity) * 100}%` }}
                      />
                      <div
                        className="flex-1 rounded-t-sm bg-brand-red"
                        style={{ height: `${(p.unitsOut / maxActivity) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
                  <span>{formatDay(data!.activity[0].date)}</span>
                  <span>Today</span>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
                  Needs reordering
                </h2>
                <Link to="/inventory/stock?filter=low" className="text-xs font-bold text-brand-red hover:underline">
                  All stock
                </Link>
              </div>
              {data!.lowStockItems.length === 0 ? (
                <p className="mt-4 text-xs text-ink-muted">Everything is above its reorder level.</p>
              ) : (
                <ul className="mt-3 divide-y divide-surface-border">
                  {data!.lowStockItems.map((item) => (
                    <li key={item.key} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink-charcoal truncate">{itemName(item)}</p>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {item.sku} · reorder at {item.reorderLevel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-ink-charcoal">{item.stockQuantity}</span>
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
                  Recent activity
                </h2>
                <Link to="/inventory/movements" className="text-xs font-bold text-brand-red hover:underline">
                  Full history
                </Link>
              </div>
              {data!.recentMovements.length === 0 ? (
                <p className="mt-4 text-xs text-ink-muted">No stock movements yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-surface-border">
                  {data!.recentMovements.map((m) => (
                    <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink-charcoal truncate">{itemName(m)}</p>
                        <p className="text-[10px] text-ink-muted">
                          {REASON_LABELS[m.reason]} · {formatDateTime(m.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 text-xs">
                        <DeltaText delta={m.delta} />
                        <p className="text-[10px] text-ink-muted">→ {m.balanceAfter}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
