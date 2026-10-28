import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Layers,
  Package,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import type {
  BrandSummary,
  CategorySummary,
  CreateProductInput,
  PrinterModelSummary,
  ProductDetail,
  ProductVariantInput,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";
import { formatKes } from "../lib/format";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [allPrinterModels, setAllPrinterModels] = useState<PrinterModelSummary[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Existing detail (for variants & printer models if editing)
  const [existingDetail, setExistingDetail] = useState<ProductDetail | null>(
    null,
  );

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [sku, setSku] = useState("");
  const [oemPartNumber, setOemPartNumber] = useState("");
  const [productType, setProductType] = useState<CreateProductInput["productType"]>("toner");
  const [condition, setCondition] = useState<CreateProductInput["condition"]>("new");
  const [authenticity, setAuthenticity] = useState<CreateProductInput["authenticity"]>("original");
  const [pageYield, setPageYield] = useState<string>("");
  const [color, setColor] = useState("");
  const [priceKes, setPriceKes] = useState("");
  const [comparePriceKes, setComparePriceKes] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Variants and Compatibility state
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [variantsList, setVariantsList] = useState<ProductVariantInput[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const [cats, brs, pms] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getBrands(),
          catalogApi.getPrinterModels({ limit: 100 }),
        ]);
        setCategories(cats);
        setBrands(brs);
        setAllPrinterModels(pms);

        if (!isEditing && cats.length > 0) {
          setCategoryId(cats[0].id);
        }

        if (isEditing && id) {
          const detail = await adminApi.getProductById(id);
          setExistingDetail(detail);
          setName(detail.name);
          setSlug(detail.slug);
          setSlugManuallyEdited(true);
          setDescription(detail.description);
          setCategoryId(detail.categoryId);
          setBrandId(detail.brandId ?? "");
          setSku(detail.sku);
          setOemPartNumber(detail.oemPartNumber ?? "");
          setProductType(detail.productType);
          setCondition(detail.condition);
          setAuthenticity(detail.authenticity);
          setPageYield(detail.pageYield ? String(detail.pageYield) : "");
          setColor(detail.color ?? "");
          setPriceKes(detail.priceKes);
          setComparePriceKes(detail.comparePriceKes ?? "");
          setStockQuantity(String(detail.stockQuantity));
          setThumbnailUrl(detail.thumbnailUrl);
          setIsPublished(detail.isPublished);
          setIsFeatured(detail.isFeatured);
          setSelectedModelIds(detail.compatiblePrinterModels.map((m) => m.id));
          setVariantsList(
            detail.variants.map((v, idx) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              oemPartNumber: v.oemPartNumber ?? null,
              authenticity: v.authenticity === "compatible" ? "compatible" : "original",
              pageYield: v.pageYield ?? null,
              priceKes: v.priceKes,
              comparePriceKes: v.comparePriceKes ?? null,
              stockQuantity: v.stockQuantity,
              isActive: v.isActive ?? true,
              sortOrder: v.sortOrder ?? idx,
            })),
          );
        }
      } catch (err) {
        setGeneralError(
          err instanceof Error
            ? err.message
            : "Failed to load product data from API.",
        );
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [id, isEditing]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManuallyEdited && !isEditing) {
      setSlug(generateSlug(val));
    }
  }

  function handleToggleModelId(modelId: string) {
    setSelectedModelIds((prev) =>
      prev.includes(modelId)
        ? prev.filter((mid) => mid !== modelId)
        : [...prev, modelId],
    );
  }

  function handleAddVariant() {
    const nextIdx = variantsList.length + 1;
    const newVariant: ProductVariantInput = {
      name: name.trim() ? `${name.trim()} - Variant ${nextIdx}` : `Variant ${nextIdx}`,
      sku: sku.trim() ? `${sku.trim()}-V${nextIdx}` : `SKU-V${nextIdx}`,
      authenticity: authenticity === "compatible" ? "compatible" : "original",
      priceKes: priceKes && !isNaN(parseFloat(priceKes)) ? parseFloat(priceKes).toFixed(2) : "0.00",
      comparePriceKes: comparePriceKes && !isNaN(parseFloat(comparePriceKes)) ? parseFloat(comparePriceKes).toFixed(2) : null,
      stockQuantity: Number(stockQuantity) || 0,
      isActive: true,
      sortOrder: nextIdx,
    };
    setVariantsList((prev) => [...prev, newVariant]);
  }

  function handleUpdateVariant(
    index: number,
    field: keyof ProductVariantInput,
    val: unknown,
  ) {
    setVariantsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  }

  function handleRemoveVariant(index: number) {
    setVariantsList((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    // Basic frontend checks
    if (!name.trim()) {
      setGeneralError("Product name is required.");
      return;
    }
    if (!slug.trim()) {
      setGeneralError("Product slug is required.");
      return;
    }
    if (!sku.trim()) {
      setGeneralError("Product SKU is required.");
      return;
    }
    if (!categoryId) {
      setGeneralError("Please select a category.");
      return;
    }
    const parsedPrice = parseFloat(priceKes);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setGeneralError("Price in KES must be a valid non-negative number.");
      return;
    }
    const parsedStock = parseInt(stockQuantity, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setGeneralError("Stock quantity must be a non-negative integer.");
      return;
    }

    // Validate variants if any exist
    for (let i = 0; i < variantsList.length; i++) {
      const v = variantsList[i];
      if (!v.name.trim()) {
        setGeneralError(`Variant #${i + 1}: Name is required.`);
        return;
      }
      if (!v.sku.trim()) {
        setGeneralError(`Variant #${i + 1}: SKU is required.`);
        return;
      }
      const vPrice = parseFloat(v.priceKes);
      if (isNaN(vPrice) || vPrice < 0) {
        setGeneralError(`Variant #${i + 1}: Valid non-negative price is required.`);
        return;
      }
      const vStock = Number(v.stockQuantity);
      if (isNaN(vStock) || vStock < 0) {
        setGeneralError(`Variant #${i + 1}: Stock quantity must be non-negative.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload: CreateProductInput = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        categoryId,
        brandId: brandId ? brandId : null,
        sku: sku.trim(),
        oemPartNumber: oemPartNumber.trim() ? oemPartNumber.trim() : null,
        productType,
        condition,
        authenticity,
        pageYield: pageYield.trim() ? parseInt(pageYield.trim(), 10) : null,
        color: color.trim() ? color.trim() : null,
        priceKes: parsedPrice.toFixed(2),
        comparePriceKes: comparePriceKes.trim()
          ? parseFloat(comparePriceKes.trim()).toFixed(2)
          : null,
        stockQuantity: parsedStock,
        thumbnailUrl: thumbnailUrl.trim(),
        images: thumbnailUrl.trim() ? [thumbnailUrl.trim()] : [],
        isPublished,
        isFeatured,
        compatibleModelIds: selectedModelIds,
        variants: variantsList.map((v, idx) => ({
          id: v.id,
          name: v.name.trim(),
          sku: v.sku.trim(),
          oemPartNumber: v.oemPartNumber ?? null,
          authenticity: v.authenticity === "compatible" ? "compatible" : "original",
          pageYield: v.pageYield ?? null,
          priceKes: parseFloat(v.priceKes).toFixed(2),
          comparePriceKes:
            v.comparePriceKes && String(v.comparePriceKes).trim()
              ? parseFloat(String(v.comparePriceKes).trim()).toFixed(2)
              : null,
          stockQuantity: Number(v.stockQuantity) || 0,
          isActive: v.isActive ?? true,
          sortOrder: v.sortOrder ?? idx,
        })),
      };

      if (isEditing && id) {
        await adminApi.updateProduct(id, payload);
        setSuccessMessage("Product updated successfully in the database.");
      } else {
        const created = await adminApi.createProduct(payload);
        setSuccessMessage("Product created successfully in the database.");
        setTimeout(() => {
          navigate(`/admin/products/${created.id}/edit`);
        }, 1000);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError("An unexpected error occurred while saving.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-ink-muted">
        <Package className="h-8 w-8 mx-auto animate-pulse text-brand-red mb-2" />
        Loading product information from database...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products"
            className="neo-button-secondary p-2 shrink-0"
            aria-label="Back to products list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-ink-charcoal uppercase tracking-tight">
              {isEditing ? "Edit Product" : "Create New Product"}
            </h1>
            <p className="text-xs text-ink-secondary">
              {isEditing
                ? `ID: ${id} • Slug: ${slug}`
                : "Add a new item to the Jocta catalogue database."}
            </p>
          </div>
        </div>

        {isEditing && isPublished && (
          <Link
            to={`/shop/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <ExternalLink className="h-3.5 w-3.5 text-brand-red" />
            <span>Storefront View</span>
          </Link>
        )}
      </div>

      {/* Notifications */}
      {generalError && (
        <div
          role="alert"
          className="rounded-neo-base border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Save Failed</p>
            <p className="mt-0.5 text-ink-secondary">{generalError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="alert"
          className="rounded-neo-base border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            1. Core Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-ink-charcoal mb-1">
                Product Title <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. HP 59A Black LaserJet Toner Cartridge (CF259A)"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                URL Slug <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="e.g. hp-59a-cf259a-black-toner"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
              <p className="mt-1 text-[10px] text-ink-muted">
                Lowercase kebab-case only. Used in URL: /shop/{slug}
              </p>
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                SKU (Stock Keeping Unit) <span className="text-brand-red">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. CF259A"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                OEM Part Number
              </label>
              <input
                type="text"
                value={oemPartNumber}
                onChange={(e) => setOemPartNumber(e.target.value.toUpperCase())}
                placeholder="e.g. CF259A"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Category <span className="text-brand-red">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Brand / Manufacturer
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              >
                <option value="">Generic / Unspecified</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-ink-charcoal mb-1">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description, cartridge features, or printer specifications..."
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-ink-charcoal focus:border-brand-red focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Specifications & Types */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            2. Specifications &amp; Supply Classification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Supply Type
              </label>
              <select
                value={productType}
                onChange={(e) =>
                  setProductType(e.target.value as CreateProductInput["productType"])
                }
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              >
                <option value="toner">Laser Toner</option>
                <option value="ink">Ink Tank / Cartridge</option>
                <option value="drum">Imaging Drum Unit</option>
                <option value="printer_part">Printer Spare Part</option>
                <option value="printer">Complete Printer</option>
                <option value="consumable">Other Consumable</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Authenticity
              </label>
              <select
                value={authenticity}
                onChange={(e) =>
                  setAuthenticity(
                    e.target.value as CreateProductInput["authenticity"],
                  )
                }
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              >
                <option value="original">Original OEM</option>
                <option value="compatible">Compatible Alternative</option>
                <option value="both">Both Available (Multi-variant)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as CreateProductInput["condition"])
                }
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              >
                <option value="new">Brand New (Factory Sealed)</option>
                <option value="refurbished">Refurbished / Certified</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Page Yield (Pages)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={pageYield}
                onChange={(e) => setPageYield(e.target.value)}
                placeholder="e.g. 3000"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Black, Cyan, Magenta, Yellow"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Thumbnail Image URL
              </label>
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... or /images/..."
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-[11px] text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Inventory */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            3. Pricing (KES) &amp; Inventory Stock
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Selling Price (KSh) <span className="text-brand-red">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={priceKes}
                onChange={(e) => setPriceKes(e.target.value)}
                placeholder="e.g. 14500.00"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Compare Price (KSh strike-through)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={comparePriceKes}
                onChange={(e) => setComparePriceKes(e.target.value)}
                placeholder="e.g. 16000.00"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-ink-muted focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Stock Quantity <span className="text-brand-red">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Visibility & Publication Status */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            4. Publication Status
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-red focus:ring-brand-red"
              />
              <div>
                <span className="font-bold text-ink-charcoal block">
                  Publish on Storefront
                </span>
                <span className="text-ink-muted block text-[11px]">
                  When checked, this product is immediately discoverable and
                  searchable on the live Jocta catalogue.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-red focus:ring-brand-red"
              />
              <div>
                <span className="font-bold text-ink-charcoal block">
                  Feature on Homepage
                </span>
                <span className="text-ink-muted block text-[11px]">
                  When checked, highlighted in the Homepage Featured Supplies section.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Compatible Printer Models */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal">
                5. Compatible Printer Models ({selectedModelIds.length} Selected)
              </h2>
              <p className="text-[11px] text-ink-muted">
                Select which printer hardware this item works with so customers can find it via the compatibility search.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedModelIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedModelIds([])}
                  className="text-[11px] font-bold text-ink-secondary hover:text-brand-red underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Model Search and Quick Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
              <input
                type="text"
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                placeholder="Filter printer models by name or brand (e.g. LaserJet, EcoTank, Canon)..."
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory pl-8 pr-3 py-1.5 text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            {modelSearchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  const query = modelSearchQuery.toLowerCase();
                  const filtered = allPrinterModels.filter(
                    (m) =>
                      m.name.toLowerCase().includes(query) ||
                      (m.brandName && m.brandName.toLowerCase().includes(query)),
                  );
                  const filteredIds = filtered.map((m) => m.id);
                  setSelectedModelIds((prev) =>
                    Array.from(new Set([...prev, ...filteredIds])),
                  );
                }}
                className="neo-button-secondary text-[11px] py-1.5 px-3 shrink-0"
              >
                Select Filtered
              </button>
            )}
          </div>

          {/* Printer Models List */}
          {allPrinterModels.length === 0 ? (
            <p className="text-xs text-ink-muted italic py-2">
              Loading printer models catalogue...
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 border border-surface-border rounded-neo-sm bg-canvas-ivory/50">
              {allPrinterModels
                .filter((m) => {
                  if (!modelSearchQuery.trim()) return true;
                  const query = modelSearchQuery.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(query) ||
                    (m.brandName && m.brandName.toLowerCase().includes(query))
                  );
                })
                .map((pm) => {
                  const isChecked = selectedModelIds.includes(pm.id);
                  return (
                    <label
                      key={pm.id}
                      className={`flex items-start gap-2.5 p-2 rounded-neo-sm border transition-colors cursor-pointer select-none text-xs ${
                        isChecked
                          ? "bg-brand-red/10 border-brand-red text-ink-charcoal font-bold"
                          : "bg-surface-white border-surface-border text-ink-secondary hover:border-ink-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleModelId(pm.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-surface-border text-brand-red focus:ring-brand-red"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{pm.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-muted font-normal mt-0.5">
                          <Printer className="h-2.5 w-2.5 text-brand-red shrink-0" />
                          <span>{pm.brandName ?? "Printer"}</span>
                          {pm.series && <span>• {pm.series}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>
          )}
        </div>

        {/* Section 6: Product Sub-Variants */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal">
                6. Product Sub-Variants ({variantsList.length})
              </h2>
              <p className="text-[11px] text-ink-muted">
                Define distinct purchasing options (e.g. Standard vs High-Yield, Genuine vs Compatible) with custom SKUs, pricing, and stock.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddVariant}
              className="neo-button-secondary inline-flex items-center gap-1 text-xs py-1.5 px-3 self-start sm:self-auto shrink-0"
            >
              <Plus className="h-3.5 w-3.5 text-brand-red" />
              <span>Add Variant</span>
            </button>
          </div>

          {variantsList.length === 0 ? (
            <div className="p-4 rounded-neo-sm border border-surface-border bg-canvas-ivory/50 text-xs text-ink-muted">
              <p className="font-semibold text-ink-charcoal mb-1">
                No sub-variants configured
              </p>
              <p>
                This product will be sold as a single item using the primary SKU (
                <span className="font-mono font-bold text-ink-charcoal">{sku || "..."}</span>
                ) and main selling price (
                <span className="font-bold text-ink-charcoal">
                  {priceKes ? formatKes(priceKes) : "KSh 0.00"}
                </span>
                ). If this product has multiple capacity or authenticity options, click{" "}
                <span className="font-bold text-brand-red">Add Variant</span> above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {variantsList.map((variant, index) => (
                <div
                  key={variant.id ?? index}
                  className="rounded-neo-sm border border-surface-border bg-canvas-ivory p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-ink-charcoal">
                      Variant #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1 cursor-pointer"
                      title="Remove variant"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Variant Name <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variant.name}
                        onChange={(e) =>
                          handleUpdateVariant(index, "name", e.target.value)
                        }
                        placeholder="e.g. High Yield Black"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Variant SKU <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variant.sku}
                        onChange={(e) =>
                          handleUpdateVariant(index, "sku", e.target.value)
                        }
                        placeholder="e.g. HP-CF226X-HY"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 font-mono text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Authenticity
                      </label>
                      <select
                        value={variant.authenticity ?? "original"}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "authenticity",
                            e.target.value as ProductVariantInput["authenticity"],
                          )
                        }
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden cursor-pointer"
                      >
                        <option value="original">Original (OEM)</option>
                        <option value="compatible">Compatible (Third Party)</option>
                        <option value="remanufactured">Remanufactured</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Price (KES) <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={variant.priceKes}
                        onChange={(e) =>
                          handleUpdateVariant(index, "priceKes", e.target.value)
                        }
                        placeholder="e.g. 15000.00"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 font-mono font-bold text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Compare Price (KES strike-through)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.comparePriceKes ?? ""}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "comparePriceKes",
                            e.target.value,
                          )
                        }
                        placeholder="e.g. 17500.00"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 font-mono text-xs text-ink-muted focus:border-brand-red focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Stock Quantity <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        value={variant.stockQuantity ?? 0}
                        onChange={(e) =>
                          handleUpdateVariant(
                            index,
                            "stockQuantity",
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        placeholder="e.g. 5"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 font-mono font-bold text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/admin/products"
            className="neo-button-secondary text-xs py-2 px-4"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="neo-button-primary text-xs py-2 px-5 inline-flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? "Saving to Database..." : isEditing ? "Save Changes" : "Create Product"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
