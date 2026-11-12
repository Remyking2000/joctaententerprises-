import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Ban,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import type { Sale } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  CHANNEL_LABELS,
  Card,
  Modal,
  Notice,
  PAYMENT_LABELS,
  PageHeader,
  downloadCsv,
  errorMessage,
  formatDateTime,
  inputClass,
  itemName,
  todayInNairobi,
} from "./ui";
import { useCatalogRefresh } from "../lib/sync";

function getMonthRange(d: Date = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const start = `${yyyy}-${mm}-01`;
  const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
  const end = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getThirtyDaysAgo(todayStr: string): string {
  const d = new Date(`${todayStr}T12:00:00+03:00`);
  d.setDate(d.getDate() - 30);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function SalesHistoryPage() {
  const today = todayInNairobi();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentMonth = useMemo(() => getMonthRange(), []);
  const initialView = searchParams.get("view");

  const [from, setFrom] = useState(() => {
    const pFrom = searchParams.get("from");
    if (pFrom) return pFrom;
    return currentMonth.start;
  });

  const [to, setTo] = useState(() => {
    const pTo = searchParams.get("to");
    if (pTo) return pTo;
    return today;
  });

  const [status, setStatus] = useState<"" | "completed" | "voided">("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [voiding, setVoiding] = useState<Sale | null>(null);

  // Sync date range if query params change
  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "month") {
      setFrom(currentMonth.start);
      setTo(today);
    } else if (v === "30days") {
      setFrom(getThirtyDaysAgo(today));
      setTo(today);
    }
  }, [searchParams, currentMonth.start, today]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSales(
        await inventoryApi.getSales({ from, to, status: status || undefined }),
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to load sales."));
    } finally {
      setLoading(false);
    }
  }

  // Reload when products, stock or sales change in admin or inventory
  useCatalogRefresh(() => void load());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, status]);

  const completed = useMemo(
    () => sales.filter((s) => s.status === "completed"),
    [sales],
  );

  const revenue = useMemo(
    () => completed.reduce((sum, s) => sum + parseFloat(s.totalKes), 0),
    [completed],
  );

  const unitsSold = useMemo(
    () =>
      completed.reduce(
        (sum, s) =>
          sum + s.lines.reduce((lSum, l) => lSum + l.quantity, 0),
        0,
      ),
    [completed],
  );

  const avgSale = useMemo(
    () => (completed.length > 0 ? revenue / completed.length : 0),
    [completed, revenue],
  );

  const isThisMonth =
    from === currentMonth.start && (to === today || to === currentMonth.end);
  const isMonthlyReport = initialView === "month" || isThisMonth;

  const monthLabel = useMemo(() => {
    try {
      const d = new Date(`${from.slice(0, 7)}-15T12:00:00+03:00`);
      return new Intl.DateTimeFormat("en-KE", {
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return from;
    }
  }, [from]);

  function handlePreset(
    preset: "this_month" | "last_30" | "last_month" | "all",
  ) {
    if (preset === "this_month") {
      setFrom(currentMonth.start);
      setTo(today);
      setSearchParams({ view: "month" });
    } else if (preset === "last_30") {
      setFrom(getThirtyDaysAgo(today));
      setTo(today);
      setSearchParams({ view: "30days" });
    } else if (preset === "last_month") {
      const prevD = new Date();
      prevD.setDate(1);
      prevD.setMonth(prevD.getMonth() - 1);
      const prev = getMonthRange(prevD);
      setFrom(prev.start);
      setTo(prev.end);
      setSearchParams({ view: "last_month" });
    } else {
      setFrom("2024-01-01");
      setTo(today);
      setSearchParams({ view: "all" });
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    downloadCsv(
      `jocta-sales-${from}-to-${to}.csv`,
      [
        [
          "Reference",
          "Date",
          "Status",
          "Channel",
          "Payment",
          "Customer",
          "Phone",
          "Product",
          "Variant",
          "SKU",
          "Qty",
          "Unit price (KES)",
          "Line total (KES)",
          "Sale total (KES)",
          "Recorded by",
        ],
        ...sales.flatMap((s) =>
          s.lines.map((l) => [
            s.reference,
            formatDateTime(s.createdAt),
            s.status,
            CHANNEL_LABELS[s.channel],
            PAYMENT_LABELS[s.paymentMethod],
            s.customerName,
            s.customerPhone,
            l.productName,
            l.variantName ?? "",
            l.sku,
            l.quantity,
            l.unitPriceKes,
            l.lineTotalKes,
            s.totalKes,
            s.createdBy,
          ]),
        ),
      ],
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales History"
        subtitle="Sales recorded by staff. Voiding a sale returns its items to stock."
        actions={
          <>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="neo-button-secondary text-xs py-2 px-3"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={sales.length === 0}
              className="neo-button-secondary text-xs py-2 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <Link
              to="/inventory/sales/new"
              className="neo-button-primary text-xs py-2 px-3.5"
            >
              <ShoppingCart className="h-4 w-4" />
              Record Sale
            </Link>
          </>
        }
      />

      {/* Quick Presets Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-bold text-ink-muted text-[11px] uppercase mr-1">
            Period:
          </span>
          <button
            type="button"
            onClick={() => handlePreset("this_month")}
            className={`rounded-neo-sm px-3 py-1 font-bold text-xs transition-colors cursor-pointer ${
              isThisMonth
                ? "bg-brand-red text-white shadow-neo-sm"
                : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
            }`}
          >
            This Month ({monthLabel})
          </button>
          <button
            type="button"
            onClick={() => handlePreset("last_30")}
            className={`rounded-neo-sm px-3 py-1 font-bold text-xs transition-colors cursor-pointer ${
              searchParams.get("view") === "30days"
                ? "bg-brand-red text-white shadow-neo-sm"
                : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
            }`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => handlePreset("last_month")}
            className={`rounded-neo-sm px-3 py-1 font-bold text-xs transition-colors cursor-pointer ${
              searchParams.get("view") === "last_month"
                ? "bg-brand-red text-white shadow-neo-sm"
                : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
            }`}
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => handlePreset("all")}
            className={`rounded-neo-sm px-3 py-1 font-bold text-xs transition-colors cursor-pointer ${
              searchParams.get("view") === "all"
                ? "bg-brand-red text-white shadow-neo-sm"
                : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
            }`}
          >
            All Sales
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm">
          <p className="text-[11px] font-bold uppercase text-ink-muted">
            Total Revenue
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal">
            {formatKes(revenue)}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm">
          <p className="text-[11px] font-bold uppercase text-ink-muted">
            Completed Sales
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-emerald-700">
            {completed.length}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm">
          <p className="text-[11px] font-bold uppercase text-ink-muted">
            Units Sold
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal">
            {unitsSold}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm">
          <p className="text-[11px] font-bold uppercase text-ink-muted">
            Avg. Transaction
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal">
            {formatKes(avgSale)}
          </p>
        </div>
      </div>

      {/* Date Range & Status Filters */}
      <Card className="p-3.5 grid grid-cols-2 sm:grid-cols-[auto_auto_auto_1fr] gap-2 items-end text-xs">
        <div>
          <label
            className="block font-bold text-ink-charcoal mb-1"
            htmlFor="sales-from"
          >
            From
          </label>
          <input
            id="sales-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            className="block font-bold text-ink-charcoal mb-1"
            htmlFor="sales-to"
          >
            To
          </label>
          <input
            id="sales-to"
            type="date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setTo(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            className="block font-bold text-ink-charcoal mb-1"
            htmlFor="sales-status"
          >
            Status
          </label>
          <select
            id="sales-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <p className="col-span-2 sm:col-span-1 sm:text-right text-ink-secondary pb-2">
          <span className="font-black text-ink-charcoal text-sm">
            {formatKes(revenue)}
          </span>{" "}
          from {completed.length} completed sale
          {completed.length === 1 ? "" : "s"}
        </p>
      </Card>

      {error && <Notice kind="error">{error}</Notice>}
      {success && (
        <Notice kind="success" onClose={() => setSuccess(null)}>
          {success}
        </Notice>
      )}

      {/* Sales Transactions List */}
      <Card className="divide-y divide-surface-border">
        {loading && sales.length === 0 ? (
          <p className="p-10 text-center text-xs text-ink-muted">
            Loading sales…
          </p>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-xs text-ink-muted">
              No sales recorded for{" "}
              {isMonthlyReport ? monthLabel : "this period"}.
            </p>
            <Link
              to="/inventory/sales/new"
              className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record a Sale</span>
            </Link>
          </div>
        ) : (
          sales.map((sale) => {
            const open = expanded.has(sale.id);
            const voided = sale.status === "voided";
            return (
              <div
                key={sale.id}
                className={voided ? "bg-canvas-ivory/60" : ""}
              >
                <button
                  type="button"
                  onClick={() => toggle(sale.id)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs cursor-pointer hover:bg-canvas-ivory/40"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink-charcoal">
                      <span className="font-mono">{sale.reference}</span>
                      {voided && (
                        <span className="ml-2 rounded-full border border-brand-red/30 bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-red">
                          Voided
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-ink-muted truncate">
                      {formatDateTime(sale.createdAt)} ·{" "}
                      {CHANNEL_LABELS[sale.channel]} ·{" "}
                      {PAYMENT_LABELS[sale.paymentMethod]}
                      {sale.customerName ? ` · ${sale.customerName}` : ""} ·{" "}
                      {sale.lines.reduce((s, l) => s + l.quantity, 0)} items
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black shrink-0 ${
                      voided ? "line-through text-ink-muted" : "text-ink-charcoal"
                    }`}
                  >
                    {formatKes(sale.totalKes)}
                  </span>
                </button>
                {open && (
                  <div className="px-4 pb-4 pl-11 space-y-3 text-xs">
                    <table className="w-full">
                      <tbody className="divide-y divide-surface-border">
                        {sale.lines.map((l) => (
                          <tr key={l.id}>
                            <td className="py-1.5">
                              <span className="font-bold text-ink-charcoal">
                                {itemName(l)}
                              </span>{" "}
                              <span className="font-mono text-[10px] text-ink-muted">
                                {l.sku}
                              </span>
                            </td>
                            <td className="py-1.5 text-right text-ink-secondary whitespace-nowrap">
                              {l.quantity} × {formatKes(l.unitPriceKes)}
                            </td>
                            <td className="py-1.5 text-right font-bold w-28">
                              {formatKes(l.lineTotalKes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
                      <span>
                        Recorded by {sale.createdBy || "unknown"}
                        {sale.customerPhone ? ` · ${sale.customerPhone}` : ""}
                        {sale.note ? ` · ${sale.note}` : ""}
                        {parseFloat(sale.discountKes) > 0
                          ? ` · discount ${formatKes(sale.discountKes)}`
                          : ""}
                      </span>
                      {voided ? (
                        <span className="text-brand-red font-bold">
                          Voided {formatDateTime(sale.voidedAt)} by{" "}
                          {sale.voidedBy}: {sale.voidReason}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVoiding(sale)}
                          className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border px-2.5 py-1.5 font-bold text-ink-secondary hover:text-brand-red hover:border-brand-red cursor-pointer"
                        >
                          <Ban className="h-3 w-3" />
                          Void sale
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      {voiding && (
        <VoidSaleModal
          sale={voiding}
          onClose={() => setVoiding(null)}
          onVoided={(updated) => {
            setSales((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
            setSuccess(
              `Sale ${updated.reference} voided and its items returned to stock.`,
            );
            setVoiding(null);
          }}
        />
      )}
    </div>
  );
}

function VoidSaleModal({
  sale,
  onClose,
  onVoided,
}: {
  sale: Sale;
  onClose: () => void;
  onVoided: (sale: Sale) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onVoided(await inventoryApi.voidSale(sale.id, { reason }));
    } catch (err) {
      setError(errorMessage(err, "Could not void the sale."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Void sale ${sale.reference}`} onClose={onClose}>
      <p className="text-xs text-ink-secondary">
        This cancels the sale of {formatKes(sale.totalKes)} and puts{" "}
        {sale.lines.reduce((s, l) => s + l.quantity, 0)} item(s) back into
        stock. It cannot be undone.
      </p>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div>
          <label
            className="block font-bold text-ink-charcoal mb-1"
            htmlFor="void-reason"
          >
            Reason
          </label>
          <input
            id="void-reason"
            type="text"
            required
            minLength={3}
            maxLength={300}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Recorded twice, customer cancelled"
            className={inputClass}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="neo-button-secondary text-xs py-2 px-3.5"
          >
            Keep sale
          </button>
          <button
            type="submit"
            disabled={saving || reason.trim().length < 3}
            className="neo-button-primary text-xs py-2 px-4"
          >
            {saving ? "Voiding…" : "Void sale"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
