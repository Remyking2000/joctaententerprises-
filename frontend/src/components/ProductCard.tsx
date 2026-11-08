import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import type { ProductSummary } from "@jocta/shared";
import { useCustomer } from "../context/CustomerContext";
import {
  formatKes,
  LOCAL_PRODUCT_PLACEHOLDERS,
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "../lib/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const [imgError, setImgError] = useState(false);
  const { isWishlisted, toggleWishlist } = useCustomer();

  const saved = isWishlisted(product.slug);

  const uploadedImage =
    product.thumbnailUrl ||
    (Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : "");

  const primaryImage =
    uploadedImage || LOCAL_PRODUCT_PLACEHOLDERS[product.productType];
  const fallbackSvg = LOCAL_PRODUCT_PLACEHOLDERS[product.productType];
  const displayImage = !imgError ? primaryImage : fallbackSvg;

  return (
    <article className="neo-card-interactive group flex flex-col justify-between p-2.5 sm:p-4">
      <div>
        {/* Consistent 4:3 Image Container */}
        <div className="neo-surface-inset relative aspect-[4/3] w-full overflow-hidden">
          <Link to={`/shop/${product.slug}`} className="block h-full w-full">
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

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
            }}
            aria-label={
              saved
                ? `Remove ${product.name} from wishlist`
                : `Save ${product.name} to wishlist`
            }
            aria-pressed={saved}
            title={saved ? "Saved in Wishlist" : "Save to Wishlist"}
            className={`absolute top-2 right-2 h-8 w-8 rounded-full border shadow-neo-sm inline-flex items-center justify-center transition-colors cursor-pointer ${
              saved
                ? "bg-brand-red border-brand-red text-white"
                : "bg-surface-white/95 border-surface-border text-ink-secondary hover:text-brand-red hover:border-brand-red"
            }`}
          >
            <Heart
              className={`h-4 w-4 ${saved ? "fill-current" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Original / Compatible designation */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
          <span className="rounded-neo-sm bg-canvas-ivory border border-surface-border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-ink-secondary">
            {PRODUCT_AUTHENTICITY_LABELS[product.authenticity]}
          </span>
        </div>

        {/* Product name */}
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
