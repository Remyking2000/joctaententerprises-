import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import type { ProductDetail, ProductVariantSummary } from "@jocta/shared";
import { ApiClientError, catalogApi } from "../lib/api";
import {
  DUMMY_HARDWARE_IMAGES,
  formatKes,
  getStockStatus,
  isDemoRecord,
  LOCAL_PRODUCT_PLACEHOLDERS,
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_CONDITION_LABELS,
  PRODUCT_TYPE_LABELS,
  VARIANT_AUTHENTICITY_LABELS,
} from "../lib/format";
import { useCart } from "../context/CartContext";
import { ProductCard } from "../components/ProductCard";

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProduct() {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setError(null);

    try {
      const data = await catalogApi.getProductBySlug(slug);
      setProduct(data);

      const firstImg =
        data.thumbnailUrl ||
        (Array.isArray(data.images) && data.images.length > 0
          ? data.images[0]
          : "");
      setSelectedImage(firstImg);
      setImgError(false);
      setQuantity(1);

      if (data.variants && data.variants.length > 0) {
        const firstInStock = data.variants.find((v) => v.stockQuantity > 0);
        setSelectedVariantId(firstInStock?.id ?? data.variants[0].id);
      } else {
        setSelectedVariantId("");
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load product details.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <main
        aria-live="polite"
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8"
      >
        <div className="neo-card p-6 sm:p-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 aspect-[4/3] rounded-neo-sm bg-canvas-warm" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-5 w-1/3 rounded bg-canvas-warm" />
            <div className="h-8 w-3/4 rounded bg-canvas-warm" />
            <div className="h-6 w-1/4 rounded bg-canvas-warm" />
            <div className="h-24 w-full rounded bg-canvas-warm" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    if (error) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div role="alert" className="neo-card p-8 text-center space-y-4">
            <AlertCircle
              className="mx-auto h-10 w-10 text-brand-red"
              aria-hidden="true"
            />
            <h1 className="text-xl font-bold text-ink-charcoal">
              Error Loading Product
            </h1>
            <p className="text-sm text-ink-secondary">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadProduct()}
                className="neo-button-primary px-5 py-2.5 text-xs"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
              <Link
                to="/shop"
                className="neo-button-secondary px-5 py-2.5 text-xs"
              >
                Back to Shop
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="neo-card p-8 sm:p-10 text-center space-y-4">
          <Package
            className="mx-auto h-12 w-12 text-brand-red"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-extrabold text-ink-charcoal">
            Product Not Found
          </h1>
          <p className="text-sm text-ink-secondary max-w-md mx-auto">
            The requested product could not be found or is not currently
            published in the Jocta Enterprises catalogue.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/shop" className="neo-button-primary px-5 py-2.5 text-sm">
              Browse Full Catalogue
            </Link>
            <Link
              to="/compatibility"
              className="neo-button-secondary px-5 py-2.5 text-sm"
            >
              Printer Compatibility Finder
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const hasVariants = product.variants && product.variants.length > 0;
  const activeVariant: ProductVariantSummary | undefined = hasVariants
    ? product.variants.find((v) => v.id === selectedVariantId) ??
      product.variants[0]
    : undefined;

  const activePriceKes = activeVariant
    ? activeVariant.priceKes
    : product.priceKes;
  const activeComparePriceKes = activeVariant
    ? activeVariant.comparePriceKes
    : product.comparePriceKes;
  const activeStockQty = activeVariant
    ? activeVariant.stockQuantity
    : product.stockQuantity;
  const activeSku = activeVariant ? activeVariant.sku : product.sku;
  const activeOemPart = activeVariant?.oemPartNumber ?? product.oemPartNumber;
  const activePageYield = activeVariant?.pageYield ?? product.pageYield;
  const activeAuthenticityLabel = activeVariant
    ? VARIANT_AUTHENTICITY_LABELS[activeVariant.authenticity]
    : PRODUCT_AUTHENTICITY_LABELS[product.authenticity];

  const stockStatus = getStockStatus(activeStockQty);
  const allImages = Array.from(
    new Set(
      [product.thumbnailUrl, ...(product.images ?? [])].filter(Boolean),
    ),
  );
  const isDemo = isDemoRecord(product);
  const fallbackImage = LOCAL_PRODUCT_PLACEHOLDERS[product.productType];

  function handleAddToSelection() {
    if (!product || !stockStatus.available) return;
    addItem({
      productSlug: product.slug,
      productName: product.name,
      sku: activeSku,
      oemPartNumber: activeOemPart,
      authenticity: activeVariant
        ? activeVariant.authenticity
        : product.authenticity,
      variantId: activeVariant?.id,
      variantName: activeVariant?.name,
      priceKes: activePriceKes,
      maxStock: activeStockQty,
      quantity,
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-secondary"
      >
        <Link to="/" className="hover:text-brand-red">
          Home
        </Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-brand-red">
          Shop
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              to={`/shop?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-brand-red"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-ink-charcoal font-semibold">{product.name}</span>
      </nav>

      {/* Demo Data Warning Banner */}
      {isDemo && (
        <div
          role="note"
          className="neo-surface-inset border-brand-red bg-brand-red-tint px-4 py-3 text-xs text-ink-charcoal"
        >
          <strong>Demonstration Record ([DEMO]):</strong> This item, its KSh
          price, SKU, stock quantity, and compatibility mappings come from the
          development seed script and are not verified Jocta Enterprises
          catalogue data.
        </div>
      )}

      {/* Main Product Card */}
      <section className="neo-card p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: Product Image / Dummy Photo & Local SVG Fallback */}
          <div className="lg:col-span-5 space-y-4">
            <div className="neo-surface-inset relative aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
              {!imgError ? (
                <img
                  src={
                    selectedImage || DUMMY_HARDWARE_IMAGES[product.productType]
                  }
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={fallbackImage}
                  alt={`${product.name} placeholder illustration`}
                  className="h-full w-full object-contain p-4"
                />
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {allImages.map((imgUrl) => (
                  <button
                    key={imgUrl}
                    type="button"
                    onClick={() => {
                      setSelectedImage(imgUrl);
                      setImgError(false);
                    }}
                    className={`h-16 w-16 rounded-neo-sm border p-1 bg-surface-white ${
                      selectedImage === imgUrl
                        ? "border-brand-red shadow-neo-sm"
                        : "border-surface-border"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details, Variants & Provisional Selection */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <Link
                    to={`/shop?brand=${encodeURIComponent(product.brand.slug)}`}
                    className="rounded-neo-pill bg-canvas-ivory border border-surface-border px-3 py-1 text-xs font-bold text-ink-charcoal hover:border-brand-red"
                  >
                    {product.brand.name}
                  </Link>
                )}
                <span className="rounded-neo-pill bg-brand-red-tint border border-brand-red/30 px-3 py-1 text-xs font-bold text-brand-red">
                  {activeAuthenticityLabel}
                </span>
                <span className="rounded-neo-pill bg-canvas-ivory border border-surface-border px-3 py-1 text-xs font-semibold text-ink-secondary">
                  {PRODUCT_TYPE_LABELS[product.productType]} •{" "}
                  {PRODUCT_CONDITION_LABELS[product.condition]}
                </span>
                {isDemo && (
                  <span className="rounded-neo-pill bg-surface-white border border-brand-red px-2.5 py-0.5 text-[11px] font-bold uppercase text-brand-red">
                    Demonstration Record
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-charcoal leading-tight">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary pt-1">
                <span>
                  SKU:{" "}
                  <strong className="font-mono text-ink-charcoal">
                    {activeSku}
                  </strong>
                </span>
                {activeOemPart && (
                  <span>
                    OEM Part #:{" "}
                    <strong className="font-mono text-ink-charcoal">
                      {activeOemPart}
                    </strong>
                  </span>
                )}
                <span
                  className={`font-bold ${
                    stockStatus.available
                      ? "text-ink-charcoal"
                      : "text-brand-red"
                  }`}
                >
                  • {stockStatus.label}
                </span>
              </div>
            </div>

            {/* Price Block */}
            <div className="neo-surface-inset p-4 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Unit Price (KES)
                </p>
                <div className="mt-0.5 flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-ink-charcoal">
                    {formatKes(activePriceKes)}
                  </span>
                  {activeComparePriceKes && (
                    <span className="text-sm text-ink-muted line-through">
                      {formatKes(activeComparePriceKes)}
                    </span>
                  )}
                </div>
              </div>

              {activePageYield && (
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Estimated Page Yield
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-ink-charcoal">
                    ~{activePageYield.toLocaleString()} pages (ISO/IEC)
                  </p>
                </div>
              )}
            </div>

            {/* Selectable Variants (ONLY rendered when product actually has variants) */}
            {hasVariants && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                  Select Option ({product.variants.length} available):
                </label>
                <div
                  role="radiogroup"
                  aria-label="Product options"
                  className="grid grid-cols-1 gap-2.5"
                >
                  {product.variants.map((variant) => {
                    const isSelected = variant.id === activeVariant?.id;
                    const vStock = getStockStatus(variant.stockQuantity);
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setQuantity(1);
                        }}
                        className={`text-left rounded-neo-sm border p-3.5 transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-surface-white border-brand-red shadow-neo-sm ring-1 ring-brand-red/30"
                            : "bg-surface-white border-surface-border hover:border-brand-red/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-3.5 w-3.5 rounded-neo-pill border flex items-center justify-center ${
                                isSelected
                                  ? "border-brand-red bg-brand-red"
                                  : "border-ink-muted bg-surface-white"
                              }`}
                            />
                            <span className="text-sm font-bold text-ink-charcoal">
                              {variant.name}
                            </span>
                          </div>
                          <div className="mt-1 pl-5 flex flex-wrap gap-2 text-xs text-ink-secondary">
                            <span>
                              {
                                VARIANT_AUTHENTICITY_LABELS[
                                  variant.authenticity
                                ]
                              }
                            </span>
                            <span>• SKU: {variant.sku}</span>
                            {variant.pageYield && (
                              <span>
                                • ~{variant.pageYield.toLocaleString()} pages
                              </span>
                            )}
                            <span>• {vStock.label}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-ink-charcoal">
                            {formatKes(variant.priceKes)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="space-y-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Product Overview
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Provisional Add to Selection List */}
            <div className="border-t border-surface-border pt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-neo-sm border border-surface-border bg-surface-white px-2 py-1.5 shadow-neo-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!stockStatus.available || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="neo-button-secondary h-8 w-8 p-0"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-bold text-ink-charcoal">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) =>
                      activeStockQty > 0 ? Math.min(activeStockQty, q + 1) : q + 1,
                    )
                  }
                  disabled={
                    !stockStatus.available ||
                    (activeStockQty > 0 && quantity >= activeStockQty)
                  }
                  aria-label="Increase quantity"
                  className="neo-button-secondary h-8 w-8 p-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={!stockStatus.available}
                onClick={handleAddToSelection}
                className="neo-button-primary flex-1 py-3 px-6 text-sm"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                {stockStatus.available
                  ? "Add to Selection List"
                  : "Currently Out of Stock"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Specifications & Verified Printer Compatibility */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Technical Specifications Table */}
        <section
          aria-labelledby="product-specs-heading"
          className="lg:col-span-6 neo-card p-6 space-y-4"
        >
          <h2
            id="product-specs-heading"
            className="text-lg font-extrabold text-ink-charcoal"
          >
            Technical Specifications
          </h2>

          <dl className="divide-y divide-surface-border text-sm">
            <SpecRow label="SKU" value={activeSku} mono />
            {activeOemPart && (
              <SpecRow
                label="Manufacturer / OEM Part #"
                value={activeOemPart}
                mono
              />
            )}
            <SpecRow
              label="Brand / Manufacturer"
              value={product.brand?.name ?? "—"}
            />
            <SpecRow
              label="Category"
              value={product.category?.name ?? "—"}
            />
            <SpecRow
              label="Product Type"
              value={PRODUCT_TYPE_LABELS[product.productType]}
            />
            <SpecRow
              label="Authenticity"
              value={activeAuthenticityLabel}
            />
            <SpecRow
              label="Condition"
              value={PRODUCT_CONDITION_LABELS[product.condition]}
            />
            {activePageYield && (
              <SpecRow
                label="Estimated Page Yield"
                value={`~${activePageYield.toLocaleString()} pages`}
              />
            )}
            {product.color && (
              <SpecRow label="Print Color" value={product.color} />
            )}
            <SpecRow label="Stock Status" value={stockStatus.label} />
          </dl>
        </section>

        {/* Verified Compatible Printer Models */}
        <section
          aria-labelledby="product-compatibility-heading"
          className="lg:col-span-6 neo-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Printer
                className="h-5 w-5 text-brand-red"
                aria-hidden="true"
              />
              <h2
                id="product-compatibility-heading"
                className="text-lg font-extrabold text-ink-charcoal"
              >
                Verified Compatible Printer Models
              </h2>
            </div>
            <span className="rounded-neo-pill bg-canvas-ivory border border-surface-border px-2.5 py-0.5 text-xs font-bold text-ink-charcoal">
              {product.compatiblePrinterModels.length}
            </span>
          </div>

          {product.compatiblePrinterModels.length === 0 ? (
            <div className="neo-surface-inset p-5 text-sm text-ink-secondary space-y-2">
              <p className="font-semibold text-ink-charcoal">
                No verified printer model links recorded for this item yet.
              </p>
              <p className="text-xs">
                Always verify the OEM part number ({activeOemPart ?? activeSku})
                against your printer user manual before ordering.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-secondary">
                This product is explicitly linked in the catalogue database to
                the following printer models:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.compatiblePrinterModels.map((pm) => (
                  <li key={pm.id}>
                    <Link
                      to={`/compatibility?model=${encodeURIComponent(pm.slug)}`}
                      className="neo-surface-inset p-3 flex items-start gap-2.5 hover:border-brand-red transition-colors"
                    >
                      <CheckCircle2
                        className="h-4 w-4 text-brand-red shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-bold text-ink-charcoal">
                          {pm.name}
                        </p>
                        {pm.series && (
                          <p className="text-[11px] text-ink-muted">
                            {pm.series}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Related Products */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section
          aria-labelledby="related-products-heading"
          className="space-y-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h2
              id="related-products-heading"
              className="text-lg sm:text-2xl font-extrabold text-ink-charcoal"
            >
              Related Products in {product.category?.name ?? "Catalogue"}
            </h2>
            <Link
              to="/shop"
              className="neo-button-secondary px-3 sm:px-4 py-2 text-xs shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Catalogue
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {product.relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-surface-border bg-surface-white px-4 py-2.5 shadow-neo">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-neo-sm border border-surface-border bg-canvas-ivory px-1.5 py-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!stockStatus.available || quantity <= 1}
              aria-label="Decrease quantity"
              className="neo-button-secondary h-7 w-7 p-0"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[1.5rem] text-center text-xs font-bold text-ink-charcoal">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) =>
                  activeStockQty > 0 ? Math.min(activeStockQty, q + 1) : q + 1,
                )
              }
              disabled={
                !stockStatus.available ||
                (activeStockQty > 0 && quantity >= activeStockQty)
              }
              aria-label="Increase quantity"
              className="neo-button-secondary h-7 w-7 p-0"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            disabled={!stockStatus.available}
            onClick={handleAddToSelection}
            className="neo-button-primary flex-1 py-2.5 px-4 text-xs"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {stockStatus.available
                ? `Add to Selection — ${formatKes((Number(activePriceKes) || 0) * quantity)}`
                : "Out of Stock"}
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}

function SpecRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-4">
      <dt className="text-ink-secondary font-medium">{label}</dt>
      <dd
        className={`text-right font-bold text-ink-charcoal ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
