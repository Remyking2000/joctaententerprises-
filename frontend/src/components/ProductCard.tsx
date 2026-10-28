import { useState } from "react";
import { Link } from "react-router-dom";
import type { ProductSummary } from "@jocta/shared";
import {
  DUMMY_HARDWARE_IMAGES,
  formatKes,
  isDemoRecord,
  LOCAL_PRODUCT_PLACEHOLDERS,
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "../lib/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const [imgError, setImgError] = useState(false);

  const uploadedImage =
    product.thumbnailUrl ||
    (Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : "");

  const primaryImage = uploadedImage || DUMMY_HARDWARE_IMAGES[product.productType];
  const fallbackSvg = LOCAL_PRODUCT_PLACEHOLDERS[product.productType];
  const displayImage = !imgError ? primaryImage : fallbackSvg;
  const isDemo = isDemoRecord(product);

  return (
    <article className="neo-card-interactive group flex flex-col justify-between p-2.5 sm:p-4">
      <div>
        {/* Consistent 4:3 Image Container */}
        <Link
          to={`/shop/${product.slug}`}
          className="neo-surface-inset relative block aspect-[4/3] w-full overflow-hidden"
        >
          <img
            src={displayImage}
            alt={`${product.name} (${PRODUCT_TYPE_LABELS[product.productType]})`}
            loading="lazy"
            width={400}
            height={300}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Original / Compatible Designation & Demo Safeguard Badge */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
          <span className="rounded-neo-sm bg-canvas-ivory border border-surface-border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-ink-secondary">
            {PRODUCT_AUTHENTICITY_LABELS[product.authenticity]}
          </span>
          {isDemo && (
            <span
              title="Development seed record — not verified client inventory"
              className="rounded-neo-sm bg-brand-red-tint border border-brand-red px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase text-brand-red"
            >
              Demo
            </span>
          )}
        </div>

        {/* Product Name (Preserves [DEMO] designation intact) */}
        <h3 className="mt-1.5 sm:mt-2 text-xs sm:text-base font-bold leading-snug text-ink-charcoal line-clamp-2">
          <Link
            to={`/shop/${product.slug}`}
            className="hover:text-brand-red transition-colors"
          >
            {product.name}
          </Link>
        </h3>
      </div>

      {/* Price in KSh & Clear Product-View Action */}
      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-sm sm:text-base font-extrabold text-ink-charcoal">
            {formatKes(product.priceKes)}
          </span>
          {isDemo && (
            <span className="block text-[9px] sm:text-[10px] font-semibold text-ink-muted">
              Demo price
            </span>
          )}
        </div>

        <Link
          to={`/shop/${product.slug}`}
          className="neo-button-secondary w-full sm:w-auto px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold shrink-0 text-center"
        >
          View Product
        </Link>
      </div>
    </article>
  );
}
