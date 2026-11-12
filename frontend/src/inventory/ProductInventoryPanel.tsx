import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, SlidersHorizontal, Warehouse, Wrench } from "lucide-react";
import type { StockItem, StockMovement } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import { DeltaText, REASON_LABELS, StockBadge, formatDateTime } from "./ui";
import {
  AdjustStockModal,
  ItemSettingsModal,
  stockCostValue,
  stockRetailValue,
} from "./StockLevelsPage";
import { useCatalogRefresh } from "../lib/sync";

/**
 * Shown on the product edit form so whoever is editing a product can see its
 * real shelf count, retail & cost stock valuation, reorder level, and latest
 * stock movements — and adjust stock or pricing/cost inline without leaving.
 */
export function ProductInventoryPanel({
  productId,
  onItemUpdated,
}: {
  productId: string;
  onItemUpdated?: (item: StockItem) => void;
}) {
  const [items, setItems] = useState<StockItem[] | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [configuring, setConfiguring] = useState<StockItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      inventoryApi.getItems(),
      inventoryApi.getMovements({ productId, limit: 5 }),
    ])
      .then(([all, moves]) => {
        if (cancelled) return;
        setItems(all.filter((i) => i.productId === productId));
        setMovements(moves);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useCatalogRefresh(() => {
    Promise.all([
      inventoryApi.getItems(),
      inventoryApi.getMovements({ productId, limit: 5 }),
    ])
      .then(([all, moves]) => {
        setItems(all.filter((i) => i.productId === productId));
        setMovements(moves);
      })
      .catch(() => undefined);
  });

  if (!items || items.length === 0) return null;

  const activeItems = items.filter((i) => i.isActive !== false);
  const totalUnits = activeItems.reduce((s, i) => s + Math.max(0, i.stockQuantity), 0);
  const totalRetailValue = activeItems.reduce((s, i) => s + stockRetailValue(i), 0);
  const totalCostValue = activeItems.reduce((s, i) => s + stockCostValue(i), 0);
  const anyCostSet = activeItems.some((i) => i.costPriceKes !== null);

  return (
    <div className="rounded-neo border border-surface-border bg-canvas-ivory/70 p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-black text-ink-charcoal uppercase tracking-tight flex items-center gap-1.5">
          <Warehouse className="h-4 w-4 text-brand-red" />
          Live Inventory & Stock Valuation
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="font-bold text-ink-charcoal">
            On hand: <span className="font-black">{totalUnits} units</span>
          </span>
          <span className="font-bold text-emerald-700">
            Retail value: <span className="font-black">{formatKes(totalRetailValue)}</span>
          </span>
          <span className="font-bold text-ink-secondary">
            Cost value:{" "}
            <span className="font-black text-ink-charcoal">
              {anyCostSet ? formatKes(totalCostValue) : "Not set"}
            </span>
          </span>
          <Link
            to={`/inventory/movements?productId=${productId}`}
            className="inline-flex items-center gap-1 font-bold text-brand-red hover:underline"
          >
            <History className="h-3.5 w-3.5" />
            Stock history
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-surface-border rounded-neo-sm border border-surface-border bg-surface-white">
        {items.map((item) => {
          const rVal = stockRetailValue(item);
          const cVal = stockCostValue(item);
          return (
            <li
              key={item.key}
              className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <p className="font-bold text-ink-charcoal">
                  {item.variantName ?? "Main unit"}
                  {!item.isActive ? " (inactive)" : ""}
                </p>
                <p className="font-mono text-[10px] text-ink-muted">
                  {item.sku} · reorder at {item.reorderLevel} ·{" "}
                  {item.costPriceKes ? `cost ${formatKes(item.costPriceKes)}` : "cost not set"} ·{" "}
                  retail {formatKes(item.priceKes)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-right mr-1">
                  <p className="text-xs font-black text-emerald-700">
                    {formatKes(rVal)} <span className="text-[10px] font-semibold text-ink-muted">retail</span>
                  </p>
                  {item.costPriceKes && (
                    <p className="text-[10px] font-semibold text-ink-muted">
                      {formatKes(cVal)} cost
                    </p>
                  )}
                </div>
                <span className="text-sm font-black text-ink-charcoal">{item.stockQuantity}</span>
                <StockBadge status={item.status} />
                <button
                  type="button"
                  onClick={() => setAdjusting(item)}
                  className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border px-2 py-1 font-bold text-ink-charcoal hover:border-brand-red hover:text-brand-red"
                >
                  <Wrench className="h-3 w-3" />
                  Adjust
                </button>
                <button
                  type="button"
                  onClick={() => setConfiguring(item)}
                  className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border px-2 py-1 font-bold text-ink-secondary hover:border-brand-red hover:text-brand-red"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Price & Cost
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {movements.length > 0 && (
        <div className="space-y-1 text-[11px] text-ink-secondary">
          <p className="font-bold uppercase text-[10px] text-ink-muted">Recent movements</p>
          {movements.map((m) => (
            <p key={m.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {REASON_LABELS[m.reason]} · {formatDateTime(m.createdAt)}
                {m.note ? ` — ${m.note}` : ""}
              </span>
              <span className="shrink-0">
                <DeltaText delta={m.delta} /> → {m.balanceAfter}
              </span>
            </p>
          ))}
        </div>
      )}

      {adjusting && (
        <AdjustStockModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(updated) => {
            setItems((prev) => (prev ? prev.map((i) => (i.key === updated.key ? updated : i)) : prev));
            setAdjusting(null);
            onItemUpdated?.(updated);
          }}
        />
      )}

      {configuring && (
        <ItemSettingsModal
          item={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(updated) => {
            setItems((prev) => (prev ? prev.map((i) => (i.key === updated.key ? updated : i)) : prev));
            setConfiguring(null);
            onItemUpdated?.(updated);
          }}
        />
      )}
    </div>
  );
}
