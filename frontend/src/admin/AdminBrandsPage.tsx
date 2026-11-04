import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { BrandSummary, CreateBrandInput } from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";
import { ImageUploadDropzone } from "./components/ImageUploadDropzone";

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
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [showCustomSlug, setShowCustomSlug] = useState(false);
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
    setShowCustomSlug(false);
    setLogoUrl("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(brand: BrandSummary) {
    setEditingId(brand.id);
    setName(brand.name);
    setSlug(brand.slug);
    setShowCustomSlug(false);
    setLogoUrl(brand.logoUrl);
    setFormError(null);
    setFormOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!showCustomSlug && !editingId) {
      setSlug(generateSlug(val));
    }
  }

  async function handleDelete(brand: BrandSummary) {
    const confirmed = window.confirm(
      `Delete brand "${brand.name}"?\n\nAny products or printer models using this brand will remain in the catalogue as Generic/Unassigned.`,
    );
    if (!confirmed) return;

    setDeletingId(brand.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.deleteBrand(brand.id);
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
      setSuccessMessage(`Brand '${brand.name}' deleted.`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete brand.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const effectiveSlug = (slug.trim() || generateSlug(trimmedName)).trim();

    if (!trimmedName) {
      setFormError("Brand name is required.");
      return;
    }
    if (!effectiveSlug) {
      setFormError("Brand slug could not be generated. Please enter a valid name.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateBrandInput = {
        name: trimmedName,
        slug: effectiveSlug,
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

  const filteredBrands = brands.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
            Brand Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Add, edit, or remove printer equipment and supply manufacturers.
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
            <span>Create Brand</span>
          </button>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white p-3.5 shadow-neo flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter brands by name..."
            className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory pl-9 pr-3 py-2 text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          />
        </div>
        <span className="text-xs font-bold text-ink-secondary shrink-0">
          {filteredBrands.length} brand{filteredBrands.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Global Notifications */}
      {error && (
        <div
          role="alert"
          className="rounded-neo-base border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Brand Error</p>
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
        ) : filteredBrands.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-ink-muted">
            No brands found. Click &ldquo;Create Brand&rdquo; to create one.
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-neo-base border border-surface-border bg-surface-white p-4 shadow-neo flex items-center justify-between gap-3 hover:bg-canvas-ivory/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-16 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 p-1 flex items-center justify-center overflow-hidden">
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
                    /{brand.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditForm(brand)}
                  className="neo-button-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === brand.id}
                  onClick={() => handleDelete(brand)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-neo-sm border border-surface-border text-ink-secondary hover:text-brand-red hover:border-brand-red transition-colors cursor-pointer"
                  title="Delete brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal / Dialog Form for Create & Edit */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-charcoal/50 flex items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-neo-base border border-surface-border bg-surface-white p-5 sm:p-6 shadow-neo space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2 className="text-sm font-black text-ink-charcoal uppercase tracking-tight">
                {editingId ? "Edit Brand" : "Create Brand"}
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Brand Name <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. HP, Kyocera, Canon, Brother"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>
                    URL Slug:{" "}
                    <code className="font-mono text-ink-charcoal">
                      {slug || generateSlug(name) || "auto-generated"}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomSlug((v) => !v)}
                    className="text-brand-red hover:underline font-semibold cursor-pointer"
                  >
                    {showCustomSlug ? "Hide slug" : "Customize slug"}
                  </button>
                </div>
              </div>

              {showCustomSlug && (
                <div>
                  <label className="block font-bold text-ink-charcoal mb-1">
                    Custom URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="e.g. kyocera"
                    className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                  />
                </div>
              )}

              <ImageUploadDropzone
                label="Brand Logo (Optional)"
                helperText="Drag & drop a brand logo here, or click to upload from your device"
                value={logoUrl}
                onChange={setLogoUrl}
                compact
              />

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
                    ? editingId ? "Updating..." : "Creating..."
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
