import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Package,
  Plus,
  Printer,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type {
  BrandSummary,
  CategorySummary,
  CreateProductInput,
  PrinterModelSummary,
  ProductVariantInput,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";
import { formatKes } from "../lib/format";
import { ProductImageGalleryDropzone } from "./components/ImageUploadDropzone";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSmartSku(
  name: string,
  productType: string,
  oemPart: string,
): string {
  const prefix = productType.slice(0, 3).toUpperCase();
  if (oemPart.trim()) {
    return `JOC-${prefix}-${oemPart.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "")}`;
  }
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.slice(0, 4))
    .join("-");
  const rand = Math.floor(100 + Math.random() * 900);
  return `JOC-${prefix}-${words || "ITEM"}-${rand}`;
}

const COLOR_PRESETS = [
  { label: "Black", dot: "bg-zinc-900" },
  { label: "Cyan", dot: "bg-cyan-500" },
  { label: "Magenta", dot: "bg-pink-600" },
  { label: "Yellow", dot: "bg-amber-400" },
  { label: "Tri-Color", dot: "bg-gradient-to-r from-cyan-500 via-pink-500 to-amber-400" },
  { label: "CMYK Set", dot: "bg-zinc-700" },
];

export function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [allPrinterModels, setAllPrinterModels] = useState<PrinterModelSummary[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [sku, setSku] = useState("");
  const [oemPartNumber, setOemPartNumber] = useState("");
  const [productType, setProductType] = useState<CreateProductInput["productType"]>("toner");
  const [condition, setCondition] = useState<CreateProductInput["condition"]>("new");
  const [authenticity, setAuthenticity] = useState<CreateProductInput["authenticity"]>("original");
  const [pageYield, setPageYield] = useState<string>("");
  const [color, setColor] = useState("Black");
  const [priceKes, setPriceKes] = useState("");
  const [comparePriceKes, setComparePriceKes] = useState("");
  const [stockQuantity, setStockQuantity] = useState("10");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Variants and Compatibility state
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [selectedModelBrandId, setSelectedModelBrandId] = useState("");
  const [variantsList, setVariantsList] = useState<ProductVariantInput[]>([]);

  // Inline Quick-Add states (Category, Brand, Printer Model)
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatSaving, setQuickCatSaving] = useState(false);

  const [quickBrandOpen, setQuickBrandOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");
  const [quickBrandSaving, setQuickBrandSaving] = useState(false);

  const [quickModelOpen, setQuickModelOpen] = useState(false);
  const [quickModelName, setQuickModelName] = useState("");
  const [quickModelSeries, setQuickModelSeries] = useState("");
  const [quickModelBrandId, setQuickModelBrandId] = useState("");
  const [quickModelSaving, setQuickModelSaving] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [cats, brs, pms] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getBrands(),
          adminApi
            .getPrinterModels({ limit: 200 })
            .catch(() => catalogApi.getPrinterModels({ limit: 200 })),
        ]);
        setCategories(cats);
        setBrands(brs);
        setAllPrinterModels(pms);

        if (!isEditing && cats.length > 0) {
          setCategoryId(cats[0].id);
        }

        if (isEditing && id) {
          const detail = await adminApi.getProductById(id);
          setName(detail.name);
          setSlug(detail.slug);
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
          setImages(
            detail.images?.length
              ? detail.images
              : detail.thumbnailUrl
                ? [detail.thumbnailUrl]
                : [],
          );
          setIsPublished(detail.isPublished);
          setIsFeatured(detail.isFeatured);
          setSelectedModelIds(detail.compatiblePrinterModels.map((m) => m.id));
          setVariantsList(
            detail.variants.map((v, idx) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              oemPartNumber: v.oemPartNumber ?? null,
              authenticity:
                v.authenticity === "compatible" ? "compatible" : "original",
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
    if (!showCustomSlug && !isEditing) {
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

  async function handleQuickAddCategory() {
    const trimmed = quickCatName.trim();
    if (!trimmed) return;
    setQuickCatSaving(true);
    try {
      const created = await adminApi.createCategory({
        name: trimmed,
        slug: generateSlug(trimmed),
        description: "",
        imageUrl: "",
        sortOrder: categories.length + 1,
        isActive: true,
      });
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setQuickCatName("");
      setQuickCatOpen(false);
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to create category.",
      );
    } finally {
      setQuickCatSaving(false);
    }
  }

  async function handleQuickAddBrand() {
    const trimmed = quickBrandName.trim();
    if (!trimmed) return;
    setQuickBrandSaving(true);
    try {
      const created = await adminApi.createBrand({
        name: trimmed,
        slug: generateSlug(trimmed),
        logoUrl: "",
        isActive: true,
      });
      setBrands((prev) => [...prev, created]);
      setBrandId(created.id);
      setQuickBrandName("");
      setQuickBrandOpen(false);
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to create brand.",
      );
    } finally {
      setQuickBrandSaving(false);
    }
  }

  async function handleQuickAddPrinterModel() {
    const trimmed = quickModelName.trim();
    if (!trimmed) return;
    setQuickModelSaving(true);
    try {
      const created = await adminApi.createPrinterModel({
        name: trimmed,
        slug: generateSlug(trimmed),
        brandId: quickModelBrandId || brandId || null,
        series: quickModelSeries.trim() || null,
      });
      setAllPrinterModels((prev) => [...prev, created]);
      setSelectedModelIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );
      setQuickModelName("");
      setQuickModelSeries("");
      setQuickModelBrandId("");
      setQuickModelOpen(false);
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to create printer model.",
      );
    } finally {
      setQuickModelSaving(false);
    }
  }

  function handleAddVariant() {
    const nextIdx = variantsList.length + 1;
    const baseSku =
      sku.trim() || generateSmartSku(name, productType, oemPartNumber);
    const newVariant: ProductVariantInput = {
      name: name.trim()
        ? `${name.trim()} - Option ${nextIdx}`
        : `Option ${nextIdx}`,
      sku: `${baseSku}-V${nextIdx}`,
      authenticity: authenticity === "compatible" ? "compatible" : "original",
      priceKes:
        priceKes && !isNaN(parseFloat(priceKes))
          ? parseFloat(priceKes).toFixed(2)
          : "0.00",
      comparePriceKes:
        comparePriceKes && !isNaN(parseFloat(comparePriceKes))
          ? parseFloat(comparePriceKes).toFixed(2)
          : null,
      stockQuantity: Number(stockQuantity) || 10,
      isActive: true,
      sortOrder: nextIdx,
    };
    setVariantsList((prev) => [...prev, newVariant]);
  }

  function handleAddOriginalAndCompatiblePair() {
    const baseSku =
      sku.trim() || generateSmartSku(name, productType, oemPartNumber);
    const basePrice =
      priceKes && !isNaN(parseFloat(priceKes)) ? parseFloat(priceKes) : 10000;
    const compatPrice = Math.max(500, Math.round((basePrice * 0.45) / 50) * 50);

    setAuthenticity("both");
    setVariantsList((prev) => [
      ...prev,
      {
        name: "Original OEM (Genuine)",
        sku: `${baseSku}-OEM`,
        authenticity: "original",
        priceKes: basePrice.toFixed(2),
        comparePriceKes: null,
        stockQuantity: Number(stockQuantity) || 10,
        isActive: true,
        sortOrder: prev.length + 1,
      },
      {
        name: "Compatible Alternative",
        sku: `${baseSku}-COMP`,
        authenticity: "compatible",
        priceKes: compatPrice.toFixed(2),
        comparePriceKes: null,
        stockQuantity: Number(stockQuantity) || 15,
        isActive: true,
        sortOrder: prev.length + 2,
      },
    ]);
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

  async function handleDeleteProduct() {
    if (!isEditing || !id) return;
    const confirmed = window.confirm(
      `Delete "${name}" permanently from the catalogue?`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await adminApi.deleteProduct(id);
      navigate("/admin/products");
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to delete product.",
      );
      setDeleting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setGeneralError("Product title is required.");
      return;
    }

    const effectiveSlug = (slug.trim() || generateSlug(trimmedName)).trim();
    if (!effectiveSlug) {
      setGeneralError("Could not generate a valid URL slug from the product title.");
      return;
    }

    const effectiveSku = (
      sku.trim() || generateSmartSku(trimmedName, productType, oemPartNumber)
    ).trim();

    if (!categoryId) {
      setGeneralError("Please select a category.");
      return;
    }

    const parsedPrice = parseFloat(priceKes);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setGeneralError("Selling price in KES must be a valid non-negative number.");
      return;
    }
    const parsedStock = parseInt(stockQuantity, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setGeneralError("Stock quantity must be a non-negative whole number.");
      return;
    }

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
    }

    setSubmitting(true);

    try {
      const primaryThumb = thumbnailUrl.trim() || images[0] || "";
      const galleryImages = Array.from(
        new Set([primaryThumb, ...images].filter(Boolean)),
      );

      const payload: CreateProductInput = {
        name: trimmedName,
        slug: effectiveSlug,
        description: description.trim(),
        categoryId,
        brandId: brandId ? brandId : null,
        sku: effectiveSku,
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
        thumbnailUrl: primaryThumb,
        images: galleryImages,
        isPublished,
        isFeatured,
        compatibleModelIds: selectedModelIds,
        variants: variantsList.map((v, idx) => ({
          id: v.id,
          name: v.name.trim(),
          sku: v.sku.trim(),
          oemPartNumber: v.oemPartNumber ?? null,
          authenticity:
            v.authenticity === "compatible" ? "compatible" : "original",
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
        setSlug(effectiveSlug);
        setSku(effectiveSku);
        setSuccessMessage("Product updated successfully.");
      } else {
        const created = await adminApi.createProduct(payload);
        setSuccessMessage("Product created successfully.");
        setTimeout(() => {
          navigate(`/admin/products/${created.id}/edit`);
        }, 800);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGeneralError(err.message);
      } else {
        setGeneralError(isEditing ? "An unexpected error occurred while updating." : "An unexpected error occurred while creating.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-ink-muted">
        <Package className="h-8 w-8 mx-auto animate-pulse text-brand-red mb-2" />
        Loading product details...
      </div>
    );
  }

  const selectedModelsObjects = allPrinterModels.filter((m) =>
    selectedModelIds.includes(m.id),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Back & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/products"
            className="neo-button-secondary p-2 shrink-0"
            aria-label="Back to products list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-ink-charcoal uppercase tracking-tight">
              {isEditing ? "Edit Product" : "Create Product"}
            </h1>
            <p className="text-xs text-ink-secondary">
              {isEditing
                ? `SKU: ${sku} • /shop/${slug}`
                : "Upload photos, set pricing, and select compatible printers."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          {isEditing && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteProduct}
              className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 text-brand-red hover:border-brand-red"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{deleting ? "Deleting..." : "Delete"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {generalError && (
        <div
          role="alert"
          className="rounded-neo-base border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{isEditing ? "Update Failed" : "Create Failed"}</p>
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
            <p className="font-bold">{isEditing ? "Updated" : "Created"}</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Drag & Drop Product Photos */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-3">
          <div className="flex items-center justify-between border-b border-surface-border pb-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal">
                1. Product Photos (Drag &amp; Drop)
              </h2>
              <p className="text-[11px] text-ink-muted">
                Drop product images below or click to browse from your computer.
              </p>
            </div>
          </div>

          <ProductImageGalleryDropzone
            thumbnailUrl={thumbnailUrl}
            images={images}
            onChange={(nextThumb, nextImages) => {
              setThumbnailUrl(nextThumb);
              setImages(nextImages);
            }}
          />
        </div>

        {/* Section 2: Core Information */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            2. Basic Product Details
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
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                <span>
                  Storefront URL:{" "}
                  <code className="font-mono text-ink-charcoal">
                    /shop/{slug || generateSlug(name) || "auto-generated"}
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomSlug((v) => !v)}
                  className="text-brand-red hover:underline font-semibold cursor-pointer"
                >
                  {showCustomSlug ? "Hide custom slug" : "Customize URL slug"}
                </button>
              </div>
            </div>

            {showCustomSlug && (
              <div className="sm:col-span-2">
                <label className="block font-bold text-ink-charcoal mb-1">
                  Custom URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  placeholder="e.g. hp-59a-cf259a-black-toner"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>
            )}

            {/* Category with Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-ink-charcoal">
                  Category <span className="text-brand-red">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setQuickCatOpen((v) => !v)}
                  className="text-[11px] font-bold text-brand-red hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Category</span>
                </button>
              </div>
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

              {quickCatOpen && (
                <div className="mt-2 p-2.5 rounded-neo-sm border border-surface-border bg-canvas-ivory flex items-center gap-2">
                  <input
                    type="text"
                    value={quickCatName}
                    onChange={(e) => setQuickCatName(e.target.value)}
                    placeholder="Category name..."
                    className="flex-1 rounded border border-surface-border bg-surface-white px-2.5 py-1 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    disabled={quickCatSaving}
                    onClick={handleQuickAddCategory}
                    className="neo-button-primary text-[11px] py-1 px-2.5"
                  >
                    {quickCatSaving ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCatOpen(false)}
                    className="p-1 text-ink-muted hover:text-ink-charcoal"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Brand with Quick Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-ink-charcoal">
                  Brand / Manufacturer
                </label>
                <button
                  type="button"
                  onClick={() => setQuickBrandOpen((v) => !v)}
                  className="text-[11px] font-bold text-brand-red hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Brand</span>
                </button>
              </div>
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

              {quickBrandOpen && (
                <div className="mt-2 p-2.5 rounded-neo-sm border border-surface-border bg-canvas-ivory flex items-center gap-2">
                  <input
                    type="text"
                    value={quickBrandName}
                    onChange={(e) => setQuickBrandName(e.target.value)}
                    placeholder="Brand name (e.g. Ricoh)..."
                    className="flex-1 rounded border border-surface-border bg-surface-white px-2.5 py-1 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    disabled={quickBrandSaving}
                    onClick={handleQuickAddBrand}
                    className="neo-button-primary text-[11px] py-1 px-2.5"
                  >
                    {quickBrandSaving ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickBrandOpen(false)}
                    className="p-1 text-ink-muted hover:text-ink-charcoal"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* OEM Part Number */}
            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Cartridge / Part Code (OEM)
              </label>
              <input
                type="text"
                value={oemPartNumber}
                onChange={(e) => setOemPartNumber(e.target.value.toUpperCase())}
                placeholder="e.g. CF259A, TK-1170, 057"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            {/* SKU with 1-Click Auto-Generate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-ink-charcoal">
                  SKU Code
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSku(generateSmartSku(name, productType, oemPartNumber))
                  }
                  className="text-[11px] font-bold text-brand-red hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>Generate SKU</span>
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Auto-generated if left blank (e.g. JOC-TON-CF259A)"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-ink-charcoal mb-1">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter cartridge features, box contents, or warranty notes..."
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-ink-charcoal focus:border-brand-red focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pricing & Inventory */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal">
              3. Pricing (KES) &amp; Stock
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-ink-charcoal">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-brand-red focus:ring-brand-red"
                />
                <span>Publish on Storefront</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-ink-charcoal">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-border text-brand-red focus:ring-brand-red"
                />
                <span>Feature on Homepage</span>
              </label>
            </div>
          </div>

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
                placeholder="e.g. 14500"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-ink-charcoal mb-1">
                Old Price / Strike-through (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={comparePriceKes}
                onChange={(e) => setComparePriceKes(e.target.value)}
                placeholder="e.g. 16000"
                className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-ink-muted focus:border-brand-red focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-ink-charcoal">
                  Stock Quantity <span className="text-brand-red">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 25].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStockQuantity(String(preset))}
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-surface-border bg-canvas-ivory hover:border-brand-red cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
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

        {/* Section 4: Supply Classification & Quick Specs */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-5 shadow-neo space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal border-b border-surface-border pb-2">
            4. Supply Type &amp; Specifications
          </h2>

          <div className="space-y-4 text-xs">
            {/* Supply Type Pills */}
            <div>
              <label className="block font-bold text-ink-charcoal mb-1.5">
                Supply Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {(
                  [
                    { value: "toner", label: "Laser Toner" },
                    { value: "ink", label: "Ink Bottle / Cart" },
                    { value: "drum", label: "Drum Unit" },
                    { value: "printer_part", label: "Spare Part" },
                    { value: "printer", label: "Printer" },
                    { value: "consumable", label: "Consumable" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setProductType(item.value)}
                    className={`py-2 px-2.5 rounded-neo-sm border text-center font-bold transition-colors cursor-pointer ${
                      productType === item.value
                        ? "bg-brand-red text-white border-brand-red"
                        : "bg-canvas-ivory text-ink-charcoal border-surface-border hover:border-ink-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Authenticity Pills */}
              <div>
                <label className="block font-bold text-ink-charcoal mb-1.5">
                  Authenticity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "original", label: "Original OEM" },
                      { value: "compatible", label: "Compatible" },
                      { value: "both", label: "Both Options" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setAuthenticity(item.value)}
                      className={`py-2 px-2 rounded-neo-sm border text-center font-bold transition-colors cursor-pointer ${
                        authenticity === item.value
                          ? "bg-ink-charcoal text-white border-ink-charcoal"
                          : "bg-canvas-ivory text-ink-charcoal border-surface-border hover:border-ink-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Pills */}
              <div>
                <label className="block font-bold text-ink-charcoal mb-1.5">
                  Condition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "new", label: "Brand New (Sealed)" },
                      { value: "refurbished", label: "Refurbished" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCondition(item.value)}
                      className={`py-2 px-2.5 rounded-neo-sm border text-center font-bold transition-colors cursor-pointer ${
                        condition === item.value
                          ? "bg-ink-charcoal text-white border-ink-charcoal"
                          : "bg-canvas-ivory text-ink-charcoal border-surface-border hover:border-ink-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Color Swatches */}
              <div>
                <label className="block font-bold text-ink-charcoal mb-1.5">
                  Supply Color
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setColor(preset.label)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo-sm border text-[11px] font-bold cursor-pointer transition-colors ${
                        color.toLowerCase() === preset.label.toLowerCase()
                          ? "border-brand-red bg-brand-red/10 text-ink-charcoal"
                          : "border-surface-border bg-canvas-ivory text-ink-secondary hover:border-ink-muted"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${preset.dot}`}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Or type custom color..."
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              {/* Page Yield */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-ink-charcoal">
                    Estimated Page Yield (Pages)
                  </label>
                  <div className="flex items-center gap-1">
                    {[1500, 3000, 7200, 10000].map((pages) => (
                      <button
                        key={pages}
                        type="button"
                        onClick={() => setPageYield(String(pages))}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded border border-surface-border bg-canvas-ivory hover:border-brand-red cursor-pointer"
                      >
                        {pages.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={pageYield}
                  onChange={(e) => setPageYield(e.target.value)}
                  placeholder="e.g. 3000 (leave blank for printers/parts)"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>
            </div>
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
                Click printer models below to link them for the public Printer Compatibility Finder.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedModelIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedModelIds([])}
                  className="text-[11px] font-bold text-ink-secondary hover:text-brand-red underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setQuickModelOpen((v) => !v)}
                className="text-[11px] font-bold text-brand-red hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Printer</span>
              </button>
            </div>
          </div>

          {/* Inline Quick Add Printer Model */}
          {quickModelOpen && (
            <div className="p-3 rounded-neo-sm border border-surface-border bg-canvas-ivory space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-charcoal">
                  Add &amp; Select New Printer Model
                </span>
                <button
                  type="button"
                  onClick={() => setQuickModelOpen(false)}
                  className="text-ink-muted hover:text-ink-charcoal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={quickModelBrandId || brandId}
                  onChange={(e) => setQuickModelBrandId(e.target.value)}
                  className="rounded border border-surface-border bg-surface-white px-2.5 py-1.5 font-semibold text-ink-charcoal"
                >
                  <option value="">Select Company...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={quickModelName}
                  onChange={(e) => setQuickModelName(e.target.value)}
                  placeholder="Model name (e.g. HP LaserJet Pro 4003dn)"
                  className="rounded border border-surface-border bg-surface-white px-2.5 py-1.5 font-semibold"
                />
                <input
                  type="text"
                  value={quickModelSeries}
                  onChange={(e) => setQuickModelSeries(e.target.value)}
                  placeholder="Series (optional, e.g. LaserJet Pro 4000)"
                  className="rounded border border-surface-border bg-surface-white px-2.5 py-1.5"
                />
                <button
                  type="button"
                  disabled={quickModelSaving}
                  onClick={handleQuickAddPrinterModel}
                  className="neo-button-primary text-xs py-1.5 px-3"
                >
                  {quickModelSaving ? "Creating..." : "Create & Link Printer"}
                </button>
              </div>
            </div>
          )}

          {/* Selected Printer Chips */}
          {selectedModelsObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedModelsObjects.map((pm) => (
                <span
                  key={pm.id}
                  className="inline-flex items-center gap-1.5 rounded-neo-sm border border-brand-red/40 bg-brand-red/10 px-2.5 py-1 text-[11px] font-bold text-ink-charcoal"
                >
                  <Printer className="h-3 w-3 text-brand-red" />
                  <span>{pm.name}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleModelId(pm.id)}
                    className="text-ink-muted hover:text-brand-red cursor-pointer"
                    title="Unlink printer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Company Category Filter Tabs (HP, Konica Minolta, Brother, Canon, Kyocera) */}
          {brands.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedModelBrandId("")}
                className={`rounded-neo-pill px-3 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  selectedModelBrandId === ""
                    ? "bg-brand-red text-white shadow-neo-sm"
                    : "bg-canvas-ivory border border-surface-border text-ink-secondary hover:border-brand-red hover:text-ink-charcoal"
                }`}
              >
                All Companies
              </button>
              {brands.map((brand) => {
                const isActive = selectedModelBrandId === brand.id;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() =>
                      setSelectedModelBrandId(isActive ? "" : brand.id)
                    }
                    className={`rounded-neo-pill px-3 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-brand-red text-white shadow-neo-sm"
                        : "bg-canvas-ivory border border-surface-border text-ink-secondary hover:border-brand-red hover:text-ink-charcoal"
                    }`}
                  >
                    {brand.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Model Search and Quick Select */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
              <input
                type="text"
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                placeholder="Filter printer models by name, series, or brand..."
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
                      (!selectedModelBrandId ||
                        m.brandId === selectedModelBrandId) &&
                      (m.name.toLowerCase().includes(query) ||
                        (m.brandName &&
                          m.brandName.toLowerCase().includes(query))),
                  );
                  const filteredIds = filtered.map((m) => m.id);
                  setSelectedModelIds((prev) =>
                    Array.from(new Set([...prev, ...filteredIds])),
                  );
                }}
                className="neo-button-secondary text-[11px] py-1.5 px-3 shrink-0"
              >
                Select All Matching
              </button>
            )}
          </div>

          {/* Printer Models Grid */}
          {allPrinterModels.length === 0 ? (
            <p className="text-xs text-ink-muted italic py-2">
              No printer models in catalogue yet. Click &ldquo;Create Printer&rdquo; above to create one.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 border border-surface-border rounded-neo-sm bg-canvas-ivory/50">
              {allPrinterModels
                .filter((m) => {
                  if (
                    selectedModelBrandId &&
                    m.brandId !== selectedModelBrandId
                  ) {
                    return false;
                  }
                  if (!modelSearchQuery.trim()) return true;
                  const query = modelSearchQuery.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(query) ||
                    (m.series && m.series.toLowerCase().includes(query)) ||
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
                6. Purchasing Variants ({variantsList.length})
              </h2>
              <p className="text-[11px] text-ink-muted">
                Optional: Offer Original vs Compatible or Standard vs High-Yield options on the same product page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {variantsList.length === 0 && (
                <button
                  type="button"
                  onClick={handleAddOriginalAndCompatiblePair}
                  className="neo-button-secondary inline-flex items-center gap-1 text-xs py-1.5 px-3"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-red" />
                  <span>+ Add Original &amp; Compatible Pair</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAddVariant}
                className="neo-button-secondary inline-flex items-center gap-1 text-xs py-1.5 px-3"
              >
                <Plus className="h-3.5 w-3.5 text-brand-red" />
                <span>Add Variant</span>
              </button>
            </div>
          </div>

          {variantsList.length === 0 ? (
            <div className="p-4 rounded-neo-sm border border-surface-border bg-canvas-ivory/50 text-xs text-ink-muted">
              <p className="font-semibold text-ink-charcoal mb-0.5">
                Single-option product
              </p>
              <p>
                Sold at{" "}
                <span className="font-bold text-ink-charcoal">
                  {priceKes ? formatKes(priceKes) : "KSh 0.00"}
                </span>
                . Need both Genuine OEM and Compatible options on this listing? Click{" "}
                <span className="font-bold text-brand-red">
                  + Add Original &amp; Compatible Pair
                </span>{" "}
                above.
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
                      Option #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Option Label <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={variant.name}
                        onChange={(e) =>
                          handleUpdateVariant(index, "name", e.target.value)
                        }
                        placeholder="e.g. Original OEM"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
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
                        <option value="compatible">Compatible</option>
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
                        placeholder="e.g. 14500"
                        className="w-full rounded-neo-sm border border-surface-border bg-surface-white px-2.5 py-1.5 font-mono font-bold text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink-charcoal mb-1">
                        Stock <span className="text-brand-red">*</span>
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
            className="neo-button-secondary text-xs py-2.5 px-4"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="neo-button-primary text-xs py-2.5 px-6 inline-flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>
              {submitting
                ? isEditing ? "Updating..." : "Creating..."
                : isEditing
                  ? "Update Product"
                  : "Create Product"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
