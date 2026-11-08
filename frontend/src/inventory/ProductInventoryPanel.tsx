import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, History, SlidersHorizontal } from "lucide-react";
import type { StockItem } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import { useCatalogRefresh } from "../lib/sync";
import { StockBadge, errorMessage } from "./ui";

/**
 * The inventory side of one product, shown on the product edit page in both
 * the admin panel and the inventory system: each stock item's quantity,
 * reorder level and cost, with links to adjust stock or see its history.
 */
export function ProductInventoryPanel({ productId }: { productId: string }) {
  const [items, setItems] = useState<StockItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await inventoryApi.getItems();
      setItems(all.filter((i) => i.productId === productId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Could not load stock for this product."));
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);
  useCatalogRefresh(() => void load());

  const hasVariants = items?.some((i) => i.variantId) ?? false;

  return (
    <div className="rounded-neo border border-surface-border bg-surface-white p-5 shadow-neo space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal flex items-center gap-2">
          <Boxes className="h-4 w-4 text-brand-red" />
          Inventory
        </h2>
        <Link
          to={`/inventory/movements?productId=${productId}`}
          className="neo-button-secondary text-xs py-1.5 px-3"
        >
          <History className="h-3.5 w-3.5" />
          Stock history
        </Link>
      </div>

      {error && <p className="text-xs font-semibold text-brand-red">{error}</p>}
      {!items && !error && <p className="text-xs text-ink-muted">Loading stock…</p>}

      {items && items.length > 0 && (
        <ul className="divide-y divide-surface-border">
          {items.map((item) => (
            <li key={item.key} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-ink-charcoal">{item.variantName ?? "Stock on hand"}</p>
                <p className="text-ink-muted">
                  <span className="font-mono">{item.sku}</span> · reorder at {item.reorderLevel} · cost{" "}
                  {item.costPriceKes ? formatKes(item.costPriceKes) : <span className="text-amber-700 font-bold">not set</span>}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-black text-ink-charcoal">{item.stockQuantity}</span>
                <StockBadge status={item.status} />
                <Link
                  to={`/inventory/stock?q=${encodeURIComponent(item.sku)}`}
                  className="neo-button-secondary text-[11px] py-1.5 px-2.5"
                  title="Adjust stock, reorder level or cost in Inventory"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Adjust
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-ink-muted leading-relaxed">
        {hasVariants
          ? "Stock for this product is counted per option. Change each option's stock below or in Inventory; the product total updates automatically."
          : "Stock changes made here or in Inventory are the same figure and are recorded in the stock history."}
      </p>
    </div>
  );
}
