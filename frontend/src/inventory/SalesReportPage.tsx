import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { SalesReport } from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  Bar,
  CHANNEL_LABELS,
  Card,
  Notice,
  PAYMENT_LABELS,
  PageHeader,
  StatCard,
  downloadCsv,
  errorMessage,
  formatDay,
  inputClass,
  todayInNairobi,
} from "./ui";

export function SalesReportPage() {
  const [month, setMonth] = useState(todayInNairobi().slice(0, 7));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReport(await inventoryApi.getSalesReport(month));
    } catch (err) {
      setError(errorMessage(err, "Failed to load the sales report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const s = report?.summary;
  const costed = s ? parseFloat(s.costedRevenueKes) : 0;
  const margin = s && costed > 0 ? Math.round((parseFloat(s.grossProfitKes) / costed) * 100) : null;
  const coverage = s && parseFloat(s.revenueKes) > 0 ? Math.round((costed / parseFloat(s.revenueKes)) * 100) : null;
  const maxChannel = Math.max(0, ...(report?.byChannel ?? []).map((c) => parseFloat(c.revenueKes)));
  const maxPayment = Math.max(0, ...(report?.byPaymentMethod ?? []).map((p) => parseFloat(p.revenueKes)));
  const maxDay = Math.max(0, ...(report?.daily ?? []).map((d) => parseFloat(d.revenueKes)));
  const monthLabel = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(
    new Date(`${month}-15T12:00:00+03:00`),
  );

  function exportCsv() {
    if (!report) return;
    downloadCsv(`jocta-sales-report-${month}.csv`, [
      ["Jocta Enterprises sales report", monthLabel],
      [],
      ["Revenue (KES)", report.summary.revenueKes],
      ["Gross profit on costed sales (KES)", report.summary.grossProfitKes],
      ["Transactions", report.summary.transactions],
      ["Units sold", report.summary.unitsSold],
      ["Average sale (KES)", report.summary.averageSaleKes],
      ["Discounts given (KES)", report.summary.discountKes],
      ["Voided sales", report.summary.voidedTransactions],
      [],
      ["Top products", "SKU", "Units", "Revenue (KES)", "Gross profit (KES)"],
      ...report.topProducts.map((p) => [p.name, p.sku, p.quantity, p.revenueKes, p.grossProfitKes ?? "cost not recorded"]),
      [],
      ["Date", "Sales", "Units", "Revenue (KES)"],
      ...report.daily.map((d) => [d.date, d.transactions, d.unitsSold, d.revenueKes]),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Report"
        subtitle="Monthly revenue, profit and best sellers from recorded sales. Voided sales are excluded."
        actions={
          <>
            <input type="month" value={month} max={todayInNairobi().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" className={`${inputClass} w-auto`} />
            <button type="button" onClick={load} disabled={loading} className="neo-button-secondary text-xs py-2 px-3">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={exportCsv} disabled={!report} className="neo-button-secondary text-xs py-2 px-3">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      {error && <Notice kind="error">{error}</Notice>}

      {s && report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={`Revenue · ${monthLabel}`} value={formatKes(s.revenueKes)} hint={`${s.transactions} sales · ${s.unitsSold} units`} />
            <StatCard
              label="Gross profit"
              value={formatKes(s.grossProfitKes)}
              tone="good"
              hint={
                margin !== null
                  ? `${margin}% margin · costs known for ${coverage}% of revenue`
                  : "Record cost prices to see profit"
              }
            />
            <StatCard label="Average sale" value={formatKes(s.averageSaleKes)} hint={`Discounts given ${formatKes(s.discountKes)}`} />
            <StatCard label="Voided sales" value={s.voidedTransactions} tone={s.voidedTransactions ? "warn" : "default"} hint="Not counted in totals" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">By channel</h2>
              <ul className="mt-3 space-y-3">
                {report.byChannel.map((c) => (
                  <li key={c.channel} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-ink-charcoal">{CHANNEL_LABELS[c.channel]}</span>
                      <span className="text-ink-secondary">{formatKes(c.revenueKes)} · {c.transactions}</span>
                    </div>
                    <Bar value={parseFloat(c.revenueKes)} max={maxChannel} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">By payment method</h2>
              <ul className="mt-3 space-y-3">
                {report.byPaymentMethod.map((p) => (
                  <li key={p.paymentMethod} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-ink-charcoal">{PAYMENT_LABELS[p.paymentMethod]}</span>
                      <span className="text-ink-secondary">{formatKes(p.revenueKes)} · {p.transactions}</span>
                    </div>
                    <Bar value={parseFloat(p.revenueKes)} max={maxPayment} className="bg-emerald-500" />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <h2 className="px-4 sm:px-5 pt-4 text-sm font-black text-ink-charcoal uppercase tracking-tight">Top products</h2>
            {report.topProducts.length === 0 ? (
              <p className="p-6 text-center text-xs text-ink-muted">No sales recorded in {monthLabel}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="mt-2 w-full text-xs">
                  <thead className="bg-canvas-ivory text-left text-[10px] uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-4 sm:px-5 py-2.5 font-bold">Product</th>
                      <th className="px-3 py-2.5 font-bold text-right">Units</th>
                      <th className="px-3 py-2.5 font-bold text-right">Revenue</th>
                      <th className="px-4 sm:px-5 py-2.5 font-bold text-right">Gross profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {report.topProducts.map((p) => (
                      <tr key={p.key}>
                        <td className="px-4 sm:px-5 py-2.5">
                          <p className="font-bold text-ink-charcoal">{p.name}</p>
                          <p className="font-mono text-[10px] text-ink-muted">{p.sku}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold">{p.quantity}</td>
                        <td className="px-3 py-2.5 text-right">{formatKes(p.revenueKes)}</td>
                        <td className="px-4 sm:px-5 py-2.5 text-right">
                          {p.grossProfitKes ? formatKes(p.grossProfitKes) : <span className="text-amber-700">Cost not set</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">Daily revenue</h2>
            <div className="mt-4 flex items-end gap-0.5 sm:gap-1 h-32" aria-label="Revenue per day">
              {report.daily.map((d) => {
                const value = parseFloat(d.revenueKes);
                return (
                  <div
                    key={d.date}
                    className="flex-1 h-full flex items-end"
                    title={`${formatDay(d.date)}: ${formatKes(value)} from ${d.transactions} sale(s)`}
                  >
                    <div
                      className={`w-full rounded-t-sm ${value > 0 ? "bg-brand-red" : "bg-surface-border"}`}
                      style={{ height: value > 0 && maxDay > 0 ? `${Math.max(4, (value / maxDay) * 100)}%` : "2px" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
              <span>{formatDay(report.from)}</span>
              <span>{formatDay(report.to)}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
