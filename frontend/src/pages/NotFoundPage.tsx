import { Link } from "react-router-dom";
import { Compass, Printer, ShoppingBag } from "lucide-react";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center">
      <div className="neo-card p-8 sm:p-12 space-y-5">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-neo-pill bg-brand-red-tint text-brand-red border border-brand-red/30">
          <Compass className="h-8 w-8" aria-hidden="true" />
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
          Error 404
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-charcoal">
          Page Not Found
        </h1>
        <p className="mx-auto max-w-md text-sm text-ink-secondary leading-relaxed">
          The page you are looking for does not exist or may have been moved.
          Use the links below to browse our printer toners, spare parts, or
          compatibility finder.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/" className="neo-button-primary px-5 py-2.5 text-sm">
            Back to Homepage
          </Link>
          <Link
            to="/shop"
            className="neo-button-secondary px-5 py-2.5 text-sm"
          >
            <ShoppingBag className="h-4 w-4 text-brand-red" aria-hidden="true" />
            Shop Catalogue
          </Link>
          <Link
            to="/compatibility"
            className="neo-button-secondary px-5 py-2.5 text-sm"
          >
            <Printer className="h-4 w-4 text-brand-red" aria-hidden="true" />
            Compatibility Finder
          </Link>
        </div>
      </div>
    </main>
  );
}
