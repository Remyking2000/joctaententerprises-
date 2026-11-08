import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Save,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import { AccountNavBar } from "../components/AccountNavBar";
import { useCart, type ProvisionalCartItem } from "../context/CartContext";
import { useCustomer, type CustomerOrder } from "../context/CustomerContext";
import { formatKes, PRODUCT_AUTHENTICITY_LABELS } from "../lib/format";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  getStoreWhatsAppNumber,
} from "../lib/whatsapp";

const STORE_WHATSAPP_NUMBER = getStoreWhatsAppNumber();

function buildEnrichedWhatsAppMessage(
  items: ProvisionalCartItem[],
  options?: {
    reference?: string;
    customerName?: string;
    customerPhone?: string;
    company?: string;
    deliveryAddress?: string;
    note?: string;
  },
): string {
  const baseMessage = buildWhatsAppOrderMessage(items, window.location.origin);
  const extraLines: string[] = [];

  if (options?.reference) {
    extraLines.push(`Order Ref: ${options.reference}`);
  }
  if (options?.customerName) {
    extraLines.push(
      `Customer: ${options.customerName}${options.company ? ` (${options.company})` : ""}`,
    );
  }
  if (options?.customerPhone) {
    extraLines.push(`Phone: ${options.customerPhone}`);
  }
  if (options?.deliveryAddress) {
    extraLines.push(`Delivery: ${options.deliveryAddress}`);
  }
  if (options?.note) {
    extraLines.push(`Note: ${options.note}`);
  }

  if (extraLines.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\n\n--- Customer Details ---\n${extraLines.join("\n")}`;
}

export function OrdersPage() {
  const {
    items: cartItems,
    totalCount: cartTotalCount,
    subtotalKes: cartSubtotalKes,
    updateQuantity,
    removeItem,
    addItem,
    clearCart,
  } = useCart();

  const { orders, recordOrder, removeOrder, clearOrders, profile } =
    useCustomer();

  const [orderNote, setOrderNote] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  function showFeedback(message: string) {
    setFeedbackBanner(message);
    setTimeout(() => setFeedbackBanner(null), 4500);
  }

  function handlePlaceWhatsAppOrder() {
    if (cartItems.length === 0) return;
    const recorded = recordOrder(cartItems, {
      status: "sent_whatsapp",
      note: orderNote,
    });

    if (STORE_WHATSAPP_NUMBER) {
      const msg = buildEnrichedWhatsAppMessage(cartItems, {
        reference: recorded?.reference,
        customerName: recorded?.customerName || profile.fullName,
        customerPhone: recorded?.customerPhone || profile.phone,
        company: recorded?.company || profile.company,
        deliveryAddress:
          recorded?.deliveryAddress ||
          [profile.deliveryAddress, profile.city].filter(Boolean).join(", "),
        note: orderNote.trim() || profile.deliveryNotes,
      });
      const url = buildWhatsAppOrderUrl(STORE_WHATSAPP_NUMBER, msg);
      window.open(url, "_blank", "noopener,noreferrer");
    }

    setOrderNote("");
    showFeedback(
      `Order ${recorded?.reference ?? ""} recorded in your order history.`,
    );
  }

  function handleSaveCartAsOrder() {
    if (cartItems.length === 0) return;
    const recorded = recordOrder(cartItems, {
      status: "saved",
      note: orderNote,
    });
    setOrderNote("");
    showFeedback(
      `Selection saved as order ${recorded?.reference ?? ""} in your history.`,
    );
  }

  function handleReorder(order: CustomerOrder) {
    for (const item of order.items) {
      addItem({
        productSlug: item.productSlug,
        productName: item.productName,
        sku: item.sku,
        oemPartNumber: item.oemPartNumber,
        authenticity: item.authenticity,
        variantId: item.variantId,
        variantName: item.variantName,
        priceKes: item.priceKes,
        maxStock: item.maxStock,
        quantity: item.quantity,
      });
    }
    showFeedback(
      `Loaded ${order.totalItems} item(s) from ${order.reference} into your Selection List.`,
    );
  }

  function handleResendWhatsApp(order: CustomerOrder) {
    if (!STORE_WHATSAPP_NUMBER) return;
    const msg = buildEnrichedWhatsAppMessage(order.items, {
      reference: order.reference,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      company: order.company,
      deliveryAddress: order.deliveryAddress,
      note: order.note,
    });
    const url = buildWhatsAppOrderUrl(STORE_WHATSAPP_NUMBER, msg);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-secondary"
      >
        <Link to="/" className="hover:text-brand-red">
          Home
        </Link>
        <span>/</span>
        <Link to="/account" className="hover:text-brand-red">
          My Account
        </Link>
        <span>/</span>
        <span className="text-ink-charcoal font-semibold">My Orders</span>
      </nav>

      {/* Unified Account Header & Tabs */}
      <AccountNavBar />

      {feedbackBanner && (
        <div
          role="status"
          className="rounded-neo-sm border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* Active Selection List (Current Cart) */}
      {cartItems.length > 0 && (
        <section
          aria-labelledby="active-cart-order-heading"
          className="neo-card p-6 sm:p-8 space-y-5 border-brand-red/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-brand-red" />
              <div>
                <h2
                  id="active-cart-order-heading"
                  className="text-lg font-extrabold text-ink-charcoal"
                >
                  Active Selection List ({cartTotalCount}{" "}
                  {cartTotalCount === 1 ? "item" : "items"})
                </h2>
                <p className="text-xs text-ink-secondary">
                  Review your current selection and send your order to the Jocta
                  sales desk or save it to your order history.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="neo-button-secondary px-3 py-1.5 text-xs cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Selection</span>
            </button>
          </div>

          <div className="divide-y divide-surface-border">
            {cartItems.map((item) => (
              <div
                key={item.itemKey}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <Link
                    to={`/shop/${item.productSlug}`}
                    className="text-sm font-bold text-ink-charcoal hover:text-brand-red"
                  >
                    {item.productName}
                  </Link>
                  {item.variantName && (
                    <p className="text-xs font-medium text-ink-secondary">
                      Option: {item.variantName}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>SKU: {item.sku}</span>
                    {item.oemPartNumber && (
                      <span>• OEM: {item.oemPartNumber}</span>
                    )}
                    <span>
                      • {PRODUCT_AUTHENTICITY_LABELS[item.authenticity]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.itemKey, item.quantity - 1)
                      }
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="neo-button-secondary h-7 w-7 p-0 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-bold text-ink-charcoal">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.itemKey, item.quantity + 1)
                      }
                      disabled={
                        item.maxStock > 0 && item.quantity >= item.maxStock
                      }
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="neo-button-secondary h-7 w-7 p-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[6.5rem]">
                    <p className="text-sm font-extrabold text-ink-charcoal">
                      {formatKes(parseFloat(item.priceKes) * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[11px] text-ink-muted">
                        {formatKes(item.priceKes)} each
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.itemKey)}
                    aria-label={`Remove ${item.productName}`}
                    className="text-ink-muted hover:text-brand-red p-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-surface-border pt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-7 space-y-1.5">
                <label
                  htmlFor="order-note-input"
                  className="block text-xs font-bold text-ink-charcoal"
                >
                  Order Note / Delivery Instruction (Optional)
                </label>
                <input
                  id="order-note-input"
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="e.g. Urgent delivery to Westlands office, please include ETR..."
                  className="neo-input"
                />
              </div>

              <div className="sm:col-span-5 text-left sm:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Estimated Subtotal
                </p>
                <p className="text-2xl font-extrabold text-ink-charcoal">
                  {formatKes(cartSubtotalKes)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveCartAsOrder}
                className="neo-button-secondary px-4 py-2.5 text-xs sm:text-sm cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save to Order History</span>
              </button>

              <button
                type="button"
                onClick={handlePlaceWhatsAppOrder}
                className="neo-button-primary px-5 py-2.5 text-xs sm:text-sm cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Order on WhatsApp</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Past Orders / Order History */}
      <section aria-labelledby="order-history-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="order-history-heading"
              className="text-lg sm:text-xl font-extrabold text-ink-charcoal"
            >
              Order History ({orders.length})
            </h2>
            <p className="text-xs text-ink-secondary">
              Orders sent to our sales desk on WhatsApp or saved for repeat
              office supply ordering.
            </p>
          </div>

          {orders.length > 0 && (
            <button
              type="button"
              onClick={clearOrders}
              className="neo-button-secondary px-3 py-1.5 text-xs cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="neo-card p-8 sm:p-12 text-center space-y-4">
            <Package className="mx-auto h-12 w-12 text-brand-red" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-extrabold text-ink-charcoal">
                No Orders Recorded Yet
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                When you place an order via WhatsApp from your Selection List or
                save a quote here, it will appear in your order history for easy
                reordering.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to="/shop"
                className="neo-button-primary px-5 py-2.5 text-xs sm:text-sm"
              >
                Browse Product Catalogue
              </Link>
              <Link
                to="/compatibility"
                className="neo-button-secondary px-5 py-2.5 text-xs sm:text-sm"
              >
                Find Toner by Printer
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="neo-card p-5 sm:p-6 space-y-4">
                {/* Order Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-border pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-ink-charcoal">
                        {order.reference}
                      </span>
                      {order.status === "sent_whatsapp" ? (
                        <span className="inline-flex items-center gap-1 rounded-neo-pill bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          Sent on WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-neo-pill bg-canvas-ivory border border-surface-border px-2.5 py-0.5 text-[11px] font-bold text-ink-secondary">
                          <Clock className="h-3 w-3 text-brand-red" />
                          Saved Order Quote
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleString("en-KE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      • {order.totalItems}{" "}
                      {order.totalItems === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Order Subtotal
                    </p>
                    <p className="text-lg sm:text-xl font-extrabold text-ink-charcoal">
                      {formatKes(order.subtotalKes)}
                    </p>
                  </div>
                </div>

                {/* Delivery / Contact Metadata (if any) */}
                {(order.customerName ||
                  order.customerPhone ||
                  order.deliveryAddress ||
                  order.note) && (
                  <div className="neo-surface-inset p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {order.customerName && (
                      <div className="flex items-center gap-1.5 text-ink-secondary">
                        <User className="h-3.5 w-3.5 text-brand-red shrink-0" />
                        <span className="truncate">
                          <strong className="text-ink-charcoal">
                            {order.customerName}
                          </strong>
                          {order.company ? ` (${order.company})` : ""}
                        </span>
                      </div>
                    )}
                    {order.customerPhone && (
                      <div className="flex items-center gap-1.5 text-ink-secondary">
                        <Phone className="h-3.5 w-3.5 text-brand-red shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                    )}
                    {order.deliveryAddress && (
                      <div className="flex items-center gap-1.5 text-ink-secondary">
                        <MapPin className="h-3.5 w-3.5 text-brand-red shrink-0" />
                        <span className="truncate">
                          {order.deliveryAddress}
                        </span>
                      </div>
                    )}
                    {order.note && (
                      <div className="sm:col-span-3 text-ink-secondary border-t border-surface-border pt-2">
                        <strong className="text-ink-charcoal">Note:</strong>{" "}
                        {order.note}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Items Breakdown */}
                <div className="divide-y divide-surface-border text-xs sm:text-sm">
                  {order.items.map((item) => (
                    <div
                      key={item.itemKey}
                      className="py-2.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/shop/${item.productSlug}`}
                          className="font-bold text-ink-charcoal hover:text-brand-red truncate block"
                        >
                          {item.productName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mt-0.5">
                          {item.variantName && (
                            <span>Option: {item.variantName} •</span>
                          )}
                          <span>SKU: {item.sku}</span>
                          {item.oemPartNumber && (
                            <span>• OEM: {item.oemPartNumber}</span>
                          )}
                          <span>
                            • Qty: <strong>{item.quantity}</strong> &times;{" "}
                            {formatKes(item.priceKes)}
                          </span>
                        </div>
                      </div>

                      <div className="font-extrabold text-ink-charcoal shrink-0">
                        {formatKes(parseFloat(item.priceKes) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-4">
                  <button
                    type="button"
                    onClick={() => removeOrder(order.id)}
                    className="neo-button-secondary px-3 py-2 text-xs text-ink-muted hover:text-brand-red cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="neo-button-secondary px-3.5 py-2 text-xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-brand-red" />
                      <span>Load into Selection List</span>
                    </button>

                    {STORE_WHATSAPP_NUMBER && (
                      <button
                        type="button"
                        onClick={() => handleResendWhatsApp(order)}
                        className="neo-button-primary px-4 py-2 text-xs cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>Send on WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
