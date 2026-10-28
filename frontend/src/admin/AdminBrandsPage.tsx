import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Edit,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  BrandSummary,
  CreateBrandInput,
  UpdateBrandInput,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  async function loadBrands() {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogApi.getBrands();
      setBrands(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load brands from API.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBrands();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setLogoUrl("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(brand: BrandSummary) {
    setEditingId(brand.id);
    setName(brand.name);
    setSlug(brand.slug);
    setSlugEdited(true);
    setLogoUrl(brand.logoUrl);
    setFormError(null);
    setFormOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited && !editingId) {
      setSlug(generateSlug(val));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setFormError("Brand name is required.");
      return;
    }
    if (!slug.trim()) {
      setFormError("Brand slug is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateBrandInput = {
        name: name.trim(),
        slug: slug.trim(),
        logoUrl: logoUrl.trim(),
        isActive: true,
      };

      if (editingId) {
        const updated = await adminApi.updateBrand(editingId, payload);
        setBrands((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b)),
        );
        setSuccessMessage(`Brand '${updated.name}' updated successfully.`);
      } else {
        const created = await adminApi.createBrand(payload);
        setBrands((prev) => [...prev, created]);
        setSuccessMessage(`Brand '${created.name}' created successfully.`);
      }
      setFormOpen(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
            Brand Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Manage printer equipment and toner manufacturers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBrands}
            disabled={loading}
            className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
            title="Refresh list"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {error && (
        <div
          role="alert"
          className="rounded-neo-base border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Brand Load Error</p>
            <p className="mt-0.5 text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadBrands}
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

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-ink-muted">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
            Loading brands from database...
          </div>
        ) : brands.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-ink-muted">
            No brands found in the database.
          </div>
        ) : (
          brands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex items-center justify-between gap-3 hover:bg-canvas-ivory/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-16 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 p-1 flex items-center justify-center">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Bookmark className="h-5 w-5 text-ink-muted" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-xs sm:text-sm text-ink-charcoal truncate">
                    {brand.name}
                  </h2>
                  <p className="font-mono text-[11px] text-ink-muted truncate">
                    Slug: {brand.slug}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditForm(brand)}
                className="neo-button-secondary text-xs py-1 px-2.5 shrink-0 inline-flex items-center gap-1"
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal / Dialog Form for Create & Edit */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-charcoal/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-neo-base border border-surface-border bg-surface-white p-5 sm:p-6 shadow-neo space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
                {editingId ? "Edit Brand" : "Create New Brand"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-neo-sm hover:bg-canvas-ivory"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-neo-sm border border-brand-red/30 bg-brand-red/5 p-3 text-xs text-brand-red flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="font-semibold">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Brand Name <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Kyocera, HP, Canon"
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
                    setSlugEdited(true);
                  }}
                  placeholder="e.g. kyocera"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Logo Image URL
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="e.g. /brands/kyocera.svg or https://..."
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="neo-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neo-button-primary text-xs py-2 px-4"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Brand"
                      : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
