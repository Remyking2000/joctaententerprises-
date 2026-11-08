import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Edit,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  BrandSummary,
  CreatePrinterModelInput,
  PrinterModelSummary,
} from "@jocta/shared";
import { adminApi, catalogApi, ApiClientError } from "../lib/api";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminPrinterModelsPage() {
  const [printerModels, setPrinterModels] = useState<PrinterModelSummary[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [showCustomSlug, setShowCustomSlug] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [series, setSeries] = useState("");

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [modelsData, brandsData] = await Promise.all([
        adminApi.getPrinterModels({ limit: 200 }),
        catalogApi.getBrands(),
      ]);
      setPrinterModels(modelsData);
      setBrands(brandsData);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to load printer models from the database.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setShowCustomSlug(false);
    setBrandId(brands[0]?.id ?? "");
    setSeries("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(model: PrinterModelSummary) {
    setEditingId(model.id);
    setName(model.name);
    setSlug(model.slug);
    setShowCustomSlug(false);
    setBrandId(model.brandId ?? "");
    setSeries(model.series ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!showCustomSlug && !editingId) {
      setSlug(generateSlug(val));
    }
  }

  async function handleDelete(model: PrinterModelSummary) {
    const confirmed = window.confirm(
      `Delete printer model "${model.name}"?\n\nThis will unlink it from any compatible supplies.`,
    );
    if (!confirmed) return;

    setDeletingId(model.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.deletePrinterModel(model.id);
      setPrinterModels((prev) => prev.filter((m) => m.id !== model.id));
      setSuccessMessage(`Printer model '${model.name}' deleted.`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to delete printer model.");
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
      setFormError("Printer model name is required.");
      return;
    }
    if (!effectiveSlug) {
      setFormError("Printer model slug could not be generated.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreatePrinterModelInput = {
        name: trimmedName,
        slug: effectiveSlug,
        brandId: brandId ? brandId : null,
        series: series.trim() ? series.trim() : null,
      };

      if (editingId) {
        const updated = await adminApi.updatePrinterModel(editingId, payload);
        setPrinterModels((prev) =>
          prev.map((m) => (m.id === editingId ? updated : m)),
        );
        setSuccessMessage(
          `Printer model '${updated.name}' updated successfully.`,
        );
      } else {
        const created = await adminApi.createPrinterModel(payload);
        setPrinterModels((prev) => [...prev, created]);
        setSuccessMessage(
          `Printer model '${created.name}' created successfully.`,
        );
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

  // Filtered list
  const filteredModels = printerModels.filter((model) => {
    if (selectedBrand && model.brandId !== selectedBrand) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = model.name.toLowerCase().includes(q);
      const matchSeries = model.series?.toLowerCase().includes(q) ?? false;
      const matchBrand = model.brandName?.toLowerCase().includes(q) ?? false;
      return matchName || matchSeries || matchBrand;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ink-charcoal uppercase tracking-tight">
            Printer Model Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Manage printer hardware models, series, and brand mappings for
            compatibility matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadInitialData}
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
            <span>Create Printer Model</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          role="alert"
          className="rounded-neo border border-brand-red/30 bg-brand-red/5 p-4 text-xs text-brand-red flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error</p>
            <p className="mt-0.5 text-ink-secondary">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadInitialData}
            className="neo-button-secondary text-xs py-1 px-2.5"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="alert"
          className="rounded-neo border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2.5"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <p className="font-bold">{successMessage}</p>
        </div>
      )}

      {/* Company Category Filter Tabs */}
      {brands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedBrand("")}
            className={`rounded-neo-pill px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              selectedBrand === ""
                ? "bg-brand-red text-white shadow-neo-sm"
                : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
            }`}
          >
            All Companies
          </button>
          {brands.map((b) => {
            const isActive = selectedBrand === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBrand(isActive ? "" : b.id)}
                className={`rounded-neo-pill px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-brand-red text-white shadow-neo-sm"
                    : "bg-surface-white border border-surface-border text-ink-charcoal hover:border-brand-red"
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-neo border border-surface-border bg-surface-white p-3.5 sm:p-4 shadow-neo flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by model name, series, or brand (e.g. LaserJet, ECOSYS, Canon)..."
              className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory pl-9 pr-3 py-2 text-xs text-ink-charcoal focus:border-brand-red focus:outline-hidden"
            />
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-xs font-semibold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
          >
            <option value="">All Brands / Manufacturers</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {(search || selectedBrand) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedBrand("");
            }}
            className="neo-button-secondary text-xs py-2 px-3 text-ink-secondary hover:text-brand-red self-start sm:self-auto shrink-0"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Meta Stats */}
      <div className="flex items-center justify-between text-xs text-ink-secondary font-semibold px-1">
        <span>
          Showing {filteredModels.length} of {printerModels.length} printer
          models
        </span>
      </div>

      {/* Table / Card List */}
      <div className="rounded-neo border border-surface-border bg-surface-white shadow-neo overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2 text-brand-red" />
            Loading printer models from database...
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted space-y-2">
            <Printer className="h-8 w-8 mx-auto text-ink-muted/50" />
            <p className="font-semibold text-ink-charcoal">
              No printer models found
            </p>
            <p className="max-w-md mx-auto text-ink-secondary text-[11px]">
              {search || selectedBrand
                ? "No printer models matched your search or brand filters."
                : "No printer hardware models exist in the catalogue yet. Click 'Create Printer Model' to register one."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-surface-border bg-canvas-ivory text-ink-secondary uppercase text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Printer Model</th>
                    <th className="py-3 px-3">Manufacturer / Brand</th>
                    <th className="py-3 px-3">Series / Family</th>
                    <th className="py-3 px-3 text-center">Compatible Items</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredModels.map((model) => (
                    <tr
                      key={model.id}
                      className="hover:bg-canvas-ivory/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 flex items-center justify-center">
                            <Printer className="h-4 w-4 text-brand-red" />
                          </div>
                          <div>
                            <span className="font-bold text-ink-charcoal block">
                              {model.name}
                            </span>
                            <span className="font-mono text-[11px] text-ink-muted">
                              /{model.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {model.brandName ? (
                          <span className="inline-flex items-center gap-1 rounded-neo-sm border border-surface-border bg-canvas-ivory px-2 py-0.5 font-bold text-ink-charcoal">
                            <Bookmark className="h-3 w-3 text-brand-red" />
                            {model.brandName}
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">Generic</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-ink-secondary">
                        {model.series ? (
                          <span>{model.series}</span>
                        ) : (
                          <span className="text-ink-muted italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            (model.compatibleProductCount ?? 0) > 0
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-canvas-ivory text-ink-muted border border-surface-border"
                          }`}
                        >
                          {model.compatibleProductCount ?? 0} linked
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => openEditForm(model)}
                            className="neo-button-secondary text-xs py-1 px-2.5"
                          >
                            <Edit className="h-3 w-3 mr-1 text-brand-red" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === model.id}
                            onClick={() => handleDelete(model)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-neo-sm border border-surface-border text-ink-secondary hover:text-brand-red hover:border-brand-red transition-colors cursor-pointer"
                            title="Delete printer model"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden divide-y divide-surface-border">
              {filteredModels.map((model) => (
                <div key={model.id} className="p-4 space-y-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-neo-sm border border-surface-border bg-canvas-ivory shrink-0 flex items-center justify-center mt-0.5">
                        <Printer className="h-4 w-4 text-brand-red" />
                      </div>
                      <div>
                        <h2 className="font-bold text-sm text-ink-charcoal">
                          {model.name}
                        </h2>
                        <span className="font-mono text-[11px] text-ink-muted block mt-0.5 break-all">
                          /{model.slug}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(model)}
                        className="neo-button-secondary text-xs py-2 px-2.5"
                      >
                        <Edit className="h-3 w-3 mr-1 text-brand-red" />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === model.id}
                        onClick={() => handleDelete(model)}
                        className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold rounded-neo-sm border border-surface-border text-ink-secondary hover:text-brand-red"
                        title="Delete printer model"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-border/60 text-xs text-ink-secondary">
                    {model.brandName && (
                      <span className="inline-flex items-center gap-1 rounded bg-canvas-ivory border border-surface-border px-2 py-0.5 text-[10px] font-bold text-ink-charcoal">
                        {model.brandName}
                      </span>
                    )}
                    {model.series && (
                      <span className="text-[11px] text-ink-muted">
                        • {model.series}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-semibold text-ink-charcoal">
                      {model.compatibleProductCount ?? 0} compatible supplies
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Dialog for Create & Edit */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-charcoal/50 p-4"
          onClick={() => setFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="w-full max-w-lg rounded-neo border border-surface-border bg-surface-white p-5 sm:p-6 shadow-neo space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h2
                id="modal-title"
                className="text-sm sm:text-base font-black uppercase tracking-tight text-ink-charcoal flex items-center gap-2"
              >
                <Printer className="h-4 w-4 text-brand-red" />
                <span>
                  {editingId ? "Edit Printer Model" : "Create Printer Model"}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-neo-sm hover:bg-canvas-ivory text-ink-secondary"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-neo border border-brand-red/30 bg-brand-red/5 p-3 text-xs text-brand-red flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="font-semibold">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Manufacturer / Brand
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

              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Model Name <span className="text-brand-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. HP LaserJet Pro M404dn"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-bold text-ink-charcoal focus:border-brand-red focus:outline-hidden"
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
                    placeholder="e.g. hp-laserjet-pro-m404dn"
                    className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 font-mono text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-ink-charcoal mb-1">
                  Series / Family (Optional)
                </label>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="e.g. LaserJet Pro M404 Series"
                  className="w-full rounded-neo-sm border border-surface-border bg-canvas-ivory px-3 py-2 text-ink-charcoal focus:border-brand-red focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={submitting}
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
                      ? "Update Printer Model"
                      : "Create Printer Model"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
