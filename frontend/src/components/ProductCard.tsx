import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  Disc,
  Droplets,
  Package,
  Plus,
  Printer,
} from "lucide-react";
import type { ProductSummary, ProductType } from "@jocta/shared";
import {
  formatKes,
  getStockStatus,
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "../lib/format";
import { useCart } from "../context/CartContext";

// High quality curated placeholder hardware imagery per category when product doesn't have an uploaded image
const DEFAULT_HARDWARE_IMAGES: Record<ProductType, string> = {
  toner: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80",
  drum: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80",
  ink: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80",
  printer_part: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
  printer: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80",
  consumable: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80",
};

function FallbackProductIcon({ productType }: { productType: ProductType }) {
  switch (productType) {
    case "toner":
      return <Package className="h-8 w-8 text-ink-muted" />;
    case "drum":
      return <Disc className="h-8 w-8 text-ink-muted" />;
    case "ink":
      return <Droplets className="h-8 w-8 text-ink-muted" />;
    case "printer_part":
      return <Cpu className="h-8 w-8 text-ink-muted" />;
    case "printer":
      return <Printer className="h-8 w-8 text-ink-muted" />;
    default:
      return <Package className="h-8 w-8 text-ink-muted" />;
  }
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const [imgError, setImgError] = useState(false);
  const { addItem } = useCart();

  const rawImage =
    product.thumbnailUrl ||
    (Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : "");
  
  const displayImage = rawImage || DEFAULT_HARDWARE_IMAGES[product.productType];
  const stock = getStockStatus(product.stockQuantity);

  // Clean title: remove any demo markers for a production aesthetic
  const cleanTitle = product.name.replace(/\[DEMO\]\s*/gi, "").trim();

  const brandText =
    product.brand?.name ?? PRODUCT_TYPE_LABELS[product.productType];
  const partCodeText = product.oemPartNumber || product.sku;

  return (
    <article className="neo-card-interactive group flex flex-col justify-between p-4">
      <div>
        {/* Top Image Container */}
        <Link
          to={`/shop/${product.slug}`}
          className="neo-surface-inset relative block h-48 w-full overflow-hidden rounded-2xl border-0"
        >
          {!imgError ? (
            <img
              src={displayImage}
              alt={cleanTitle}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
              <FallbackProductIcon productType={product.productType} />
              <span className="mt-2 text-xs font-bold text-ink-muted">
                {PRODUCT_TYPE_LABELS[product.productType]}
              </span>
            </div>
          )}

          {/* Single Top-Left Authenticity Badge */}
          <div className="absolute left-3 top-3">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm ${
                product.authenticity === "original"
                  ? "bg-zinc-950 text-white border border-white/15"
                  : "bg-surface-white text-ink-charcoal border border-surface-border"
              }`}
            >
              {PRODUCT_AUTHENTICITY_LABELS[product.authenticity]}
            </span>
          </div>
        </Link>

        {/* Brand & Part Code in Muted Text */}
        <div className="mt-3.5 flex items-center justify-between text-xs text-ink-muted">
          <span className="font-bold uppercase tracking-wider text-ink-secondary">
            {brandText}
          </span>
          <span className="font-mono font-semibold text-ink-muted">
            {partCodeText}
          </span>
        </div>

        {/* Bold 2-Line Title */}
        <h3 className="mt-1.5 text-base font-extrabold leading-snug text-ink-charcoal line-clamp-2">
          <Link
            to={`/shop/${product.slug}`}
            className="hover:text-brand-red transition-colors"
          >
            {cleanTitle}
          </Link>
        </h3>

        {/* Technical Specs: Page Yield & Color */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
          {product.pageYield && (
            <span className="neo-pill-inset rounded-lg px-2 py-0.5 font-medium">
              ~{product.pageYield.toLocaleString()} pages
            </span>
          )}
          {product.color && (
            <span className="neo-pill-inset rounded-lg px-2 py-0.5 font-medium">
              {product.color}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Price, Stock Indicator & Action */}
      <div className="mt-4 pt-3 border-t border-surface-border">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-lg font-black text-ink-charcoal">
              {formatKes(product.priceKes)}
            </span>
            {product.comparePriceKes && (
              <span className="ml-2 text-xs text-ink-muted line-through">
                {formatKes(product.comparePriceKes)}
              </span>
            )}
          </div>

          {/* Stock Indicator */}
          {stock.available ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              In Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red">
              <span className="h-2 w-2 rounded-full bg-brand-red" />
              Out of Stock
            </span>
          )}
        </div>

        {/* Add to Selection Button with Red Convex Shadow */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            to={`/shop/${product.slug}`}
            className="neo-button-secondary flex-1 py-2 text-center text-xs font-bold"
          >
            Details
          </Link>

          {stock.available && (
            <button
              type="button"
              onClick={() =>
                addItem({
                  productSlug: product.slug,
                  productName: cleanTitle,
                  sku: product.sku,
                  oemPartNumber: product.oemPartNumber,
                  authenticity: product.authenticity,
                  priceKes: product.priceKes,
                  maxStock: product.stockQuantity,
                })
              }
              aria-label={`Add ${cleanTitle} to selection list`}
              className="neo-button-primary px-4 py-2 text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add to Selection</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
