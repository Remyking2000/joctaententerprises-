import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  ExternalLink,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import type {
  AdminProductListQuery,
  BrandSummary,
  CategorySummary,
  ProductSummary,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";
import { formatKes } from "../lib/format";

export function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [publishedFilter, setPublishedFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<AdminProductListQuery["sort"]>("newest");
  const [page, setPage] = useState(1);
  const limit = 25;

  async function loadInitialMetadata() {
    try {
      const [cats, brs] = await Promise.all([
        catalogApi.getCategories(),
        catalogApi.getBrands(),
      ]);
      setCategories(cats);
      setBrands(brs);
    } catch {
      // Non-fatal if metadata fails, can still list products
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const query: Partial<AdminProductListQuery> = {
        page,
        limit,
        sort: sortBy,
      };

      if (search.trim()) query.search = search.trim();
      if (selectedCategory) query.categoryId = selectedCategory;
      if (selectedBrand) query.brandId = selectedBrand;
      if (publishedFilter === "published") query.isPublished = true;
      if (publishedFilter === "draft") query.isPublished = false;
      if (productTypeFilter !== "all") query.productType = productTypeFilter as any;

      const res = await adminApi.getProducts(query);
      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load products from database.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialMetadata();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [selectedCategory, selectedBrand, publishedFilter, productTypeFilter, sortBy, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadProducts();
  }

  async function handleTogglePublish(product: ProductSummary) {
    const nextStatus = !product.isPublished;
    setTogglingId(product.id);
    try {
      const updated = await adminApi.toggleProductPublish(product.id, nextStatus);
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to toggle status.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
            Product Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            View, search, filter, publish, and edit products in the Jocta catalogue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or OEM part number..."
              className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory pl-9 pr-3 py-2 text-xs font-semibold placeholder:text-ink-muted focus:border-brand-red focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="neo-button-secondary text-xs py-2 px-4 shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Publication Status */}
          <select
            value={publishedFilter}
            onChange={(e) => {
              setPublishedFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>

          {/* Product Type */}
          <select
            value={productTypeFilter}
            onChange={(e) => {
              setProductTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          >
            <option value="all">All Product Types</option>
            <option value="toner">Toner</option>
            <option value="ink">Ink</option>
            <option value="drum">Drum</option>
            <option value="printer_part">Printer Part</option>
            <option value="printer">Printer</option>
            <option value="consumable">Consumable</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1.5 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden col-span-2 sm:col-span-1"
          >
            <option value="newest">Sort: Newest</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-neo-base border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-brand-red mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Catalogue Query Error</p>
            <p className="mt-0.5 text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadProducts}
            className="neo-button-secondary text-xs py-1 px-2.5"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Meta */}
      <div className="flex items-center justify-between text-xs text-ink-secondary font-semibold px-1">
        <span>
          Showing {products.length} of {total} products
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Table / Card Stack */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white shadow-neo overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            No products match the selected criteria.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-canvas-ivory text-ink-secondary uppercase text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-3">Category / Brand</th>
                    <th className="py-3 px-3">Type &amp; Auth</th>
                    <th className="py-3 px-3 text-right">Price (KSh)</th>
                    <th className="py-3 px-3 text-center">Stock</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-canvas-ivory/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 overflow-hidden flex items-center justify-center">
                            {product.thumbnailUrl ? (
                              <img
                                src={product.thumbnailUrl}
                                alt={product.name}
                                className="h-full w-full object-contain p-0.5"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-ink-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="font-bold text-ink-charcoal hover:text-brand-red block truncate max-w-xs"
                            >
                              {product.name}
                            </Link>
                            <span className="font-mono text-[11px] text-ink-muted">
                              SKU: {product.sku}
                              {product.oemPartNumber &&
                                ` • OEM: ${product.oemPartNumber}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-charcoal">
                          {product.category?.name ?? "—"}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {product.brand?.name ?? "Generic"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="capitalize font-semibold text-ink-charcoal">
                          {product.productType}
                        </span>
                        <div className="text-[11px] capitalize text-ink-muted">
                          {product.authenticity}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-black text-ink-charcoal">
                        {formatKes(product.priceKes)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-extrabold ${
                            product.stockQuantity > 0
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          {product.stockQuantity}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(product)}
                          disabled={togglingId === product.id}
                          className={`rounded-neo-sm px-2 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                            product.isPublished
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                          }`}
                          title="Click to toggle published status"
                        >
                          {togglingId === product.id
                            ? "Updating..."
                            : product.isPublished
                              ? "Published"
                              : "Draft"}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {product.isPublished && (
                            <Link
                              to={`/shop/${product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-neo-sm border border-surface-border text-ink-secondary hover:text-brand-red hover:bg-canvas-ivory"
                              title="View on storefront"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="neo-button-secondary text-xs py-1 px-2.5"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (visible on <768px) */}
            <div className="md:hidden divide-y divide-surface-border">
              {products.map((product) => (
                <div key={product.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 overflow-hidden flex items-center justify-center">
                      {product.thumbnailUrl ? (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-ink-muted" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="font-bold text-xs text-ink-charcoal hover:text-brand-red line-clamp-2"
                      >
                        {product.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                        <span className="font-mono bg-canvas-ivory px-1 rounded border border-surface-border">
                          {product.sku}
                        </span>
                        {product.category && <span>• {product.category.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-border">
                    <div>
                      <div className="font-black text-ink-charcoal">
                        {formatKes(product.priceKes)}
                      </div>
                      <div className="text-[11px] text-ink-secondary">
                        Stock: {product.stockQuantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(product)}
                        disabled={togglingId === product.id}
                        className={`rounded-neo-sm px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                          product.isPublished
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        {togglingId === product.id
                          ? "..."
                          : product.isPublished
                            ? "Published"
                            : "Draft"}
                      </button>

                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="neo-button-secondary text-xs py-1 px-3"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-surface-border flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="neo-button-secondary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-ink-secondary font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="neo-button-secondary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
