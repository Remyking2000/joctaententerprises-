import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bookmark,
  ExternalLink,
  Warehouse,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Printer,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { JoctaLogo } from "../components/JoctaLogo";
import { UserAvatar } from "../components/UserAvatar";
import { useAdminAuth } from "../context/AdminAuthContext";

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
  {
    to: "/admin/printer-models",
    end: false,
    label: "Printer Models",
    icon: Printer,
  },
  {
    to: "/inventory",
    end: false,
    label: "Inventory System",
    icon: Warehouse,
    group: "Workspaces",
  },
] as const;

function NavGroupHeading({ label }: { label: string }) {
  return (
    <p className="px-3.5 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-ink-muted">
      {label}
    </p>
  );
}

export function AdminLayout() {
  const { user, loading, checkAuth, logout } = useAdminAuth();
  const [verifying, setVerifying] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setVerifying(true);
    checkAuth()
      .catch(() => null)
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => {
      active = false;
    };
  }, [checkAuth]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  // 1. Loading state while checking session
  if ((loading || verifying) && !user) {
    return (
      <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
          <p className="text-xs font-bold text-ink-charcoal uppercase tracking-wider">
            Verifying Administrator Session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated redirect to /admin/login
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but not an authorized administrator
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-white border border-surface-border rounded-neo shadow-neo p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            403
          </div>
          <h1 className="text-lg font-extrabold text-ink-charcoal">
            Administrator Access Required
          </h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            You are signed in as{" "}
            <span className="font-mono font-bold text-ink-charcoal">
              {user.email}
            </span>
            , which does not have administrator privileges.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/" className="neo-button-secondary text-xs py-2 px-4">
              Return to Storefront
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="neo-button-primary text-xs py-2 px-4"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col selection:bg-brand-red selection:text-white">
      {/* 1. Verified Session Status Bar */}
      <div
        role="status"
        aria-label="Administrator session info"
        className="print:hidden bg-ink-charcoal text-white border-b border-surface-border px-3 py-1.5 text-xs font-medium flex items-center justify-between gap-2 shadow-sm"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="leading-tight text-[11px] sm:text-xs">
              <strong>Admin Session:</strong> Authenticated as{" "}
              <span className="font-mono text-emerald-300 font-semibold">
                {user.email}
              </span>
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-ink-muted">
            Google Identity Verified
          </span>
        </div>
      </div>

      {/* 2. Top Header Bar */}
      <header className="print:hidden sticky top-0 z-30 bg-surface-white border-b border-surface-border shadow-neo px-4 py-3 sm:px-6">
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
              <div className="hidden min-[400px]:flex flex-col whitespace-nowrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-red leading-none">
                  Admin Portal
                </span>
                <span className="text-[10px] font-bold text-ink-muted leading-tight">
                  Jocta Enterprises
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Chip */}
            <div className="hidden sm:flex items-center gap-2 rounded-neo-sm border border-surface-border bg-canvas-ivory px-2.5 py-1 text-xs">
              <UserAvatar user={user} className="h-5 w-5 text-[10px] border border-surface-border" />
              <span className="font-semibold text-ink-charcoal max-w-[160px] truncate">
                {user.name || user.email}
              </span>
            </div>

            {/* Storefront Link */}
            <Link
              to="/"
              className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View</span> Storefront
            </Link>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className="neo-button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 hover:text-brand-red hover:border-brand-red"
              title="Sign out of Admin Portal"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Body: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="print:hidden hidden md:flex flex-col w-56 shrink-0 border-r border-surface-border bg-surface-white py-6 px-3">
          <nav aria-label="Admin Navigation" className="space-y-1">
            {ADMIN_NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <div key={link.to}>
                {"group" in link && <NavGroupHeading label={link.group} />}
                <NavLink
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
                </div>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-surface-border">
            <div className="rounded-neo-sm border border-surface-border bg-canvas-ivory p-3 text-[11px] text-ink-muted space-y-2">
              <div className="flex items-center gap-2">
                <UserAvatar user={user} className="h-7 w-7 text-xs border border-surface-border" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-charcoal truncate">
                    {user.name || "Administrator"}
                  </p>
                  <p className="text-[10px] text-ink-muted truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="w-full neo-button-secondary py-1.5 text-xs justify-center text-ink-muted hover:text-brand-red"
              >
                <LogOut className="h-3 w-3 mr-1.5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Out Drawer */}
        {mobileNavOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink-charcoal/50 flex"
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
                    <div key={link.to}>
                    {"group" in link && <NavGroupHeading label={link.group} />}
                    <NavLink
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
                    </div>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-surface-border space-y-3">
                <div className="rounded-neo-sm bg-canvas-ivory p-2.5 border border-surface-border text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-ink-muted shrink-0" />
                    <span className="font-semibold truncate text-[11px]">
                      {user.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void handleLogout();
                    }}
                    className="neo-button-secondary w-full justify-center text-xs py-1.5 hover:text-brand-red"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    Sign Out
                  </button>
                </div>

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
