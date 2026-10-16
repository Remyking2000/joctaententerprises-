import { PRODUCT_TYPES } from "@jocta/shared";

export function App() {
  return (
    <main className="min-h-screen bg-canvas-ivory text-ink-charcoal px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl neo-card p-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-neo-pill bg-brand-red"
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Phase 1 Foundation
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-ink-charcoal">
          Jocta Enterprises
        </h1>
        <p className="mt-2 text-base text-ink-secondary">
          Printer toners, printer parts, consumables, and printers. Foundational
          design tokens and shared catalog types ({PRODUCT_TYPES.length} product
          types) are configured.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="neo-button-primary px-5 py-2.5 text-sm">
            Brand Red Action (#E9252A)
          </button>
          <div className="neo-surface-inset px-4 py-2.5 text-sm text-ink-secondary">
            Warm Ivory Inset Surface
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
