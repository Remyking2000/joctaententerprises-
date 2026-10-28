import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Filter,
  Package,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  PRODUCT_AUTHENTICITIES,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_TYPES,
  type BrandSummary,
  type CategorySummary,
  type ProductAuthenticity,
  type ProductSortOption,
  type ProductSummary,
  type ProductType,
} from "@jocta/shared";
import { catalogApi } from "../lib/api";
import {
  PRODUCT_AUTHENTICITY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "../lib/format";
import { ProductCard } from "../components/ProductCard";

const SORT_LABELS: Record<ProductSortOption, string> = {
  featured: "Featured First",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
  newest: "Newest Added",
};

const PAGE_LIMIT = 12;

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get("category") ?? "";
  const activeBrand = searchParams.get("brand") ?? "";
  const activeType = (searchParams.get("productType") ?? "") as
    | ProductType
    | "";
  const activeAuthenticity = (searchParams.get("authenticity") ?? "") as
    | ProductAuthenticity
    | "";
  const activePrinterModel = searchParams.get("printerModel") ?? "";
  const activeSearch = searchParams.get("search") ?? "";
  const rawSort = searchParams.get("sort") ?? "featured";
  const activeSort: ProductSortOption = (
    PRODUCT_SORT_OPTIONS as readonly string[]
  ).includes(rawSort)
    ? (rawSort as ProductSortOption)
    : "featured";
  const activePage = Math.max(
    1,
    parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );

  const [searchInput, setSearchInput] = useState(activeSearch);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(activeSearch);
  }, [activeSearch]);

  useEffect(() => {
    catalogApi
      .getCategories()
      .then(setCategories)
      .catch(() => {});
    catalogApi
      .getBrands()
      .then(setBrands)
      .catch(() => {});
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const response = await catalogApi.getProducts({
        category: activeCategory || undefined,
        brand: activeBrand || undefined,
        productType: activeType || undefined,
        authenticity: activeAuthenticity || undefined,
        printerModel: activePrinterModel || undefined,
        search: activeSearch || undefined,
        sort: activeSort,
        page: activePage,
        limit: PAGE_LIMIT,
      });
      setProducts(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load catalogue products.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, [
    activeCategory,
    activeBrand,
    activeType,
    activeAuthenticity,
    activePrinterModel,
    activeSearch,
    activeSort,
    activePage,
  ]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") {
      next.delete("page");
    }
    setSearchParams(next);
  }

  function clearAllFilters() {
    setSearchInput("");
    setSearchParams({});
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateFilter("search", searchInput.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasActiveFilters = Boolean(
    activeCategory ||
      activeBrand ||
      activeType ||
      activeAuthenticity ||
      activePrinterModel ||
      activeSearch,
  );

  const quickPills: {
    label: string;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "All",
      isActive: !activeType && !activeAuthenticity && !activeCategory,
      onClick: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("productType");
        next.delete("authenticity");
        next.delete("category");
        next.delete("page");
        setSearchParams(next);
      },
    },
    {
      label: "Toners",
      isActive: activeType === "toner",
      onClick: () =>
        updateFilter("productType", activeType === "toner" ? "" : "toner"),
    },
    {
      label: "Ink",
      isActive: activeType === "ink",
      onClick: () =>
        updateFilter("productType", activeType === "ink" ? "" : "ink"),
    },
    {
      label: "Spare Parts",
      isActive: activeType === "printer_part",
      onClick: () =>
        updateFilter(
          "productType",
          activeType === "printer_part" ? "" : "printer_part",
        ),
    },
    {
      label: "Drum Units",
      isActive: activeType === "drum",
      onClick: () =>
        updateFilter(
          "productType",
          activeType === "drum" ? "" : "drum",
        ),
    },
    {
      label: "Printers",
      isActive: activeType === "printer",
      onClick: () =>
        updateFilter(
          "productType",
          activeType === "printer" ? "" : "printer",
        ),
    },
    {
      label: "Original OEM",
      isActive: activeAuthenticity === "original",
      onClick: () =>
        updateFilter(
          "authenticity",
          activeAuthenticity === "original" ? "" : "original",
        ),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8 space-y-5 sm:space-y-8">
      {/* Page Header */}
      <section className="neo-card p-5 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
              Jocta Enterprises Catalogue
            </p>
            <h1 className="mt-1 text-xl sm:text-3xl font-extrabold text-ink-charcoal">
              Printer Toners, Parts &amp; Consumables
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
              Filter by category, manufacturer, product type, or Original OEM vs
              Compatible options.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            role="search"
            aria-label="Filter catalogue by keyword"
            className="flex flex-row gap-2 w-full lg:w-auto lg:min-w-[380px]"
          >
            <div className="relative flex-1">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, SKU, OEM part #..."
                aria-label="Search by product name, SKU, or OEM part number"
                className="neo-input pr-9"
              />
              <Search
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                aria-hidden="true"
              />
            </div>
            <button
              type="submit"
              className="neo-button-primary px-4 sm:px-5 py-2.5 text-xs shrink-0"
            >
              Filter
            </button>
          </form>
        </div>
      </section>

      {/* Concept 1 Horizontal Scrollable Quick-Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {quickPills.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={pill.onClick}
            className={`shrink-0 rounded-neo-pill px-3.5 py-1.5 text-xs font-bold transition-all ${
              pill.isActive
                ? "bg-brand-red text-white shadow-neo-sm border border-brand-red-hover"
                : "bg-surface-white text-ink-charcoal border border-surface-border shadow-neo-sm hover:border-brand-red"
            }`}
          >
            {pill.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
          className="lg:hidden ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-neo-pill bg-surface-white border border-surface-border px-3.5 py-1.5 text-xs font-bold text-ink-charcoal shadow-neo-sm"
        >
          <Filter className="h-3.5 w-3.5 text-brand-red" aria-hidden="true" />
          <span>{mobileFiltersOpen ? "Hide Filters" : "More Filters"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12">
        {/* Sidebar Filters */}
        <aside
          aria-label="Catalogue filters"
          className={`lg:col-span-3 space-y-5 ${
            mobileFiltersOpen ? "block" : "hidden lg:block"
          }`}
        >
          <div className="neo-card p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-red" aria-hidden="true" />
                <h2 className="text-sm font-bold text-ink-charcoal">
                  Refine Catalogue
                </h2>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-brand-red hover:underline"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Category Select */}
            <div>
              <label
                htmlFor="filter-category"
                className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Category
              </label>
              <select
                id="filter-category"
                value={activeCategory}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="neo-input"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand / Manufacturer Select */}
            <div>
              <label
                htmlFor="filter-brand"
                className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Manufacturer / Brand
              </label>
              <select
                id="filter-brand"
                value={activeBrand}
                onChange={(e) => updateFilter("brand", e.target.value)}
                className="neo-input"
              >
                <option value="">All Manufacturers</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.slug}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type Select */}
            <div>
              <label
                htmlFor="filter-product-type"
                className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Product Type
              </label>
              <select
                id="filter-product-type"
                value={activeType}
                onChange={(e) => updateFilter("productType", e.target.value)}
                className="neo-input"
              >
                <option value="">All Product Types</option>
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PRODUCT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* Authenticity Select */}
            <div>
              <label
                htmlFor="filter-authenticity"
                className="block text-xs font-bold uppercase tracking-wider text-ink-secondary mb-1.5"
              >
                Authenticity
              </label>
              <select
                id="filter-authenticity"
                value={activeAuthenticity}
                onChange={(e) => updateFilter("authenticity", e.target.value)}
                className="neo-input"
              >
                <option value="">All (OEM &amp; Compatible)</option>
                {PRODUCT_AUTHENTICITIES.map((auth) => (
                  <option key={auth} value={auth}>
                    {PRODUCT_AUTHENTICITY_LABELS[auth]}
                  </option>
                ))}
              </select>
            </div>

            {/* Printer Compatibility Finder Callout */}
            <div className="neo-surface-inset p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-charcoal">
                <Printer
                  className="h-4 w-4 text-brand-red shrink-0"
                  aria-hidden="true"
                />
                <span>Filtering by Printer Model?</span>
              </div>
              <p className="text-xs text-ink-secondary">
                Use the dedicated compatibility tool to match supplies strictly
                against verified printer models.
              </p>
              <Link
                to="/compatibility"
                className="neo-button-secondary w-full py-2 text-xs"
              >
                Open Compatibility Finder
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Listing Area */}
        <section className="lg:col-span-9 space-y-5">
          {/* Toolbar: Results count, active filter chips, sort dropdown */}
          <div className="neo-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-ink-secondary">
              {loading ? (
                <span>Loading catalogue...</span>
              ) : (
                <span>
                  Showing{" "}
                  <strong className="font-bold text-ink-charcoal">
                    {products.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-bold text-ink-charcoal">
                    {total}
                  </strong>{" "}
                  product{total === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="shop-sort"
                className="text-xs font-bold uppercase tracking-wider text-ink-secondary"
              >
                Sort by:
              </label>
              <select
                id="shop-sort"
                value={activeSort}
                onChange={(e) => updateFilter("sort", e.target.value)}
                className="neo-input w-auto py-1.5 px-3 text-xs font-semibold"
              >
                {PRODUCT_SORT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {SORT_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {activeSearch && (
                <FilterChip
                  label={`Search: "${activeSearch}"`}
                  onRemove={() => updateFilter("search", "")}
                />
              )}
              {activeCategory && (
                <FilterChip
                  label={`Category: ${activeCategory}`}
                  onRemove={() => updateFilter("category", "")}
                />
              )}
              {activeBrand && (
                <FilterChip
                  label={`Brand: ${activeBrand}`}
                  onRemove={() => updateFilter("brand", "")}
                />
              )}
              {activeType && (
                <FilterChip
                  label={`Type: ${PRODUCT_TYPE_LABELS[activeType]}`}
                  onRemove={() => updateFilter("productType", "")}
                />
              )}
              {activeAuthenticity && (
                <FilterChip
                  label={`Authenticity: ${PRODUCT_AUTHENTICITY_LABELS[activeAuthenticity]}`}
                  onRemove={() => updateFilter("authenticity", "")}
                />
              )}
              {activePrinterModel && (
                <FilterChip
                  label={`Printer Model: ${activePrinterModel}`}
                  onRemove={() => updateFilter("printerModel", "")}
                />
              )}
            </div>
          )}

          {/* Product Grid / States */}
          {loading ? (
            <div
              aria-live="polite"
              className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="neo-card p-3 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="aspect-[4/3] w-full rounded-neo-sm bg-canvas-warm" />
                  <div className="h-4 w-3/4 rounded bg-canvas-warm" />
                  <div className="h-3 w-1/2 rounded bg-canvas-warm" />
                  <div className="h-9 w-full rounded-neo-sm bg-canvas-warm" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="neo-card p-8 text-center space-y-3"
            >
              <AlertCircle
                className="mx-auto h-10 w-10 text-brand-red"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-ink-charcoal">
                Unable to Load Products
              </h2>
              <p className="mx-auto max-w-md text-sm text-ink-secondary">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadProducts()}
                className="neo-button-primary px-5 py-2.5 text-xs"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="neo-card p-10 text-center space-y-3">
              <Package
                className="mx-auto h-10 w-10 text-ink-muted"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-ink-charcoal">
                No Matching Products Found
              </h2>
              <p className="mx-auto max-w-md text-sm text-ink-secondary">
                {hasActiveFilters
                  ? "No published products matched your active search or filter criteria. Try clearing one or more filters."
                  : "There are currently no published products in the catalogue."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="neo-button-primary mt-2 px-5 py-2.5 text-xs"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav
                  aria-label="Catalogue pagination"
                  className="neo-card px-5 py-4 flex items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() =>
                      updateFilter("page", String(activePage - 1))
                    }
                    className="neo-button-secondary px-4 py-2 text-xs"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs font-semibold text-ink-secondary">
                    Page{" "}
                    <strong className="text-ink-charcoal">{activePage}</strong>{" "}
                    of{" "}
                    <strong className="text-ink-charcoal">{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={activePage >= totalPages}
                    onClick={() =>
                      updateFilter("page", String(activePage + 1))
                    }
                    className="neo-button-secondary px-4 py-2 text-xs"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-neo-pill bg-surface-white border border-surface-border px-3 py-1 text-xs font-semibold text-ink-charcoal shadow-neo-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-ink-muted hover:text-brand-red"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
