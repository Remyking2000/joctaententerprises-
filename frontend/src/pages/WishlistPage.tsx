import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Heart,
  Printer,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { AccountNavBar } from "../components/AccountNavBar";
import { useCart } from "../context/CartContext";
import { useCustomer, type WishlistItem } from "../context/CustomerContext";
import {
  DUMMY_HARDWARE_IMAGES,
  formatKes,
  getStockStatus,
  LOCAL_PRODUCT_PLACEHOLDERS,
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "../lib/format";

export function WishlistPage() {
  const { addItem } = useCart();
  const { wishlist, removeFromWishlist, clearWishlist } = useCustomer();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  function showNotice(msg: string) {
    setAddedBanner(msg);
    setTimeout(() => setAddedBanner(null), 3500);
  }

  function handleAddToCart(item: WishlistItem) {
    addItem({
      productSlug: item.slug,
      productName: item.name,
      sku: item.sku,
      oemPartNumber: item.oemPartNumber,
      authenticity: item.authenticity,
      priceKes: item.priceKes,
      maxStock: item.stockQuantity,
      quantity: 1,
    });
    showNotice(`Added "${item.name}" to your Selection List.`);
  }

  function handleAddAllToCart() {
    const available = wishlist.filter((w) => w.stockQuantity > 0);
    if (available.length === 0) return;
    for (const item of available) {
      addItem({
        productSlug: item.slug,
        productName: item.name,
        sku: item.sku,
        oemPartNumber: item.oemPartNumber,
        authenticity: item.authenticity,
        priceKes: item.priceKes,
        maxStock: item.stockQuantity,
        quantity: 1,
      });
    }
    showNotice(
      `Added ${available.length} available item(s) to your Selection List.`,
    );
  }

  const hasAvailableItems = wishlist.some((w) => w.stockQuantity > 0);

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
        <span className="text-ink-charcoal font-semibold">Wishlist</span>
      </nav>

      {/* Unified Account Header & Tabs */}
      <AccountNavBar />

      {addedBanner && (
        <div
          role="status"
          className="rounded-neo-sm border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{addedBanner}</span>
        </div>
      )}

      {/* Wishlist Section */}
      <section aria-labelledby="wishlist-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="wishlist-heading"
              className="text-lg sm:text-xl font-extrabold text-ink-charcoal"
            >
              Saved Wishlist ({wishlist.length})
            </h2>
            <p className="text-xs text-ink-secondary">
              Shortlisted toners, ink cartridges, drum units, and printers saved
              for quick ordering.
            </p>
          </div>

          {wishlist.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {hasAvailableItems && (
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  className="neo-button-primary px-4 py-2 text-xs cursor-pointer"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Add All to Selection List</span>
                </button>
              )}

              <button
                type="button"
                onClick={clearWishlist}
                className="neo-button-secondary px-3.5 py-2 text-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Wishlist</span>
              </button>
            </div>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="neo-card p-8 sm:p-12 text-center space-y-4">
            <Heart className="mx-auto h-12 w-12 text-brand-red" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-extrabold text-ink-charcoal">
                Your Wishlist is Empty
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                Save your office&apos;s regularly used toner cartridges, drum
                units, or spare parts by clicking the heart icon on any product
                card or product page.
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
                <Printer className="h-4 w-4 text-brand-red" />
                <span>Find Toner by Printer</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => {
              const uploadedImage =
                item.thumbnailUrl ||
                (Array.isArray(item.images) && item.images.length > 0
                  ? item.images[0]
                  : "");
              const primaryImage =
                uploadedImage || DUMMY_HARDWARE_IMAGES[item.productType];
              const fallbackSvg = LOCAL_PRODUCT_PLACEHOLDERS[item.productType];
              const hasErr = Boolean(imgErrors[item.slug]);
              const displayImage = !hasErr ? primaryImage : fallbackSvg;
              const stockStatus = getStockStatus(item.stockQuantity);

              return (
                <article
                  key={item.slug}
                  className="neo-card flex flex-col justify-between p-4 space-y-4"
                >
                  <div className="space-y-3">
                    <div className="neo-surface-inset relative aspect-[4/3] w-full overflow-hidden">
                      <Link
                        to={`/shop/${item.slug}`}
                        className="block h-full w-full"
                      >
                        <img
                          src={displayImage}
                          alt={item.name}
                          loading="lazy"
                          onError={() =>
                            setImgErrors((prev) => ({
                              ...prev,
                              [item.slug]: true,
                            }))
                          }
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </Link>

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(item.slug)}
                        aria-label={`Remove ${item.name} from wishlist`}
                        title="Remove from Wishlist"
                        className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-surface-white/95 border border-surface-border shadow-neo-sm flex items-center justify-center text-brand-red hover:bg-brand-red hover:text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-neo-sm bg-canvas-ivory border border-surface-border px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                        {PRODUCT_AUTHENTICITY_LABELS[item.authenticity]}
                      </span>
                      <span className="rounded-neo-sm bg-canvas-ivory border border-surface-border px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                        {PRODUCT_TYPE_LABELS[item.productType]}
                      </span>
                      <span
                        className={`rounded-neo-sm px-2 py-0.5 text-[11px] font-bold ${
                          stockStatus.available
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-red-50 border border-red-200 text-brand-red"
                        }`}
                      >
                        {stockStatus.label}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-ink-charcoal line-clamp-2">
                        <Link
                          to={`/shop/${item.slug}`}
                          className="hover:text-brand-red transition-colors"
                        >
                          {item.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-ink-muted font-mono">
                        SKU: {item.sku}
                        {item.oemPartNumber
                          ? ` • OEM: ${item.oemPartNumber}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-surface-border space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-ink-charcoal">
                        {formatKes(item.priceKes)}
                      </span>
                      {item.comparePriceKes && (
                        <span className="text-xs text-ink-muted line-through">
                          {formatKes(item.comparePriceKes)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!stockStatus.available}
                        onClick={() => handleAddToCart(item)}
                        className="neo-button-primary flex-1 py-2 px-3 text-xs cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {stockStatus.available
                            ? "Add to Selection"
                            : "Out of Stock"}
                        </span>
                      </button>

                      <Link
                        to={`/shop/${item.slug}`}
                        className="neo-button-secondary py-2 px-3 text-xs"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
