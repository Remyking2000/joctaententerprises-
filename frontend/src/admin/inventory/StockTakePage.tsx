import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Search } from "lucide-react";
import type { BulkStockResult } from "@jocta/shared";
import { inventoryApi } from "../../lib/api";
import {
  Card,
  Modal,
  Notice,
  PageHeader,
  errorMessage,
  inputClass,
  itemName,
  useStockItems,
} from "./ui";

/**
 * Physical count. Staff type what is actually on the shelf; only items with a
 * count entered are submitted, and only differences change stock.
 */
export function StockTakePage() {
  const { items, loading, error: loadError, reload } = useStockItems();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BulkStockResult | null>(null);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.categoryName).filter(Boolean) as string[])].sort(),
    [items],
  );

  const counted = useMemo(
    () =>
      items
        .filter((i) => counts[i.key] !== undefined && counts[i.key] !== "")
        .map((i) => ({ item: i, counted: parseInt(counts[i.key], 10) }))
        .filter((c) => Number.isInteger(c.counted) && c.counted >= 0),
    [items, counts],
  );
  const differences = counted.filter((c) => c.counted !== c.item.stockQuantity);
  const netChange = differences.reduce((s, c) => s + (c.counted - c.item.stockQuantity), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (category && i.categoryName !== category) return false;
      if (onlyDifferences) {
        const v = counts[i.key];
        if (v === undefined || v === "" || parseInt(v, 10) === i.stockQuantity) return false;
      }
      if (!q) return true;
      return [i.productName, i.variantName ?? "", i.sku, i.oemPartNumber ?? ""]
        .some((f) => f.toLowerCase().includes(q));
    });
  }, [items, category, search, onlyDifferences, counts]);

  async function commit() {
    setSaving(true);
    setError(null);
    try {
      const result = await inventoryApi.stockTake({
        note,
        counts: counted.map((c) => ({
          productId: c.item.productId,
          variantId: c.item.variantId,
          countedQuantity: c.counted,
        })),
      });
      setDone(result);
      setCounts({});
      setNote("");
      setConfirming(false);
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Could not save the stock take."));
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Take"
        subtitle="Count what is on the shelf. Only items you enter a count for are checked, and only differences are recorded."
        actions={
          <button
            type="button"
            disabled={counted.length === 0}
            onClick={() => setConfirming(true)}
            className="neo-button-primary text-xs py-2 px-4"
          >
            <ClipboardCheck className="h-4 w-4" />
            Review & commit ({counted.length})
          </button>
        }
      />

      {loadError && <Notice kind="error">{loadError}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {done && (
        <Notice kind="success" onClose={() => setDone(null)}>
          Stock take {done.reference} saved: {done.applied} item{done.applied === 1 ? "" : "s"} corrected,{" "}
          {done.unchanged} matched.{" "}
          <Link to={`/admin/inventory/movements?reference=${done.reference}`} className="underline">
            View changes
          </Link>
        </Notice>
      )}

      <Card className="p-3.5 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an item…" aria-label="Search items" className={`${inputClass} pl-9`} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-ink-secondary px-1">
          <input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />
          Differences only
        </label>
      </Card>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="p-3">
          <p className="text-lg font-black text-ink-charcoal">{counted.length}</p>
          <p className="text-[10px] font-bold uppercase text-ink-muted">Counted</p>
        </Card>
        <Card className="p-3">
          <p className={`text-lg font-black ${differences.length ? "text-amber-700" : "text-ink-charcoal"}`}>{differences.length}</p>
          <p className="text-[10px] font-bold uppercase text-ink-muted">Differences</p>
        </Card>
        <Card className="p-3">
          <p className={`text-lg font-black ${netChange < 0 ? "text-brand-red" : netChange > 0 ? "text-emerald-700" : "text-ink-charcoal"}`}>
            {netChange > 0 ? `+${netChange}` : netChange}
          </p>
          <p className="text-[10px] font-bold uppercase text-ink-muted">Net units</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Item</th>
                <th className="px-3 py-3 font-bold text-right">System</th>
                <th className="px-3 py-3 font-bold w-28">Counted</th>
                <th className="px-4 py-3 font-bold text-right">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading && items.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-ink-muted">Loading items…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-ink-muted">No items to show.</td></tr>
              ) : (
                visible.map((item) => {
                  const raw = counts[item.key] ?? "";
                  const diff = raw === "" ? null : (parseInt(raw, 10) || 0) - item.stockQuantity;
                  return (
                    <tr key={item.key} className={diff ? "bg-amber-50/50" : ""}>
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-ink-charcoal">{itemName(item)}</p>
                        <p className="font-mono text-[10px] text-ink-muted">{item.sku}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold">{item.stockQuantity}</td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`Counted quantity of ${itemName(item)}`}
                          value={raw}
                          onChange={(e) => setCounts((prev) => ({ ...prev, [item.key]: e.target.value }))}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-black">
                        {diff === null ? (
                          <span className="text-ink-muted font-normal">—</span>
                        ) : diff === 0 ? (
                          <span className="text-emerald-700">Matches</span>
                        ) : (
                          <span className={diff > 0 ? "text-emerald-700" : "text-brand-red"}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {confirming && (
        <Modal title="Commit stock take" onClose={() => setConfirming(false)} wide>
          <p className="text-xs text-ink-secondary">
            {counted.length} item{counted.length === 1 ? "" : "s"} counted.{" "}
            {differences.length === 0
              ? "Every count matches the system — nothing will change."
              : `${differences.length} will be set to the counted quantity:`}
          </p>
          {differences.length > 0 && (
            <ul className="max-h-60 overflow-y-auto divide-y divide-surface-border text-xs">
              {differences.map((d) => (
                <li key={d.item.key} className="py-2 flex justify-between gap-3">
                  <span className="font-bold text-ink-charcoal">{itemName(d.item)}</span>
                  <span className="shrink-0">
                    {d.item.stockQuantity} → <span className="font-black">{d.counted}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-xs">
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="stk-note">Note</label>
            <input id="stk-note" type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Month-end count, front shop" className={inputClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <button type="button" onClick={() => setConfirming(false)} className="neo-button-secondary text-xs py-2 px-3.5">Keep counting</button>
            <button type="button" disabled={saving} onClick={commit} className="neo-button-primary text-xs py-2 px-4">
              {saving ? "Saving…" : "Commit stock take"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
