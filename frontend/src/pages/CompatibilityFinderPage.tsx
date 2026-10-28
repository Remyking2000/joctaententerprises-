import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  PRODUCT_TYPES,
  type BrandSummary,
  type CategorySummary,
  type CompatibleProductsResponse,
  type PrinterModelSummary,
  type ProductType,
} from "@jocta/shared";
import { catalogApi } from "../lib/api";
import { PRODUCT_TYPE_LABELS } from "../lib/format";
import { ProductCard } from "../components/ProductCard";

export function CompatibilityFinderPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedBrandSlug = searchParams.get("brand") ?? "";
  const searchQuery = searchParams.get("search") ?? "";
  const selectedModelSlug = searchParams.get("model") ?? "";
  const refineCategory = searchParams.get("category") ?? "";
  const refineProductType = (searchParams.get("productType") ?? "") as
    | ProductType
    | "";

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [printerModels, setPrinterModels] = useState<PrinterModelSummary[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [compatResult, setCompatResult] =
    useState<CompatibleProductsResponse | null>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    catalogApi
      .getBrands()
      .then(setBrands)
      .catch(() => {});
    catalogApi
      .getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function loadPrinterModels() {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const models = await catalogApi.getPrinterModels({
        brand: selectedBrandSlug || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setPrinterModels(models);

      // Auto-select first model if none is selected and models exist
      if (!selectedModelSlug && models.length > 0) {
        const next = new URLSearchParams(searchParams);
        next.set("model", models[0].slug);
        setSearchParams(next, { replace: true });
      }
    } catch (err) {
      setModelsError(
        err instanceof Error
          ? err.message
          : "Unable to load printer models from the database.",
      );
    } finally {
      setModelsLoading(false);
    }
  }

  useEffect(() => {
    void loadPrinterModels();
  }, [selectedBrandSlug, searchQuery]);

  async function loadCompatibleProducts(modelSlug: string) {
    if (!modelSlug) {
      setCompatResult(null);
      return;
    }
    setCompatLoading(true);
    setCompatError(null);
    try {
      const res = await catalogApi.getCompatibleProducts(modelSlug, {
        category: refineCategory || undefined,
        productType: refineProductType || undefined,
      });
      setCompatResult(res);
    } catch (err) {
      setCompatResult(null);
      setCompatError(
        err instanceof Error
          ? err.message
          : "Failed to load compatible products for this printer model.",
      );
    } finally {
      setCompatLoading(false);
    }
  }

  useEffect(() => {
    if (selectedModelSlug) {
      void loadCompatibleProducts(selectedModelSlug);
    } else {
      setCompatResult(null);
    }
  }, [selectedModelSlug, refineCategory, refineProductType]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key === "brand" || key === "search") {
      next.delete("model");
    }
    setSearchParams(next);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput.trim());
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Search Controls */}
      <section className="neo-card p-6 sm:p-8 space-y-5">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-neo-pill bg-brand-red-tint border border-brand-red/30 px-3 py-1 text-xs font-bold text-brand-red">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Verified Database Compatibility Lookup
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-charcoal">
            Printer &amp; Toner Compatibility Finder
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Select your printer manufacturer or search by model/series (for
            example, <strong>LaserJet Pro M404dn</strong> or{" "}
            <strong>ECOSYS M2040dn</strong>). Results show only products with a
            verified compatibility relationship in the catalogue database—never
            guessed from brand names alone.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Search printer models"
          className="grid grid-cols-1 gap-3 sm:grid-cols-12"
        >
          <div className="sm:col-span-4">
            <label
              htmlFor="compat-brand-select"
              className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1"
            >
              1. Printer Manufacturer
            </label>
            <select
              id="compat-brand-select"
              value={selectedBrandSlug}
              onChange={(e) => updateParam("brand", e.target.value)}
              className="neo-input"
            >
              <option value="">All Printer Manufacturers</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="compat-model-search"
              className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1"
            >
              2. Printer Model or Series
            </label>
            <div className="relative">
              <input
                id="compat-model-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type model number (e.g. M404dn, M428fdw, P1102, M2040dn)..."
                className="neo-input pr-9"
              />
              <Search
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="neo-button-primary w-full py-2.5 text-xs"
            >
              Find Model
            </button>
          </div>
        </form>
      </section>

      {/* Main Two-Column Compatibility Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Matching Printer Models */}
        <aside
          aria-label="Printer models directory"
          className="lg:col-span-4 space-y-4"
        >
          <div className="neo-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-sm font-bold text-ink-charcoal">
                Select Printer Model
              </h2>
              <span className="text-xs font-semibold text-ink-muted">
                {printerModels.length} found
              </span>
            </div>

            {modelsLoading ? (
              <div aria-live="polite" className="space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-14 w-full rounded-neo-sm bg-canvas-warm"
                  />
                ))}
              </div>
            ) : modelsError ? (
              <div role="alert" className="text-center py-6 space-y-3">
                <AlertCircle
                  className="mx-auto h-8 w-8 text-brand-red"
                  aria-hidden="true"
                />
                <p className="text-xs text-ink-secondary">{modelsError}</p>
                <button
                  type="button"
                  onClick={() => void loadPrinterModels()}
                  className="neo-button-primary px-4 py-2 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : printerModels.length === 0 ? (
              <div className="neo-surface-inset p-5 text-center space-y-2">
                <Printer
                  className="mx-auto h-8 w-8 text-ink-muted"
                  aria-hidden="true"
                />
                <p className="text-sm font-bold text-ink-charcoal">
                  No Matching Printer Models
                </p>
                <p className="text-xs text-ink-secondary">
                  No verified printer models matched your search criteria.
                </p>
                {(selectedBrandSlug || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchParams({});
                    }}
                    className="neo-button-secondary mt-2 px-3 py-1.5 text-xs"
                  >
                    Reset Model Search
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {printerModels.map((pm) => {
                  const isSelected = pm.slug === selectedModelSlug;
                  return (
                    <li key={pm.id}>
                      <button
                        type="button"
                        onClick={() => updateParam("model", pm.slug)}
                        className={`w-full text-left rounded-neo-sm border p-3.5 transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-brand-red text-white border-brand-red shadow-neo-sm"
                            : "bg-surface-white text-ink-charcoal border-surface-border hover:border-brand-red"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold">{pm.name}</p>
                          <p
                            className={`text-xs ${
                              isSelected
                                ? "text-white/90"
                                : "text-ink-secondary"
                            }`}
                          >
                            {pm.brandName ? `${pm.brandName} • ` : ""}
                            {pm.series ?? "Printer Model"}
                          </p>
                        </div>
                        <span
                          className={`rounded-neo-pill px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                            isSelected
                              ? "bg-white text-brand-red"
                              : "bg-canvas-ivory text-ink-charcoal border border-surface-border"
                          }`}
                        >
                          {pm.compatibleProductCount ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right Column: Compatible Products for Selected Printer Model */}
        <section
          aria-live="polite"
          className="lg:col-span-8 space-y-5"
        >
          {!selectedModelSlug ? (
            <div className="neo-card p-10 text-center space-y-3">
              <Printer
                className="mx-auto h-10 w-10 text-ink-muted"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-ink-charcoal">
                Select a Printer Model to View Compatible Supplies
              </h2>
              <p className="mx-auto max-w-md text-sm text-ink-secondary">
                Choose a printer model from the directory on the left to see
                verified toners, drum units, and replacement parts.
              </p>
            </div>
          ) : compatLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[1, 2].map((n) => (
                <div key={n} className="neo-card p-5 space-y-4">
                  <div className="aspect-[4/3] w-full rounded-neo-sm bg-canvas-warm" />
                  <div className="h-5 w-3/4 rounded bg-canvas-warm" />
                  <div className="h-4 w-1/2 rounded bg-canvas-warm" />
                </div>
              ))}
            </div>
          ) : compatError ? (
            <div role="alert" className="neo-card p-8 text-center space-y-3">
              <AlertCircle
                className="mx-auto h-10 w-10 text-brand-red"
                aria-hidden="true"
              />
              <h2 className="text-base font-bold text-ink-charcoal">
                Could Not Load Compatible Products
              </h2>
              <p className="text-sm text-ink-secondary">{compatError}</p>
              <button
                type="button"
                onClick={() => void loadCompatibleProducts(selectedModelSlug)}
                className="neo-button-primary px-5 py-2.5 text-xs"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : compatResult ? (
            <div className="space-y-5">
              {/* Selected Model Banner & Category/Type Refinement */}
              <div className="neo-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Verified Compatibility Matches
                  </div>
                  <h2 className="text-xl font-extrabold text-ink-charcoal">
                    {compatResult.printerModel.name}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {compatResult.printerModel.brandName
                      ? `${compatResult.printerModel.brandName} • `
                      : ""}
                    {compatResult.printerModel.series ?? "Printer Series"}
                  </p>
                </div>

                {/* Refine by Category or Product Type */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="Refine compatible products by category"
                    value={refineCategory}
                    onChange={(e) => updateParam("category", e.target.value)}
                    className="neo-input w-auto py-1.5 px-3 text-xs font-semibold"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Refine compatible products by type"
                    value={refineProductType}
                    onChange={(e) => updateParam("productType", e.target.value)}
                    className="neo-input w-auto py-1.5 px-3 text-xs font-semibold"
                  >
                    <option value="">All Supply Types</option>
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PRODUCT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {compatResult.items.length === 0 ? (
                <div className="neo-card p-10 text-center space-y-3">
                  <Package
                    className="mx-auto h-10 w-10 text-ink-muted"
                    aria-hidden="true"
                  />
                  <h3 className="text-base font-bold text-ink-charcoal">
                    No Verified Compatible Products Found
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-ink-secondary">
                    {refineCategory || refineProductType
                      ? "No compatible products matched the selected category/type filter for this printer model."
                      : "There are currently no published products linked to this printer model in the database."}
                  </p>
                  {(refineCategory || refineProductType) && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete("category");
                        next.delete("productType");
                        setSearchParams(next);
                      }}
                      className="neo-button-secondary px-4 py-2 text-xs"
                    >
                      Show All Compatible Supplies for Model
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5">
                  {compatResult.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
