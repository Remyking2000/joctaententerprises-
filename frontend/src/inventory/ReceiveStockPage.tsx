import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PackagePlus, Trash2 } from "lucide-react";
import type { BulkStockResult, StockItem } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  Card,
  ItemPicker,
  Notice,
  PageHeader,
  errorMessage,
  inputClass,
  itemName,
  useStockItems,
} from "./ui";

interface Line {
  item: StockItem;
  quantity: string;
  unitCost: string;
}

export function ReceiveStockPage() {
  const { items, loading, error: loadError, reload } = useStockItems();
  const [lines, setLines] = useState<Line[]>([]);
  const [supplierReference, setSupplierReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BulkStockResult | null>(null);

  const selectedKeys = useMemo(() => new Set(lines.map((l) => l.item.key)), [lines]);
  const totalUnits = lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 0), 0);
  const totalCost = lines.reduce(
    (s, l) => s + (parseInt(l.quantity, 10) || 0) * (parseFloat(l.unitCost) || 0),
    0,
  );
  const valid = lines.length > 0 && lines.every((l) => (parseInt(l.quantity, 10) || 0) > 0);

  function update(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.item.key === key ? { ...l, ...patch } : l)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const result = await inventoryApi.receive({
        supplierReference,
        note,
        lines: lines.map((l) => ({
          productId: l.item.productId,
          variantId: l.item.variantId,
          quantity: parseInt(l.quantity, 10),
          unitCostKes: l.unitCost.trim() ? l.unitCost.trim() : undefined,
        })),
      });
      setDone(result);
      setLines([]);
      setSupplierReference("");
      setNote("");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Could not record the delivery."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receive Stock"
        subtitle="Record a supplier delivery. Every line is saved together under one reference, and unit costs update each item's cost price."
      />

      {loadError && <Notice kind="error">{loadError}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {done && (
        <Notice kind="success" onClose={() => setDone(null)}>
          Delivery {done.reference} recorded: {done.applied} item{done.applied === 1 ? "" : "s"} updated.{" "}
          <Link to={`/inventory/movements?reference=${done.reference}`} className="underline">
            View in history
          </Link>
        </Notice>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="rcv-ref">Supplier invoice / delivery note</label>
            <input id="rcv-ref" type="text" maxLength={120} value={supplierReference} onChange={(e) => setSupplierReference(e.target.value)} placeholder="e.g. INV-4471" className={inputClass} />
          </div>
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="rcv-note">Note</label>
            <input id="rcv-note" type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Supplier name" className={inputClass} />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <ItemPicker
            items={items}
            excludeKeys={selectedKeys}
            placeholder={loading ? "Loading products…" : "Add a product: search by name, SKU or OEM part number…"}
            onPick={(item) =>
              setLines((prev) => [...prev, { item, quantity: "1", unitCost: item.costPriceKes ?? "" }])
            }
          />

          {lines.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">
              Search above to add the items in this delivery.
            </p>
          ) : (
            <>
            {/* Phones: one card per line */}
            <ul className="md:hidden divide-y divide-surface-border">
              {lines.map((l) => {
                const qty = parseInt(l.quantity, 10) || 0;
                return (
                  <li key={l.item.key} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-charcoal leading-snug">{itemName(l.item)}</p>
                        <p className="font-mono text-[11px] text-ink-muted break-all">
                          {l.item.sku} · {l.item.stockQuantity} → {l.item.stockQuantity + qty}
                        </p>
                      </div>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.item.key !== l.item.key))} aria-label={`Remove ${itemName(l.item)}`} className="p-1.5 text-ink-muted hover:text-brand-red shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-ink-muted mb-0.5">Qty</span>
                        <input type="number" min={1} required inputMode="numeric" aria-label={`Quantity of ${itemName(l.item)}`} value={l.quantity} onChange={(e) => update(l.item.key, { quantity: e.target.value })} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-ink-muted mb-0.5">Unit cost (KES)</span>
                        <input type="number" min={0} step="0.01" inputMode="decimal" aria-label={`Unit cost of ${itemName(l.item)}`} value={l.unitCost} onChange={(e) => update(l.item.key, { unitCost: e.target.value })} placeholder="Optional" className={inputClass} />
                      </label>
                    </div>
                    {l.unitCost && (
                      <p className="text-right text-xs font-bold text-ink-charcoal">
                        Line cost {formatKes(qty * (parseFloat(l.unitCost) || 0))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="py-2 pr-3 font-bold min-w-[14rem]">Item</th>
                    <th className="py-2 px-2 font-bold w-24">Qty</th>
                    <th className="py-2 px-2 font-bold w-32">Unit cost (KES)</th>
                    <th className="py-2 px-2 font-bold text-right">Line cost</th>
                    <th className="py-2 pl-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {lines.map((l) => {
                    const qty = parseInt(l.quantity, 10) || 0;
                    return (
                      <tr key={l.item.key}>
                        <td className="py-2 pr-3">
                          <p className="font-bold text-ink-charcoal">{itemName(l.item)}</p>
                          <p className="font-mono text-[10px] text-ink-muted">
                            {l.item.sku} · {l.item.stockQuantity} on hand → {l.item.stockQuantity + qty}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min={1} required aria-label={`Quantity of ${itemName(l.item)}`} value={l.quantity} onChange={(e) => update(l.item.key, { quantity: e.target.value })} className={inputClass} />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min={0} step="0.01" aria-label={`Unit cost of ${itemName(l.item)}`} value={l.unitCost} onChange={(e) => update(l.item.key, { unitCost: e.target.value })} placeholder="Optional" className={inputClass} />
                        </td>
                        <td className="py-2 px-2 text-right font-bold">
                          {l.unitCost ? formatKes(qty * (parseFloat(l.unitCost) || 0)) : "—"}
                        </td>
                        <td className="py-2 pl-2">
                          <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.item.key !== l.item.key))} aria-label={`Remove ${itemName(l.item)}`} className="p-1 text-ink-muted hover:text-brand-red">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-secondary">
            <span className="font-bold text-ink-charcoal">{totalUnits}</span> units ·{" "}
            <span className="font-bold text-ink-charcoal">{formatKes(totalCost)}</span> total cost
          </p>
          <button type="submit" disabled={!valid || saving} className="neo-button-primary text-xs py-2.5 px-5">
            <PackagePlus className="h-4 w-4" />
            {saving ? "Saving…" : "Record delivery"}
          </button>
        </div>
      </form>
    </div>
  );
}
