import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Search, X } from "lucide-react";
import type {
  PaymentMethod,
  SalesChannel,
  StockItem,
  StockReason,
  StockStatus,
} from "@jocta/shared";
import { ApiClientError, inventoryApi } from "../lib/api";
import { useCatalogRefresh } from "../lib/sync";

// ── Labels ───────────────────────────────────────────────────────────────────

export const REASON_LABELS: Record<StockReason, string> = {
  opening: "Opening balance",
  receive: "Received",
  sale: "Sold",
  sale_void: "Sale voided",
  return: "Customer return",
  damage: "Damaged / written off",
  internal_use: "Used in servicing",
  correction: "Correction",
  stock_take: "Stock take",
};

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  walk_in: "Walk-in",
  whatsapp: "WhatsApp",
  phone: "Phone",
  website: "Website",
  other: "Other",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank_transfer: "Bank transfer",
  card: "Card",
  credit: "On account (credit)",
};

const STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In stock", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low_stock: { label: "Low stock", className: "bg-amber-50 text-amber-800 border-amber-200" },
  out_of_stock: { label: "Out of stock", className: "bg-brand-red/10 text-brand-red border-brand-red/30" },
};

// ── Formatting ───────────────────────────────────────────────────────────────

export const inputClass =
  "w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-none";

export function itemName(item: { productName: string; variantName: string | null }): string {
  return item.variantName ? `${item.productName} — ${item.variantName}` : item.productName;
}

const dateTimeFormat = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  day: "numeric",
  month: "short",
});

export function formatDateTime(iso: string | null): string {
  return iso ? dateTimeFormat.format(new Date(iso)) : "—";
}

/** Formats a YYYY-MM-DD calendar date as "5 Nov". */
export function formatDay(date: string): string {
  return dateFormat.format(new Date(`${date}T12:00:00+03:00`));
}

/** Today in Nairobi as YYYY-MM-DD. */
export function todayInNairobi(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Downloads rows as a CSV file Excel opens correctly (UTF-8 with BOM). */
export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const escape = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Data ─────────────────────────────────────────────────────────────────────

export function useStockItems() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await inventoryApi.getItems());
    } catch (err) {
      setError(errorMessage(err, "Failed to load stock items."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Stay in step with product and stock changes made anywhere
  useCatalogRefresh(() => void reload());

  return { items, setItems, loading, error, reload };
}

// ── Components ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-secondary">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({
  kind,
  children,
  onClose,
}: {
  kind: "error" | "success";
  children: ReactNode;
  onClose?: () => void;
}) {
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`rounded-neo border p-4 text-xs flex items-start gap-2.5 ${
        isError
          ? "border-brand-red/30 bg-brand-red/5 text-brand-red"
          : "border-emerald-300 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
      )}
      <div className="flex-1 font-semibold">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="p-0.5">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-neo border border-surface-border bg-surface-white shadow-neo ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneClass = {
    default: "text-ink-charcoal",
    warn: "text-amber-700",
    danger: "text-brand-red",
    good: "text-emerald-700",
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1.5 text-lg sm:text-xl font-black ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-secondary">{hint}</p>}
    </Card>
  );
}

export function StockBadge({ status }: { status: StockStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function DeltaText({ delta }: { delta: number }) {
  return (
    <span className={`font-black ${delta > 0 ? "text-emerald-700" : "text-brand-red"}`}>
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-charcoal/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-neo border border-surface-border bg-surface-white p-5 sm:p-6 shadow-neo space-y-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-neo-sm hover:bg-canvas-ivory"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Search-as-you-type picker over stock items, matching name, variant, SKU and
 * OEM part number. Calls `onPick` and clears itself.
 */
export function ItemPicker({
  items,
  onPick,
  excludeKeys,
  placeholder = "Search by product, SKU or OEM part number…",
  showStock = true,
}: {
  items: StockItem[];
  onPick: (item: StockItem) => void;
  excludeKeys?: Set<string>;
  placeholder?: string;
  showStock?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((i) => !excludeKeys?.has(i.key))
      .filter((i) =>
        [i.productName, i.variantName ?? "", i.sku, i.oemPartNumber ?? "", i.brandName ?? ""]
          .some((f) => f.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [items, query, excludeKeys]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(item: StockItem) {
    onPick(item);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  return (
    <div ref={boxRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-label="Find a product to add"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${inputClass} pl-9`}
      />
      {open && query.trim() && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full rounded-neo-sm border border-surface-border bg-surface-white shadow-neo max-h-72 overflow-y-auto"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-xs text-ink-muted">No matching products.</li>
          ) : (
            results.map((item, idx) => (
              <li key={item.key} role="option" aria-selected={idx === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                  onMouseEnter={() => setActive(idx)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 ${
                    idx === active ? "bg-canvas-ivory" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-ink-charcoal truncate">
                      {itemName(item)}
                    </span>
                    <span className="block font-mono text-[10px] text-ink-muted truncate">
                      {item.sku}
                      {item.oemPartNumber && item.oemPartNumber !== item.sku
                        ? ` · OEM ${item.oemPartNumber}`
                        : ""}
                    </span>
                  </span>
                  {showStock && (
                    <span className="shrink-0 text-[11px] font-bold text-ink-secondary">
                      {item.stockQuantity} on hand
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Horizontal bar used in reports; `max` is the largest value in the set. */
export function Bar({ value, max, className = "bg-brand-red" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-canvas-ivory overflow-hidden">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${value > 0 ? pct : 0}%` }} />
    </div>
  );
}
