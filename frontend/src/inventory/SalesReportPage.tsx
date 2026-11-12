import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Printer,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Trophy,
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

function getMonthDetails(monthStr: string) {
  const [yyyyStr, mmStr] = monthStr.split("-");
  const yyyy = parseInt(yyyyStr, 10);
  const mm = parseInt(mmStr, 10);
  const start = `${monthStr}-01`;
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric",
  }).format(new Date(yyyy, mm - 1, 15));
  return { start, end, label, yyyy, mm };
}

export function SalesReportPage() {
  const today = todayInNairobi();
  const currentMonthStr = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [voiding, setVoiding] = useState<Sale | null>(null);

  const monthInfo = useMemo(() => getMonthDetails(month), [month]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getSales({
        from: monthInfo.start,
        to: monthInfo.end,
      });
      setSales(data);
    } catch (err) {
      setError(errorMessage(err, "Failed to load monthly sales."));
    } finally {
      setLoading(false);
    }
  }

  useCatalogRefresh(() => void load());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

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
        (sum, s) => sum + s.lines.reduce((lSum, l) => lSum + l.quantity, 0),
        0,
      ),
    [completed],
  );

  const avgSale = useMemo(
    () => (completed.length > 0 ? revenue / completed.length : 0),
    [completed, revenue],
  );

  // Calculate statistics on top selling products for this month
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        variantName: string | null;
        sku: string;
        unitsSold: number;
        totalRevenue: number;
        transactionsCount: number;
      }
    >();

    for (const sale of completed) {
      for (const line of sale.lines) {
        const key = line.variantId
          ? `${line.productId ?? "item"}::${line.variantId}`
          : (line.productId ?? `${line.sku}-${line.productName}`);
        const lineTotal = parseFloat(line.lineTotalKes) || 0;
        const existing = map.get(key);
        if (existing) {
          existing.unitsSold += line.quantity;
          existing.totalRevenue += lineTotal;
          existing.transactionsCount += 1;
        } else {
          map.set(key, {
            key,
            name: line.productName,
            variantName: line.variantName,
            sku: line.sku,
            unitsSold: line.quantity,
            totalRevenue: lineTotal,
            transactionsCount: 1,
          });
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue,
    );
  }, [completed]);

  const maxProductRevenue = useMemo(
    () => Math.max(1, ...topProducts.map((p) => p.totalRevenue)),
    [topProducts],
  );

  function prevMonth() {
    const d = new Date(monthInfo.yyyy, monthInfo.mm - 2, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setMonth(`${yyyy}-${mm}`);
  }

  function nextMonth() {
    const d = new Date(monthInfo.yyyy, monthInfo.mm, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setMonth(`${yyyy}-${mm}`);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePrint() {
    window.print();
  }

  function exportCsv() {
    downloadCsv(`jocta-monthly-sales-report-${month}.csv`, [
      ["JOCTA ENTERPRISES - MONTHLY SALES REPORT", monthInfo.label],
      ["Period", `${monthInfo.start} to ${monthInfo.end}`],
      ["Total Revenue (KES)", revenue.toFixed(2)],
      ["Completed Sales", completed.length],
      ["Units Sold", unitsSold],
      ["Average Transaction (KES)", avgSale.toFixed(2)],
      [],
      ["TOP SELLING PRODUCTS (STATISTICS)"],
      ["Rank", "Product Name", "Variant", "SKU", "Units Sold", "Total Revenue (KES)", "% of Monthly Sales"],
      ...topProducts.map((p, idx) => [
        idx + 1,
        p.name,
        p.variantName ?? "Main",
        p.sku,
        p.unitsSold,
        p.totalRevenue.toFixed(2),
        revenue > 0 ? `${((p.totalRevenue / revenue) * 100).toFixed(1)}%` : "0%",
      ]),
      [],
      ["SALES TRANSACTIONS LOG"],
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
    ]);
  }

  return (
    <div className="space-y-6">
      {/* Printable Business Header (visible only on print) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black uppercase">
              JOCTA ENTERPRISES
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              Printers, Toners, Drums &amp; Office Supplies · Nairobi, Kenya
            </p>
            <p className="text-base font-extrabold text-black mt-3">
              Monthly Sales &amp; Top Products Report — {monthInfo.label}
            </p>
          </div>
          <div className="text-right text-xs text-gray-800 space-y-0.5">
            <p className="font-bold">Period: {monthInfo.start} to {monthInfo.end}</p>
            <p>Printed: {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            <p className="text-[10px] text-gray-600">Official Inventory Record</p>
          </div>
        </div>
      </div>

      {/* Screen Page Header (hidden on print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Monthly Report · ${monthInfo.label}`}
          subtitle={`Simple sales history and top selling statistics for ${monthInfo.label}.`}
          actions={
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="neo-button-secondary text-xs py-2 px-3 cursor-pointer inline-flex items-center gap-1.5"
                title="Print or save as PDF"
              >
                <Printer className="h-3.5 w-3.5 text-brand-red" />
                <span>Print Report</span>
              </button>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="neo-button-secondary text-xs py-2 px-3 cursor-pointer"
                title="Refresh sales list"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={sales.length === 0}
                className="neo-button-secondary text-xs py-2 px-3 cursor-pointer"
                title="Export monthly CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              <Link
                to="/inventory/sales/new"
                className="neo-button-primary text-xs py-2 px-3.5"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Record Sale</span>
              </Link>
            </>
          }
        />
      </div>

      {/* Month Selection Bar (hidden on print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-surface-white border border-surface-border rounded-neo-sm p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="neo-button-secondary p-1.5 text-xs cursor-pointer"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="month"
            value={month}
            max={currentMonthStr}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            aria-label="Select report month"
            className={`${inputClass} w-auto font-bold text-ink-charcoal`}
          />
          <button
            type="button"
            onClick={nextMonth}
            disabled={month >= currentMonthStr}
            className="neo-button-secondary p-1.5 text-xs disabled:opacity-40 cursor-pointer"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {month !== currentMonthStr && (
          <button
            type="button"
            onClick={() => setMonth(currentMonthStr)}
            className="neo-button-secondary text-xs py-1.5 px-3 cursor-pointer"
          >
            Back to This Month
          </button>
        )}
      </div>

      {/* Monthly Summary Cards (Printable & Screen) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm print:border-black print:shadow-none print:p-2.5">
          <p className="text-[11px] font-bold uppercase text-ink-muted print:text-black">
            Monthly Revenue
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal print:text-black">
            {formatKes(revenue)}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm print:border-black print:shadow-none print:p-2.5">
          <p className="text-[11px] font-bold uppercase text-ink-muted print:text-black">
            Completed Sales
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-emerald-700 print:text-black">
            {completed.length}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm print:border-black print:shadow-none print:p-2.5">
          <p className="text-[11px] font-bold uppercase text-ink-muted print:text-black">
            Units Sold
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal print:text-black">
            {unitsSold}
          </p>
        </div>
        <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3.5 shadow-neo-sm print:border-black print:shadow-none print:p-2.5">
          <p className="text-[11px] font-bold uppercase text-ink-muted print:text-black">
            Avg. Transaction
          </p>
          <p className="mt-1 text-lg sm:text-xl font-black text-ink-charcoal print:text-black">
            {formatKes(avgSale)}
          </p>
        </div>
      </div>

      {error && (
        <div className="print:hidden">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      {success && (
        <div className="print:hidden">
          <Notice kind="success" onClose={() => setSuccess(null)}>
            {success}
          </Notice>
        </div>
      )}

      {/* TOP SELLING PRODUCTS PER MONTH (STATISTICS) */}
      <section aria-labelledby="top-products-heading" className="space-y-3 break-inside-avoid">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600 print:hidden" />
            <h2
              id="top-products-heading"
              className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-ink-charcoal print:text-black"
            >
              Top Selling Products · {monthInfo.label}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-ink-muted print:text-gray-700">
            {topProducts.length} {topProducts.length === 1 ? "product sold" : "products sold"}
          </span>
        </div>

        <Card className="overflow-hidden print:border-black print:shadow-none">
          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              No product sales recorded in {monthInfo.label}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-canvas-ivory border-b border-surface-border text-[10px] uppercase font-bold text-ink-muted print:bg-gray-100 print:text-black print:border-black">
                  <tr>
                    <th scope="col" className="px-3 sm:px-4 py-2.5 w-12 text-center">Rank</th>
                    <th scope="col" className="px-3 sm:px-4 py-2.5">Product &amp; SKU</th>
                    <th scope="col" className="px-3 sm:px-4 py-2.5 text-right">Units Sold</th>
                    <th scope="col" className="px-3 sm:px-4 py-2.5 text-right">Revenue (KES)</th>
                    <th scope="col" className="px-3 sm:px-4 py-2.5 text-right w-28 print:hidden">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border print:divide-black">
                  {topProducts.map((prod, idx) => {
                    const sharePct = revenue > 0 ? Math.round((prod.totalRevenue / revenue) * 100) : 0;
                    return (
                      <tr
                        key={prod.key}
                        className="hover:bg-canvas-ivory/50 transition-colors print:hover:bg-transparent"
                      >
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
                              idx === 0
                                ? "bg-amber-100 text-amber-800 border border-amber-300 print:border-black"
                                : idx === 1
                                  ? "bg-slate-200 text-slate-800 border border-slate-300 print:border-black"
                                  : idx === 2
                                    ? "bg-orange-100 text-orange-800 border border-orange-300 print:border-black"
                                    : "bg-canvas-ivory text-ink-secondary"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <p className="font-bold text-ink-charcoal print:text-black">
                            {prod.name}
                            {prod.variantName && (
                              <span className="text-ink-secondary font-semibold ml-1.5 text-[11px]">
                                ({prod.variantName})
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-[10px] text-ink-muted print:text-gray-700 mt-0.5">
                            SKU: {prod.sku}
                          </p>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right">
                          <span className="font-extrabold text-sm text-ink-charcoal print:text-black">
                            {prod.unitsSold}
                          </span>
                          <span className="text-[10px] text-ink-muted ml-1">units</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right font-black text-sm text-ink-charcoal print:text-black whitespace-nowrap">
                          {formatKes(prod.totalRevenue)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right print:hidden">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[11px] font-bold text-ink-secondary">
                              {sharePct}%
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-surface-border overflow-hidden">
                              <div
                                className="h-full bg-brand-red rounded-full"
                                style={{
                                  width: `${Math.max(6, Math.min(100, (prod.totalRevenue / maxProductRevenue) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* MONTHLY SALES HISTORY & RECEIPTS */}
      <section aria-labelledby="sales-history-heading" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2
            id="sales-history-heading"
            className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-ink-charcoal print:text-black"
          >
            Sales History for {monthInfo.label}
          </h2>
          <span className="text-[11px] font-semibold text-ink-muted print:text-gray-700">
            {sales.length} {sales.length === 1 ? "transaction" : "transactions"}
          </span>
        </div>

        {/* Printable Transactions Table (Clean black & white table for printouts) */}
        <div className="hidden print:block overflow-hidden border border-black">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 border-b border-black text-[10px] uppercase font-bold text-black">
              <tr>
                <th scope="col" className="px-3 py-2">Date &amp; Time</th>
                <th scope="col" className="px-3 py-2">Reference</th>
                <th scope="col" className="px-3 py-2">Customer &amp; Payment</th>
                <th scope="col" className="px-3 py-2">Items Sold</th>
                <th scope="col" className="px-3 py-2 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-xs">
                    No transactions recorded in {monthInfo.label}.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="break-inside-avoid">
                    <td className="px-3 py-2 whitespace-nowrap text-[11px]">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-[11px]">
                      {s.reference}
                      {s.status === "voided" && " (VOIDED)"}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <span className="font-semibold">{s.customerName || "Walk-in"}</span>
                      <span className="text-gray-600 block text-[10px]">
                        {PAYMENT_LABELS[s.paymentMethod]} · {CHANNEL_LABELS[s.channel]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {s.lines.map((l) => `${l.quantity}x ${itemName(l)} (${l.sku})`).join(", ")}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold text-xs ${s.status === "voided" ? "line-through text-gray-400" : ""}`}>
                      {formatKes(s.totalKes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Screen Interactive Sales Cards (hidden on print) */}
        <Card className="print:hidden divide-y divide-surface-border">
          {loading && sales.length === 0 ? (
            <p className="p-10 text-center text-xs text-ink-muted">
              Loading sales for {monthInfo.label}…
            </p>
          ) : sales.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-xs text-ink-muted">
                No sales recorded in {monthInfo.label}.
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
                        voided
                          ? "line-through text-ink-muted"
                          : "text-ink-charcoal"
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
      </section>

      {/* Printable Report Footer / Official Sign-Off (visible only on print) */}
      <div className="hidden print:block pt-8 mt-10 border-t border-black text-xs break-inside-avoid">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="font-bold text-black uppercase text-[10px] tracking-wider">Report Prepared By:</p>
            <div className="mt-8 border-b border-black w-44" />
            <p className="mt-1 text-[11px] text-gray-700">Signature / Date</p>
          </div>
          <div>
            <p className="font-bold text-black uppercase text-[10px] tracking-wider">Verified &amp; Approved By:</p>
            <div className="mt-8 border-b border-black w-44" />
            <p className="mt-1 text-[11px] text-gray-700">Manager / Director</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-black uppercase text-[10px] tracking-wider">Official Stamp:</p>
            <div className="mt-12 text-[10px] text-gray-500">Jocta Enterprises Nairobi</div>
          </div>
        </div>
      </div>

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
