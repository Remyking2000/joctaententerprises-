import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PackagePlus,
  Receipt,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";
import { JoctaLogo } from "../components/JoctaLogo";
import { UserAvatar } from "../components/UserAvatar";
import { useAdminAuth } from "../context/AdminAuthContext";

/**
 * The inventory system's own workspace at /inventory. It shares the admin
 * sign-in (and the same products and stock) but has its own navigation, so
 * stock work stays separate from catalogue management in /admin.
 */
const INVENTORY_NAV = [
  { to: "/inventory", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/inventory/stock", end: false, label: "Stock Levels", icon: Boxes },
  { to: "/inventory/receive", end: false, label: "Receive Stock", icon: PackagePlus },
  { to: "/inventory/stock-take", end: false, label: "Stock Take", icon: ClipboardCheck },
  { to: "/inventory/movements", end: false, label: "Stock History", icon: History },
  { to: "/inventory/sales", end: true, label: "Sales", icon: Receipt },
  { to: "/inventory/reports", end: false, label: "Sales Report", icon: BarChart3 },
];

function navClass(isActive: boolean) {
  return `inline-flex items-center gap-2 whitespace-nowrap rounded-neo-sm px-3 py-2 text-sm font-bold transition-colors ${
    isActive
      ? "bg-brand-red text-white shadow-neo-sm"
      : "text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory"
  }`;
}

export function InventoryLayout() {
  const { user, loading, checkAuth, logout } = useAdminAuth();
  const [verifying, setVerifying] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [location.pathname]);

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
    setSigningOut(true);
    try {
      await logout();
      navigate("/admin/login", { replace: true, state: { from: { pathname: "/inventory" } } });
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-canvas-ivory flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
          <p className="text-sm font-bold text-ink-charcoal">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-canvas-ivory flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-white border border-surface-border rounded-neo shadow-neo p-6 text-center space-y-4">
          <h1 className="text-lg font-extrabold text-ink-charcoal">Inventory access required</h1>
          <p className="text-sm text-ink-muted">
            <span className="font-mono font-bold text-ink-charcoal">{user.email}</span> is not
            authorised to use the inventory system.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/" className="neo-button-secondary text-sm py-2 px-4">Storefront</Link>
            <button type="button" onClick={() => void handleLogout()} className="neo-button-primary text-sm py-2 px-4">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col">
      <header className="print:hidden sticky top-0 z-30 bg-surface-white border-b border-surface-border shadow-neo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="lg:hidden neo-button-secondary p-2"
              aria-label={menuOpen ? "Close menu" : "Open inventory menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/inventory" className="flex items-center gap-2.5 select-none" aria-label="Jocta Inventory home">
              <JoctaLogo size="sm" showText={false} />
              <span className="hidden min-[420px]:flex flex-col whitespace-nowrap">
                <span className="text-sm font-extrabold uppercase tracking-wider text-brand-red leading-none">
                  Inventory
                </span>
                <span className="text-[11px] font-bold text-ink-muted leading-tight">Jocta Enterprises</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/inventory/sales/new" className="neo-button-primary text-sm py-2 px-3.5">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Record Sale</span>
            </Link>
            <Link to="/admin" className="neo-button-secondary text-sm py-2 px-3" title="Go to the admin panel">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Admin Panel</span>
            </Link>
            <span className="hidden sm:flex" title={user.email}>
              <UserAvatar user={user} className="h-9 w-9 text-sm" />
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              className="neo-button-secondary text-sm py-2 px-3"
              title="Sign out"
              aria-label="Sign out"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop navigation */}
        <nav aria-label="Inventory" className="hidden lg:block border-t border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1">
            {INVENTORY_NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => navClass(isActive)}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile navigation */}
        {menuOpen && (
          <nav aria-label="Inventory" className="lg:hidden border-t border-surface-border px-4 py-3 space-y-1">
            {INVENTORY_NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `${navClass(isActive)} w-full`}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-surface-border text-xs text-ink-muted">
              Signed in as <span className="font-semibold text-ink-charcoal">{user.email}</span>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
