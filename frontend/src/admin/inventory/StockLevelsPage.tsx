import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, History, PackagePlus, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import {
  MANUAL_ADJUST_REASONS,
  type ManualAdjustReason,
  type StockItem,
} from "@jocta/shared";
import { inventoryApi } from "../../lib/api";
import { formatKes, PRODUCT_TYPE_LABELS } from "../../lib/format";
import {
  Card,
  Modal,
  Notice,
  PageHeader,
  REASON_LABELS,
  StockBadge,
  downloadCsv,
  errorMessage,
  formatDateTime,
  inputClass,
  itemName,
  todayInNairobi,
  useStockItems,
} from "./ui";

type Filter = "all" | "low" | "out" | "uncosted";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All items" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
  { id: "uncosted", label: "Missing cost" },
];

type SortKey = "name" | "stock_asc" | "stock_desc" | "value_desc";

function stockValue(item: StockItem): number {
  return item.costPriceKes ? parseFloat(item.costPriceKes) * item.stockQuantity : 0;
}

export function StockLevelsPage() {
  const { items, setItems, loading, error, reload } = useStockItems();
  const [params, setParams] = useSearchParams();
  const filter = (FILTERS.some((f) => f.id === params.get("filter"))
    ? params.get("filter")
    : "all") as Filter;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [configuring, setConfiguring] = useState<StockItem | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.categoryName).filter(Boolean) as string[])].sort(),
    [items],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      low: items.filter((i) => i.status === "low_stock").length,
      out: items.filter((i) => i.status === "out_of_stock").length,
      uncosted: items.filter((i) => i.costPriceKes === null && i.stockQuantity > 0).length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items.filter((i) => {
      if (filter === "low" && i.status !== "low_stock") return false;
      if (filter === "out" && i.status !== "out_of_stock") return false;
      if (filter === "uncosted" && !(i.costPriceKes === null && i.stockQuantity > 0)) return false;
      if (category && i.categoryName !== category) return false;
      if (!q) return true;
      return [i.productName, i.variantName ?? "", i.sku, i.oemPartNumber ?? "", i.brandName ?? ""]
        .some((f) => f.toLowerCase().includes(q));
    });
    const sorted = [...rows];
    if (sort === "stock_asc") sorted.sort((a, b) => a.stockQuantity - b.stockQuantity);
    if (sort === "stock_desc") sorted.sort((a, b) => b.stockQuantity - a.stockQuantity);
    if (sort === "value_desc") sorted.sort((a, b) => stockValue(b) - stockValue(a));
    return sorted;
  }, [items, filter, category, search, sort]);

  function replaceItem(updated: StockItem) {
    setItems((prev) => prev.map((i) => (i.key === updated.key ? updated : i)));
  }

  function exportCsv() {
    downloadCsv(`jocta-stock-${todayInNairobi()}.csv`, [
      ["Product", "Variant", "SKU", "OEM part", "Category", "Brand", "On hand", "Reorder level", "Status", "Cost (KES)", "Price (KES)", "Value at cost (KES)"],
      ...visible.map((i) => [
        i.productName,
        i.variantName ?? "",
        i.sku,
        i.oemPartNumber ?? "",
        i.categoryName ?? "",
        i.brandName ?? "",
        i.stockQuantity,
        i.reorderLevel,
        i.status.replace(/_/g, " "),
        i.costPriceKes ?? "",
        i.priceKes,
        i.costPriceKes ? stockValue(i).toFixed(2) : "",
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Levels"
        subtitle="Every product and variant on hand. Adjust a single item or set its reorder level and cost."
        actions={
          <>
            <button type="button" onClick={reload} disabled={loading} className="neo-button-secondary text-xs py-2 px-3">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={visible.length === 0} className="neo-button-secondary text-xs py-2 px-3">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <Link to="/admin/inventory/receive" className="neo-button-primary text-xs py-2 px-3.5">
              <PackagePlus className="h-4 w-4" />
              Receive Stock
            </Link>
          </>
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {success && (
        <Notice kind="success" onClose={() => setSuccess(null)}>
          {success}
        </Notice>
      )}

      <Card className="p-3.5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setParams(f.id === "all" ? {} : { filter: f.id })}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                filter === f.id
                  ? "bg-brand-red text-white border-brand-red"
                  : "border-surface-border text-ink-secondary hover:text-ink-charcoal"
              }`}
            >
              {f.label} <span className="opacity-75">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, OEM part or brand…"
              aria-label="Search stock"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={inputClass}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className={inputClass}>
            <option value="name">Sort: name</option>
            <option value="stock_asc">Sort: lowest stock</option>
            <option value="stock_desc">Sort: highest stock</option>
            <option value="value_desc">Sort: highest value</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-bold min-w-[11rem]">Item</th>
                <th className="px-3 py-3 font-bold text-right">On hand</th>
                <th className="px-3 py-3 font-bold hidden sm:table-cell">Status</th>
                <th className="px-3 py-3 font-bold text-right hidden md:table-cell">Cost</th>
                <th className="px-3 py-3 font-bold text-right hidden md:table-cell">Price</th>
                <th className="px-3 py-3 font-bold text-right hidden lg:table-cell">Value at cost</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-ink-muted">Loading stock…</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-ink-muted">No items match these filters.</td>
                </tr>
              ) : (
                visible.map((item) => (
                  <tr key={item.key} className={`hover:bg-canvas-ivory/40 ${item.isActive ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink-charcoal">{itemName(item)}</p>
                      <p className="font-mono text-[10px] text-ink-muted">
                        {item.sku}
                        {item.brandName ? ` · ${item.brandName}` : ""}
                        {` · ${PRODUCT_TYPE_LABELS[item.productType]}`}
                        {!item.isActive ? " · inactive variant" : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`text-sm font-black ${
                          item.status === "out_of_stock"
                            ? "text-brand-red"
                            : item.status === "low_stock"
                              ? "text-amber-700"
                              : "text-ink-charcoal"
                        }`}
                      >
                        {item.stockQuantity}
                      </span>
                      <p className="text-[10px] text-ink-muted">reorder at {item.reorderLevel}</p>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell"><StockBadge status={item.status} /></td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      {item.costPriceKes ? formatKes(item.costPriceKes) : <span className="text-amber-700 font-bold">Not set</span>}
                    </td>
                    <td className="px-3 py-3 text-right hidden md:table-cell">{formatKes(item.priceKes)}</td>
                    <td className="px-3 py-3 text-right hidden lg:table-cell font-bold">
                      {item.costPriceKes ? formatKes(stockValue(item)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setAdjusting(item)} className="neo-button-secondary text-[11px] py-1.5 px-2.5" title="Adjust stock">
                          <SlidersHorizontal className="h-3 w-3" />
                          <span className="hidden sm:inline">Adjust</span>
                        </button>
                        <button type="button" onClick={() => setConfiguring(item)} className="neo-button-secondary text-[11px] py-1.5 px-2" title="Reorder level and cost" aria-label={`Settings for ${itemName(item)}`}>
                          <Settings2 className="h-3 w-3" />
                        </button>
                        <Link
                          to={`/admin/inventory/movements?productId=${item.productId}${item.variantId ? `&variantId=${item.variantId}` : ""}`}
                          className="neo-button-secondary text-[11px] py-1.5 px-2"
                          title="Stock history"
                          aria-label={`History for ${itemName(item)}`}
                        >
                          <History className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {adjusting && (
        <AdjustStockModal
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(updated, message) => {
            replaceItem(updated);
            setSuccess(message);
            setAdjusting(null);
          }}
        />
      )}
      {configuring && (
        <ItemSettingsModal
          item={configuring}
          onClose={() => setConfiguring(null)}
          onSaved={(updated) => {
            replaceItem(updated);
            setSuccess(`Settings saved for ${itemName(updated)}.`);
            setConfiguring(null);
          }}
        />
      )}
    </div>
  );
}

const REASON_HELP: Record<ManualAdjustReason, string> = {
  receive: "Stock delivered by a supplier. Adds units.",
  return: "A customer brought an item back. Adds units.",
  damage: "Damaged, faulty or expired stock written off. Removes units.",
  internal_use: "Used in-house, e.g. a part fitted during a printer service. Removes units.",
  correction: "Set the exact quantity on the shelf when the record is wrong.",
};

function AdjustStockModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockItem;
  onClose: () => void;
  onSaved: (item: StockItem, message: string) => void;
}) {
  const [reason, setReason] = useState<ManualAdjustReason>("receive");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState(item.costPriceKes ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = parseInt(quantity, 10);
  const valid = Number.isInteger(qty) && (reason === "correction" ? qty >= 0 : qty > 0);
  const adding = reason === "receive" || reason === "return";
  const next = !valid
    ? null
    : reason === "correction"
      ? qty
      : adding
        ? item.stockQuantity + qty
        : item.stockQuantity - qty;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || next === null) return;
    if (next < 0) {
      setError(`Only ${item.stockQuantity} on hand.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await inventoryApi.adjust({
        productId: item.productId,
        variantId: item.variantId,
        reason,
        ...(reason === "correction" ? { newQuantity: qty } : { delta: adding ? qty : -qty }),
        note,
        unitCostKes: reason === "receive" && unitCost.trim() ? unitCost.trim() : undefined,
      });
      onSaved(
        result.item,
        result.movement
          ? `${itemName(result.item)}: ${REASON_LABELS[reason].toLowerCase()} recorded, now ${result.item.stockQuantity} on hand.`
          : `${itemName(result.item)} already had ${result.item.stockQuantity} — nothing changed.`,
      );
    } catch (err) {
      setError(errorMessage(err, "Could not save the adjustment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <div className="rounded-neo-sm bg-canvas-ivory border border-surface-border p-3 text-xs">
        <p className="font-bold text-ink-charcoal">{itemName(item)}</p>
        <p className="font-mono text-[10px] text-ink-muted">{item.sku} · {item.stockQuantity} on hand</p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-reason">Reason</label>
          <select
            id="adj-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as ManualAdjustReason)}
            className={inputClass}
          >
            {MANUAL_ADJUST_REASONS.map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">{REASON_HELP[reason]}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-qty">
              {reason === "correction" ? "Actual quantity on shelf" : adding ? "Units to add" : "Units to remove"}
            </label>
            <input
              id="adj-qty"
              type="number"
              inputMode="numeric"
              min={reason === "correction" ? 0 : 1}
              required
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
          {reason === "receive" && (
            <div>
              <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-cost">Unit cost (KES)</label>
              <input
                id="adj-cost"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="adj-note">Note</label>
          <input
            id="adj-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={reason === "receive" ? "e.g. Supplier invoice INV-4471" : "Optional"}
            className={inputClass}
          />
        </div>
        {next !== null && (
          <p className={`text-xs font-bold ${next < 0 ? "text-brand-red" : "text-ink-secondary"}`}>
            {item.stockQuantity} → {next} on hand
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button type="button" onClick={onClose} className="neo-button-secondary text-xs py-2 px-3.5">Cancel</button>
          <button type="submit" disabled={!valid || saving || (next ?? 0) < 0} className="neo-button-primary text-xs py-2 px-4">
            {saving ? "Saving…" : "Save adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ItemSettingsModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockItem;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
}) {
  const [reorderLevel, setReorderLevel] = useState(String(item.reorderLevel));
  const [cost, setCost] = useState(item.costPriceKes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await inventoryApi.updateSettings({
          productId: item.productId,
          variantId: item.variantId,
          reorderLevel: parseInt(reorderLevel, 10) || 0,
          costPriceKes: cost.trim() ? cost.trim() : null,
        }),
      );
    } catch (err) {
      setError(errorMessage(err, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Item settings" onClose={onClose}>
      <div className="rounded-neo-sm bg-canvas-ivory border border-surface-border p-3 text-xs">
        <p className="font-bold text-ink-charcoal">{itemName(item)}</p>
        <p className="font-mono text-[10px] text-ink-muted">
          {item.sku} · last movement {formatDateTime(item.lastMovementAt)}
        </p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="set-reorder">Reorder level</label>
          <input id="set-reorder" type="number" min={0} required value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className={inputClass} />
          <p className="mt-1 text-[11px] text-ink-muted">Flagged as low stock at or below this quantity.</p>
        </div>
        <div>
          <label className="block font-bold text-ink-charcoal mb-1" htmlFor="set-cost">Cost price per unit (KES)</label>
          <input id="set-cost" type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Not set" className={inputClass} />
          <p className="mt-1 text-[11px] text-ink-muted">
            What Jocta pays per unit. Used for stock value and profit; never shown to customers.
            Receiving stock with a unit cost updates this automatically.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button type="button" onClick={onClose} className="neo-button-secondary text-xs py-2 px-3.5">Cancel</button>
          <button type="submit" disabled={saving} className="neo-button-primary text-xs py-2 px-4">
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
