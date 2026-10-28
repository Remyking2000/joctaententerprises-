import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Layers,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  CategorySummary,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
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
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogApi.getCategories();
      setCategories(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load categories.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setImageUrl("");
    setSortOrder(String(categories.length + 1));
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(cat: CategorySummary) {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugEdited(true);
    setDescription(cat.description);
    setImageUrl(cat.imageUrl);
    setSortOrder(String(cat.sortOrder));
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
      setFormError("Category name is required.");
      return;
    }
    if (!slug.trim()) {
      setFormError("Category slug is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateCategoryInput = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive: true,
      };

      if (editingId) {
        const updated = await adminApi.updateCategory(editingId, payload);
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c)),
        );
        setSuccessMessage(`Category '${updated.name}' updated successfully.`);
      } else {
        const created = await adminApi.createCategory(payload);
        setCategories((prev) => [...prev, created]);
        setSuccessMessage(`Category '${created.name}' created successfully.`);
      }
      setFormOpen(false);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError("An unexpected error occurred.");
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
            Category Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Manage product categories and navigation taxonomy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCategories}
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
            <span>Add Category</span>
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
            <p className="font-bold">Category Load Error</p>
            <p className="mt-0.5 text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadCategories}
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

      {/* Categories Table / Cards */}
      <div className="rounded-neo-base border border-surface-border bg-surface-white shadow-neo overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
            Loading categories from database...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            No categories defined in the database.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-canvas-ivory/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 flex items-center justify-center text-brand-red">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xs sm:text-sm text-ink-charcoal">
                      {cat.name}
                    </h2>
                    <p className="font-mono text-[11px] text-ink-muted">
                      Slug: {cat.slug} • Order: {cat.sortOrder}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-ink-secondary mt-0.5 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openEditForm(cat)}
                    className="neo-button-secondary text-xs py-1 px-3 inline-flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                {editingId ? "Edit Category" : "Create New Category"}
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
                  Category Name <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Laser Toners"
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
                  placeholder="e.g. laser-toners"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief description..."
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Sort Order Priority
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
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
                      ? "Update Category"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
