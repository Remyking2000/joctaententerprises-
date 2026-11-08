import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, RefreshCw, Search, X } from "lucide-react";
import { STOCK_REASONS, type StockMovement, type StockReason } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  Card,
  DeltaText,
  Notice,
  PageHeader,
  REASON_LABELS,
  downloadCsv,
  errorMessage,
  formatDateTime,
  inputClass,
  itemName,
  todayInNairobi,
} from "./ui";
import { useCatalogRefresh } from "../lib/sync";

/** The stock ledger: every change to every quantity, newest first. */
export function MovementsPage() {
  const [params, setParams] = useSearchParams();
  const productId = params.get("productId") ?? undefined;
  const variantId = params.get("variantId") ?? undefined;
  const reference = params.get("reference") ?? undefined;
  const reason = (params.get("reason") as StockReason | null) ?? undefined;
  const search = params.get("search") ?? undefined;

  const [searchInput, setSearchInput] = useState(search ?? "");
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await inventoryApi.getMovements({ productId, variantId, reference, reason, search, limit: 500 }),
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to load stock history."));
    } finally {
      setLoading(false);
    }
  }

  // Reload when products, stock or sales change in admin or inventory
  useCatalogRefresh(() => void load());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId, reference, reason, search]);

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setParam("search", searchInput.trim() || undefined);
  }

  const scopedTo = productId && rows[0] ? itemName(rows[0]) : productId ? "this item" : null;

  function exportCsv() {
    downloadCsv(`jocta-stock-history-${todayInNairobi()}.csv`, [
      ["Date", "Product", "Variant", "SKU", "Reason", "Change", "Balance after", "Unit cost (KES)", "Reference", "Note", "By"],
      ...rows.map((m) => [
        formatDateTime(m.createdAt),
        m.productName,
        m.variantName ?? "",
        m.sku,
        REASON_LABELS[m.reason],
        m.delta,
        m.balanceAfter,
        m.unitCostKes ?? "",
        m.reference,
        m.note,
        m.userEmail,
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock History"
        subtitle="Every change to stock, who made it and why. Each row shows the balance it left behind."
        actions={
          <>
            <button type="button" onClick={load} disabled={loading} className="neo-button-secondary text-xs py-2 px-3">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="neo-button-secondary text-xs py-2 px-3">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      <Card className="p-3.5 space-y-3">
        <form onSubmit={submitSearch} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product, SKU, note, reference or staff email — press Enter"
              aria-label="Search history"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={reason ?? ""}
            onChange={(e) => setParam("reason", e.target.value || undefined)}
            aria-label="Reason"
            className={inputClass}
          >
            <option value="">All reasons</option>
            {STOCK_REASONS.map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </select>
        </form>
        {(scopedTo || reference || search) && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            {scopedTo && (
              <FilterChip label={`Item: ${scopedTo}`} onClear={() => {
                const next = new URLSearchParams(params);
                next.delete("productId");
                next.delete("variantId");
                setParams(next);
              }} />
            )}
            {reference && <FilterChip label={`Reference: ${reference}`} onClear={() => setParam("reference", undefined)} />}
            {search && <FilterChip label={`Search: ${search}`} onClear={() => { setSearchInput(""); setParam("search", undefined); }} />}
          </div>
        )}
      </Card>

      {error && <Notice kind="error">{error}</Notice>}

      {/* Phones: one card per movement */}
      <div className="md:hidden space-y-2.5">
        {loading && rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">Loading history…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">No stock movements match.</Card>
        ) : (
          rows.map((m) => (
            <Card key={m.id} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-charcoal leading-snug">{itemName(m)}</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {REASON_LABELS[m.reason]} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0 text-base">
                  <DeltaText delta={m.delta} />
                  <p className="text-[11px] text-ink-muted">balance {m.balanceAfter}</p>
                </div>
              </div>
              {(m.note || m.reference || m.unitCostKes || m.userEmail) && (
                <div className="mt-2 border-t border-surface-border pt-2 text-xs text-ink-secondary space-y-0.5">
                  {m.note && <p>{m.note}</p>}
                  <p className="text-[11px] text-ink-muted break-all">
                    {m.reference && (
                      <button type="button" onClick={() => setParam("reference", m.reference)} className="font-mono underline mr-2">
                        {m.reference}
                      </button>
                    )}
                    {m.unitCostKes && <span className="mr-2">@ {formatKes(m.unitCostKes)}</span>}
                    {m.userEmail}
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
        {rows.length === 500 && (
          <p className="text-center text-[11px] text-ink-muted">
            Showing the latest 500 movements. Narrow the filters to see older ones.
          </p>
        )}
      </div>

      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-3 py-3 font-bold">Item</th>
                <th className="px-3 py-3 font-bold">Reason</th>
                <th className="px-3 py-3 font-bold text-right">Change</th>
                <th className="px-3 py-3 font-bold text-right">Balance</th>
                <th className="px-4 py-3 font-bold hidden md:table-cell">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading && rows.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-ink-muted">Loading history…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-ink-muted">No stock movements match.</td></tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-secondary">{formatDateTime(m.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-ink-charcoal">{itemName(m)}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{m.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{REASON_LABELS[m.reason]}</td>
                    <td className="px-3 py-2.5 text-right"><DeltaText delta={m.delta} /></td>
                    <td className="px-3 py-2.5 text-right font-bold">{m.balanceAfter}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-ink-secondary">
                      {m.note && <p>{m.note}</p>}
                      <p className="text-[10px] text-ink-muted">
                        {m.reference && (
                          <button type="button" onClick={() => setParam("reference", m.reference)} className="font-mono underline mr-2">
                            {m.reference}
                          </button>
                        )}
                        {m.unitCostKes && <span className="mr-2">@ {formatKes(m.unitCostKes)}</span>}
                        {m.userEmail}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length === 500 && (
          <p className="border-t border-surface-border p-3 text-center text-[11px] text-ink-muted">
            Showing the latest 500 movements. Narrow the filters to see older ones.
          </p>
        )}
      </Card>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-surface-border bg-canvas-ivory px-2.5 py-1 font-bold text-ink-charcoal">
      {label}
      <button type="button" onClick={onClear} aria-label={`Clear ${label}`} className="text-ink-muted hover:text-brand-red">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
