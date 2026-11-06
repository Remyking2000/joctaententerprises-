import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Printer, ShoppingCart, Trash2 } from "lucide-react";
import {
  PAYMENT_METHODS,
  SALES_CHANNELS,
  type PaymentMethod,
  type Sale,
  type SalesChannel,
  type StockItem,
} from "@jocta/shared";
import { inventoryApi } from "../lib/api";
import { formatKes } from "../lib/format";
import {
  CHANNEL_LABELS,
  Card,
  ItemPicker,
  Notice,
  PAYMENT_LABELS,
  PageHeader,
  errorMessage,
  formatDateTime,
  inputClass,
  itemName,
  useStockItems,
} from "./ui";

interface Line {
  item: StockItem;
  quantity: string;
  unitPrice: string;
}

export function RecordSalePage() {
  const { items, loading, error: loadError, reload } = useStockItems();
  const [lines, setLines] = useState<Line[]>([]);
  const [channel, setChannel] = useState<SalesChannel>("walk_in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const sellable = useMemo(() => items.filter((i) => i.isActive && i.stockQuantity > 0), [items]);
  const selectedKeys = useMemo(() => new Set(lines.map((l) => l.item.key)), [lines]);

  const totals = lines.reduce(
    (acc, l) => {
      const qty = parseInt(l.quantity, 10) || 0;
      acc.list += qty * parseFloat(l.item.priceKes);
      acc.total += qty * (parseFloat(l.unitPrice) || 0);
      acc.units += qty;
      return acc;
    },
    { list: 0, total: 0, units: 0 },
  );
  const discount = Math.max(0, totals.list - totals.total);

  const problems = lines.flatMap((l) => {
    const qty = parseInt(l.quantity, 10) || 0;
    if (qty < 1) return [`Enter a quantity for ${itemName(l.item)}.`];
    if (qty > l.item.stockQuantity) return [`Only ${l.item.stockQuantity} of ${itemName(l.item)} in stock.`];
    if (l.unitPrice.trim() === "" || parseFloat(l.unitPrice) < 0) return [`Enter a price for ${itemName(l.item)}.`];
    return [];
  });
  const valid = lines.length > 0 && problems.length === 0;

  function update(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.item.key === key ? { ...l, ...patch } : l)));
  }

  function reset() {
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setNote("");
    setReceipt(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const sale = await inventoryApi.createSale({
        channel,
        paymentMethod,
        customerName,
        customerPhone,
        note,
        lines: lines.map((l) => ({
          productId: l.item.productId,
          variantId: l.item.variantId,
          quantity: parseInt(l.quantity, 10),
          unitPriceKes: l.unitPrice.trim(),
        })),
      });
      setReceipt(sale);
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Could not record the sale."));
    } finally {
      setSaving(false);
    }
  }

  if (receipt) {
    return (
      <div className="space-y-5 max-w-xl">
        <Card className="p-5 sm:p-6 space-y-4 print:shadow-none print:border-0">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 print:hidden" />
            <div>
              <h1 className="text-lg font-black text-ink-charcoal">Sale recorded</h1>
              <p className="text-xs text-ink-secondary">
                <span className="font-mono font-bold text-ink-charcoal">{receipt.reference}</span> ·{" "}
                {formatDateTime(receipt.createdAt)}
              </p>
              <p className="text-xs text-ink-secondary">
                {CHANNEL_LABELS[receipt.channel]} · {PAYMENT_LABELS[receipt.paymentMethod]}
                {receipt.customerName ? ` · ${receipt.customerName}` : ""}
                {receipt.customerPhone ? ` (${receipt.customerPhone})` : ""}
              </p>
            </div>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-surface-border">
              {receipt.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2">
                    <p className="font-bold text-ink-charcoal">{itemName(l)}</p>
                    <p className="text-[10px] text-ink-muted">
                      {l.quantity} × {formatKes(l.unitPriceKes)}
                    </p>
                  </td>
                  <td className="py-2 text-right font-bold">{formatKes(l.lineTotalKes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-surface-border pt-3 space-y-1 text-xs">
            {parseFloat(receipt.discountKes) > 0 && (
              <p className="flex justify-between text-ink-secondary">
                <span>Discount</span>
                <span>−{formatKes(receipt.discountKes)}</span>
              </p>
            )}
            <p className="flex justify-between text-base font-black text-ink-charcoal">
              <span>Total</span>
              <span>{formatKes(receipt.totalKes)}</span>
            </p>
          </div>
        </Card>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={reset} className="neo-button-primary text-xs py-2 px-4">
            <ShoppingCart className="h-4 w-4" />
            Record another sale
          </button>
          <button type="button" onClick={() => window.print()} className="neo-button-secondary text-xs py-2 px-3.5">
            <Printer className="h-3.5 w-3.5" />
            Print receipt
          </button>
          <Link to="/inventory/sales" className="neo-button-secondary text-xs py-2 px-3.5">
            Sales history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Record Sale"
        subtitle="Log a sale made in the shop, by phone or on WhatsApp. Stock is deducted as soon as it is saved."
      />

      {loadError && <Notice kind="error">{loadError}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        <Card className="p-4 space-y-3">
          <ItemPicker
            items={sellable}
            excludeKeys={selectedKeys}
            placeholder={loading ? "Loading products…" : "Add an item: search by name, SKU or OEM part number…"}
            onPick={(item) =>
              setLines((prev) => [...prev, { item, quantity: "1", unitPrice: parseFloat(item.priceKes).toString() }])
            }
          />
          {lines.length === 0 ? (
            <p className="py-10 text-center text-xs text-ink-muted">
              Search above to add items. Only items in stock are listed.
            </p>
          ) : (
            <>
            {/* Phones: one card per line */}
            <ul className="md:hidden divide-y divide-surface-border">
              {lines.map((l) => {
                const qty = parseInt(l.quantity, 10) || 0;
                const over = qty > l.item.stockQuantity;
                const price = parseFloat(l.unitPrice) || 0;
                const listPrice = parseFloat(l.item.priceKes);
                return (
                  <li key={l.item.key} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-charcoal leading-snug">{itemName(l.item)}</p>
                        <p className={`text-[11px] break-all ${over ? "text-brand-red font-bold" : "text-ink-muted"}`}>
                          {l.item.sku} · {l.item.stockQuantity} in stock
                        </p>
                      </div>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.item.key !== l.item.key))} aria-label={`Remove ${itemName(l.item)}`} className="p-1.5 text-ink-muted hover:text-brand-red shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-ink-muted mb-0.5">Qty</span>
                        <input type="number" min={1} max={l.item.stockQuantity} required inputMode="numeric" aria-label={`Quantity of ${itemName(l.item)}`} value={l.quantity} onChange={(e) => update(l.item.key, { quantity: e.target.value })} className={inputClass} />
                      </label>
                      <label className="block">
                        <span className="block text-[10px] font-bold uppercase text-ink-muted mb-0.5">Unit price</span>
                        <input type="number" min={0} step="0.01" required inputMode="decimal" aria-label={`Unit price of ${itemName(l.item)}`} value={l.unitPrice} onChange={(e) => update(l.item.key, { unitPrice: e.target.value })} className={inputClass} />
                      </label>
                    </div>
                    <p className="flex justify-between text-xs">
                      <span className="text-ink-muted">{price !== listPrice ? `List ${formatKes(listPrice)}` : ""}</span>
                      <span className="font-bold text-ink-charcoal">{formatKes(qty * price)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[10px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="py-2 pr-3 font-bold min-w-[14rem]">Item</th>
                    <th className="py-2 px-2 font-bold w-20">Qty</th>
                    <th className="py-2 px-2 font-bold w-32">Unit price</th>
                    <th className="py-2 px-2 font-bold text-right">Total</th>
                    <th className="py-2 pl-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {lines.map((l) => {
                    const qty = parseInt(l.quantity, 10) || 0;
                    const over = qty > l.item.stockQuantity;
                    const price = parseFloat(l.unitPrice) || 0;
                    const listPrice = parseFloat(l.item.priceKes);
                    return (
                      <tr key={l.item.key}>
                        <td className="py-2 pr-3">
                          <p className="font-bold text-ink-charcoal">{itemName(l.item)}</p>
                          <p className={`text-[10px] ${over ? "text-brand-red font-bold" : "text-ink-muted"}`}>
                            {l.item.sku} · {l.item.stockQuantity} in stock
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min={1} max={l.item.stockQuantity} required aria-label={`Quantity of ${itemName(l.item)}`} value={l.quantity} onChange={(e) => update(l.item.key, { quantity: e.target.value })} className={inputClass} />
                        </td>
                        <td className="py-2 px-2">
                          <input type="number" min={0} step="0.01" required aria-label={`Unit price of ${itemName(l.item)}`} value={l.unitPrice} onChange={(e) => update(l.item.key, { unitPrice: e.target.value })} className={inputClass} />
                          {price !== listPrice && (
                            <p className="mt-0.5 text-[10px] text-ink-muted">List {formatKes(listPrice)}</p>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-bold">{formatKes(qty * price)}</td>
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

        <Card className="p-4 space-y-3 text-xs xl:sticky xl:top-24">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-ink-charcoal mb-1" htmlFor="sale-channel">Channel</label>
              <select id="sale-channel" value={channel} onChange={(e) => setChannel(e.target.value as SalesChannel)} className={inputClass}>
                {SALES_CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-ink-charcoal mb-1" htmlFor="sale-payment">Payment</label>
              <select id="sale-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PAYMENT_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="sale-customer">Customer</label>
            <input id="sale-customer" type="text" maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name or company (optional)" className={inputClass} />
          </div>
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="sale-phone">Phone</label>
            <input id="sale-phone" type="tel" maxLength={30} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Optional" className={inputClass} />
          </div>
          <div>
            <label className="block font-bold text-ink-charcoal mb-1" htmlFor="sale-note">Note</label>
            <input id="sale-note" type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. M-Pesa code QX12AB34" className={inputClass} />
          </div>

          <div className="border-t border-surface-border pt-3 space-y-1">
            <p className="flex justify-between text-ink-secondary"><span>Items</span><span>{totals.units}</span></p>
            {discount > 0 && (
              <p className="flex justify-between text-ink-secondary"><span>Discount</span><span>−{formatKes(discount)}</span></p>
            )}
            <p className="flex justify-between text-base font-black text-ink-charcoal"><span>Total</span><span>{formatKes(totals.total)}</span></p>
          </div>
          {lines.length > 0 && problems.length > 0 && (
            <p className="text-[11px] font-bold text-brand-red">{problems[0]}</p>
          )}
          <button type="submit" disabled={!valid || saving} className="neo-button-primary w-full py-2.5 text-xs">
            <ShoppingCart className="h-4 w-4" />
            {saving ? "Saving…" : "Complete sale"}
          </button>
        </Card>
      </form>
    </div>
  );
}
