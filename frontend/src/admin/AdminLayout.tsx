import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bookmark,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Menu,
  Package,
  ShieldAlert,
  X,
} from "lucide-react";
import { JoctaLogo } from "../components/JoctaLogo";

const ADMIN_NAV_LINKS = [
  {
    to: "/admin",
    end: true,
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/products",
    end: false,
    label: "Products",
    icon: Package,
  },
  {
    to: "/admin/categories",
    end: false,
    label: "Categories",
    icon: Layers,
  },
  {
    to: "/admin/brands",
    end: false,
    label: "Brands",
    icon: Bookmark,
  },
];

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col selection:bg-brand-red selection:text-white">
      {/* 1. Development & Functional Testing Warning Banner */}
      <div
        role="alert"
        className="bg-amber-500 text-ink-charcoal border-b border-amber-600/40 px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm"
      >
        <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950" />
          <span className="leading-tight">
            <strong>Development &amp; Testing Build:</strong> This admin panel is
            for functional testing and schema verification. Google
            authentication and production access control are deferred to Phase 2.
            Do not use as production security.
          </span>
        </div>
      </div>

      {/* 2. Top Header Bar */}
      <header className="sticky top-0 z-30 bg-surface-white border-b border-surface-border shadow-neo px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="md:hidden neo-button-secondary p-2"
              aria-label={mobileNavOpen ? "Close menu" : "Open admin menu"}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <Link
              to="/admin"
              className="flex items-center gap-2.5 select-none"
              aria-label="Jocta Admin Home"
            >
              <JoctaLogo size="sm" showText={false} />
              <div className="flex flex-col">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-red leading-none">
                  Admin Portal
                </span>
                <span className="text-[10px] font-bold text-ink-muted leading-tight">
                  Phase 1 Testing
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-neo-sm border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Backend Connected
            </span>

            <Link
              to="/"
              className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View</span> Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* 3. Main Body: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-surface-border bg-surface-white py-6 px-3">
          <nav aria-label="Admin Navigation" className="space-y-1">
            {ADMIN_NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-neo-sm px-3.5 py-2.5 text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-brand-red text-white shadow-neo-sm"
                        : "text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-surface-border">
            <div className="rounded-neo-sm border border-surface-border bg-canvas-ivory p-3 text-[11px] text-ink-muted">
              <p className="font-bold text-ink-charcoal flex items-center gap-1 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-brand-red" />
                Auth: Deferred
              </p>
              <p>Google OAuth integration will be configured in Phase 2.</p>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Out Drawer */}
        {mobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-charcoal/60 backdrop-blur-xs flex"
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className="w-64 max-w-[80vw] bg-surface-white h-full p-4 flex flex-col shadow-neo"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                  Admin Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded-neo-sm hover:bg-canvas-ivory"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {ADMIN_NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-neo-sm px-3.5 py-2.5 text-xs font-bold transition-colors ${
                          isActive
                            ? "bg-brand-red text-white shadow-neo-sm"
                            : "text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-surface-border space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="neo-button-secondary w-full justify-center text-xs py-2"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Return to Storefront
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
