import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Warehouse,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import type { AdminStatsSummary, ProductSummary } from "@jocta/shared";
import { adminApi, ApiClientError } from "../lib/api";
import { formatKes } from "../lib/format";
import { useCatalogRefresh } from "../lib/sync";

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsSummary | null>(null);
  const [recentProducts, setRecentProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleDeleteProduct(product: ProductSummary) {
    const confirmed = window.confirm(
      `Delete product "${product.name}" (SKU: ${product.sku})?\n\nThis permanently removes the product and its variants from the database.`,
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.deleteProduct(product.id);
      setSuccessMessage(`Product '${product.name}' deleted.`);
      // Reload so stats and the recent list stay accurate
      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, productsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getProducts({ limit: 6, sort: "newest" }),
      ]);
      setStats(statsData);
      setRecentProducts(productsData.items);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load admin dashboard data from the API.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Reload when products, stock or sales change in admin or inventory
  useCatalogRefresh(() => void loadDashboard());

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleTogglePublish(product: ProductSummary) {
    const nextStatus = !product.isPublished;
    setTogglingId(product.id);
    try {
      const updated = await adminApi.toggleProductPublish(
        product.id,
        nextStatus,
      );
      setRecentProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      // Refresh stats count
      setStats((prev) =>
        prev
          ? {
              ...prev,
              publishedProducts: nextStatus
                ? prev.publishedProducts + 1
                : Math.max(0, prev.publishedProducts - 1),
              unpublishedProducts: nextStatus
                ? Math.max(0, prev.unpublishedProducts - 1)
                : prev.unpublishedProducts + 1,
            }
          : null,
      );
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update publication status.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Live catalogue metrics and database verification status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
            title="Refresh database counts"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Connected systems */}
      <div className="rounded-neo border border-surface-border bg-surface-white p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Database className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="font-bold text-ink-charcoal">Live database</p>
            <p className="text-ink-secondary text-[11px] mt-0.5">
              The admin panel and the inventory system share the same products and stock — a change in either shows up in the other straight away.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to="/inventory"
            className="neo-button-secondary inline-flex items-center gap-1 text-[11px] py-1.5 px-3"
          >
            <Warehouse className="h-3 w-3 text-brand-red" />
            <span>Open Inventory</span>
          </Link>
          <Link
            to="/shop"
            target="_blank"
            rel="noreferrer"
            className="neo-button-secondary inline-flex items-center gap-1 text-[11px] py-1.5 px-3"
          >
            <ExternalLink className="h-3 w-3 text-brand-red" />
            <span>View Storefront</span>
          </Link>
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
            <p className="font-bold">Error Loading Dashboard Metrics</p>
            <p className="mt-0.5 text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="neo-button-secondary text-xs py-1 px-2.5"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="alert"
          className="rounded-neo-base border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <p className="font-bold">{successMessage}</p>
        </div>
      )}

      {/* Real Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Products
            </span>
            <Package className="h-4 w-4 text-brand-red" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink-charcoal">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.totalProducts ?? 0)
            )}
          </div>
          <Link
            to="/admin/products"
            className="mt-3 text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            Manage catalogue <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Published Products */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Published
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.publishedProducts ?? 0)
            )}
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            Live on storefront
          </p>
        </div>

        {/* Unpublished Drafts */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Drafts / Hidden
            </span>
            <XCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.unpublishedProducts ?? 0)
            )}
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">
            Hidden from catalogue
          </p>
        </div>

        {/* Categories */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Categories
            </span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink-charcoal">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.totalCategories ?? 0)
            )}
          </div>
          <Link
            to="/admin/categories"
            className="mt-3 text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            Manage categories <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Brands */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Brands
            </span>
            <Bookmark className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink-charcoal">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.totalBrands ?? 0)
            )}
          </div>
          <Link
            to="/admin/brands"
            className="mt-3 text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            Manage brands <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Printer Models */}
        <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Printer Models
            </span>
            <Printer className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-ink-charcoal">
            {loading ? (
              <span className="inline-block h-7 w-12 bg-surface-border/40 rounded animate-pulse" />
            ) : (
              (stats?.totalPrinterModels ?? 0)
            )}
          </div>
          <Link
            to="/admin/printer-models"
            className="mt-3 text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1"
          >
            Manage models <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white p-4 sm:p-5 shadow-neo">
        <h2 className="text-xs font-black uppercase tracking-wider text-ink-charcoal mb-3">
          Quick Administrative Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <Link
            to="/admin/products/new"
            className="neo-button-primary justify-center text-xs py-2.5 px-3 text-center col-span-2 sm:col-span-1"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Product
          </Link>
          <Link
            to="/admin/products"
            className="neo-button-secondary justify-center text-xs py-2.5 px-3 text-center"
          >
            <Package className="h-4 w-4 mr-1.5 text-brand-red" />
            Product Catalogue
          </Link>
          <Link
            to="/admin/categories"
            className="neo-button-secondary justify-center text-xs py-2.5 px-3 text-center"
          >
            <Layers className="h-4 w-4 mr-1.5 text-blue-600" />
            Categories
          </Link>
          <Link
            to="/admin/brands"
            className="neo-button-secondary justify-center text-xs py-2.5 px-3 text-center"
          >
            <Bookmark className="h-4 w-4 mr-1.5 text-purple-600" />
            Brands
          </Link>
          <Link
            to="/admin/printer-models"
            className="neo-button-secondary justify-center text-xs py-2.5 px-3 text-center"
          >
            <Printer className="h-4 w-4 mr-1.5 text-emerald-700" />
            Printer Models
          </Link>
        </div>
      </div>

      {/* Live Recent Products Table */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white shadow-neo overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-ink-charcoal uppercase tracking-tight">
              Recently Created / Updated Products
            </h2>
            <p className="text-xs text-ink-muted">
              Live records from the active catalogue database.
            </p>
          </div>
          <Link
            to="/admin/products"
            className="text-xs font-bold text-brand-red hover:underline inline-flex items-center gap-1"
          >
            View all products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
            Loading recent products from database...
          </div>
        ) : recentProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            No products found in the database.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentProducts.map((product) => (
              <div
                key={product.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas-ivory/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
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

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="font-bold text-xs sm:text-sm text-ink-charcoal hover:text-brand-red truncate block"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-secondary">
                      <span className="font-mono font-bold bg-canvas-ivory px-1.5 py-0.5 rounded border border-surface-border">
                        SKU: {product.sku}
                      </span>
                      {product.category && (
                        <span>• {product.category.name}</span>
                      )}
                      <span>• Stock: {product.stockQuantity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-surface-border">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-extrabold text-ink-charcoal">
                      {formatKes(product.priceKes)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(product)}
                    disabled={togglingId === product.id}
                    className={`rounded-neo-sm px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                      product.isPublished
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {togglingId === product.id
                      ? "Updating..."
                      : product.isPublished
                        ? "Published"
                        : "Draft"}
                  </button>

                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    className="neo-button-secondary text-xs py-1 px-2.5"
                  >
                    Edit
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product)}
                    disabled={deletingId === product.id}
                    className="neo-button-secondary inline-flex items-center gap-1 text-xs py-1 px-2.5 text-brand-red hover:border-brand-red disabled:opacity-50"
                    title="Delete product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{deletingId === product.id ? "Deleting..." : "Delete"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
