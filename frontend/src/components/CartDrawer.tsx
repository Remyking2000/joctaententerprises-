import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X, Info } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatKes, PRODUCT_AUTHENTICITY_LABELS } from "../lib/format";

export function CartDrawer() {
  const {
    items,
    totalCount,
    subtotalKes,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCart();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink-charcoal/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div
        className="fixed inset-0"
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-canvas-ivory border-l border-surface-border shadow-neo">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border bg-surface-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-brand-red" aria-hidden="true" />
            <h2
              id="cart-drawer-title"
              className="text-base font-bold text-ink-charcoal"
            >
              Selection List ({totalCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close selection list"
            className="neo-button-secondary h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provisional boundary notice */}
        <div className="border-b border-surface-border bg-brand-red-tint px-5 py-3 text-xs text-ink-charcoal flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-brand-red mt-0.5" aria-hidden="true" />
          <span>
            <strong>Provisional Cart Preview:</strong> Items added here are saved
            locally in your browser while browsing the catalogue. Order submission
            and checkout will be enabled in the next phase.
          </span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {items.length === 0 ? (
            <div className="neo-card p-8 text-center">
              <ShoppingBag
                className="mx-auto h-10 w-10 text-ink-muted"
                aria-hidden="true"
              />
              <p className="mt-3 text-base font-semibold text-ink-charcoal">
                Your selection list is empty
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                Browse printer toners, drum units, spare parts, or use the
                compatibility finder to shortlist items.
              </p>
              <Link
                to="/shop"
                onClick={closeCart}
                className="neo-button-primary mt-5 px-5 py-2.5 text-sm"
              >
                Browse Catalogue
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.itemKey} className="neo-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/shop/${item.productSlug}`}
                      onClick={closeCart}
                      className="text-sm font-bold text-ink-charcoal hover:text-brand-red"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && (
                      <p className="mt-0.5 text-xs font-medium text-ink-secondary">
                        Option: {item.variantName}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>SKU: {item.sku}</span>
                      {item.oemPartNumber && (
                        <span>• OEM: {item.oemPartNumber}</span>
                      )}
                      <span>
                        • {PRODUCT_AUTHENTICITY_LABELS[item.authenticity]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.itemKey)}
                    aria-label={`Remove ${item.productName}`}
                    className="text-ink-muted hover:text-brand-red p-1 rounded-neo-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.itemKey, item.quantity - 1)
                      }
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="neo-button-secondary h-7 w-7 p-0"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-semibold text-ink-charcoal">
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
                      className="neo-button-secondary h-7 w-7 p-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-charcoal">
                      {formatKes(parseFloat(item.priceKes) * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-ink-muted">
                        {formatKes(item.priceKes)} each
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-surface-border bg-surface-white p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-secondary">
                Estimated Subtotal
              </span>
              <span className="text-lg font-bold text-ink-charcoal">
                {formatKes(subtotalKes)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearCart}
                className="neo-button-secondary flex-1 py-2.5 text-xs"
              >
                Clear List
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="neo-button-primary flex-1 py-2.5 text-xs"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
