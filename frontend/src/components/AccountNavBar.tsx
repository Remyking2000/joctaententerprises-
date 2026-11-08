import { Link, NavLink } from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  User,
  Warehouse,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { UserAvatar } from "./UserAvatar";

export function AccountNavBar() {
  const { user, logout } = useAdminAuth();
  const { totalCount, openCart } = useCart();
  const { wishlistCount, orders, openLoginModal } = useCustomer();

  return (
    <section className="neo-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* User Profile Header */}
        <div className="flex items-center gap-3.5">
          {user ? (
            <UserAvatar
              user={user}
              className="h-12 w-12 sm:h-14 sm:w-14 text-base border border-surface-border shrink-0"
            />
          ) : (
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-canvas-warm border border-surface-border flex items-center justify-center text-ink-secondary shrink-0">
              <User className="h-6 w-6 text-brand-red" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-ink-charcoal truncate">
                {user ? user.name || "Customer Account" : "Guest Customer"}
              </h1>
              {user?.isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-neo-pill bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Administrator
                </span>
              ) : user ? (
                <span className="inline-flex items-center gap-1 rounded-neo-pill bg-canvas-ivory border border-surface-border px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  Google Account
                </span>
              ) : null}
            </div>
            <p className="text-xs sm:text-sm text-ink-muted truncate mt-0.5">
              {user
                ? user.email
                : "Sign in with Google to link your profile across sessions"}
            </p>
          </div>
        </div>

        {/* Right Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {user?.isAdmin && (
            <>
              <Link
                to="/admin"
                className="neo-button-secondary px-3 py-2 text-xs"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-brand-red" />
                <span>Admin Panel</span>
              </Link>
              <Link
                to="/inventory"
                className="neo-button-secondary px-3 py-2 text-xs"
              >
                <Warehouse className="h-3.5 w-3.5 text-brand-red" />
                <span>Inventory</span>
              </Link>
            </>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="neo-button-secondary px-3.5 py-2 text-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-ink-muted" />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openLoginModal}
              className="neo-button-primary px-4 py-2 text-xs cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <nav
        aria-label="Account sections"
        className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/account"
            end
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-neo-sm px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors ${
                isActive
                  ? "bg-brand-red text-white shadow-neo-sm"
                  : "bg-canvas-ivory border border-surface-border text-ink-charcoal hover:border-brand-red hover:text-brand-red"
              }`
            }
          >
            <User className="h-4 w-4" />
            <span>My Account</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-neo-sm px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors ${
                isActive
                  ? "bg-brand-red text-white shadow-neo-sm"
                  : "bg-canvas-ivory border border-surface-border text-ink-charcoal hover:border-brand-red hover:text-brand-red"
              }`
            }
          >
            <Package className="h-4 w-4" />
            <span>My Orders</span>
            {orders.length > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-neo-pill bg-surface-white/90 px-1.5 text-[11px] font-extrabold text-ink-charcoal">
                {orders.length}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-neo-sm px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors ${
                isActive
                  ? "bg-brand-red text-white shadow-neo-sm"
                  : "bg-canvas-ivory border border-surface-border text-ink-charcoal hover:border-brand-red hover:text-brand-red"
              }`
            }
          >
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
            {wishlistCount > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-neo-pill bg-surface-white/90 px-1.5 text-[11px] font-extrabold text-ink-charcoal">
                {wishlistCount}
              </span>
            )}
          </NavLink>
        </div>

        <button
          type="button"
          onClick={openCart}
          className="neo-button-secondary px-3.5 py-2 text-xs cursor-pointer"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-brand-red" />
          <span>Selection List ({totalCount})</span>
        </button>
      </nav>
    </section>
  );
}
