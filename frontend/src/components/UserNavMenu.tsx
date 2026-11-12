import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  ShieldCheck,
  User,
  Warehouse,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useCustomer } from "../context/CustomerContext";
import { JoctaLogo } from "./JoctaLogo";
import { UserAvatar } from "./UserAvatar";

interface UserNavMenuProps {
  isHeroOverlay?: boolean;
}

export function UserNavMenu({ isHeroOverlay = false }: UserNavMenuProps) {
  const { user, loginWithGoogle, logout } = useAdminAuth();
  const {
    wishlistCount,
    orders,
    loginModalOpen,
    openLoginModal,
    closeLoginModal,
  } = useCustomer();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const googleClientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes whichever is open
  useEffect(() => {
    if (!dropdownOpen && !loginModalOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        closeLoginModal();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [dropdownOpen, loginModalOpen, closeLoginModal]);

  // Keep the page behind the sign-in sheet from scrolling on phones
  useEffect(() => {
    if (!loginModalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [loginModalOpen]);

  // Check when Google Identity Services is available
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGsiLoaded(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true);
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Initialize and render Google Sign-In button inside login modal
  useEffect(() => {
    if (
      !loginModalOpen ||
      !gsiLoaded ||
      !googleBtnContainerRef.current ||
      !googleClientId
    ) {
      return;
    }

    try {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setAuthError("Google Sign-In returned an empty credential.");
            return;
          }

          setIsSubmitting(true);
          setAuthError(null);

          try {
            const loggedInUser = await loginWithGoogle(response.credential);
            closeLoginModal();
            if (loggedInUser.isAdmin) {
              // If admin, user can choose to go to /admin or stay on storefront
              setDropdownOpen(true);
            }
          } catch (err) {
            setAuthError(
              err instanceof Error
                ? err.message
                : "Sign-in failed. Please try again.",
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      const available =
        googleBtnContainerRef.current.parentElement?.clientWidth ?? 280;
      googleBtnContainerRef.current.innerHTML = "";
      window.google?.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: Math.max(200, Math.min(280, available)),
        logo_alignment: "left",
      });
    } catch (err) {
      console.error("Failed to render Google button in modal:", err);
    }
  }, [loginModalOpen, gsiLoaded, googleClientId, loginWithGoogle, closeLoginModal]);

  async function handleSignOut() {
    await logout();
    setDropdownOpen(false);
  }

  // 1. Authenticated User Dropdown (matches reference design)
  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        {/* User Avatar Button in Header */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          aria-label={`User menu for ${user.name || user.email}`}
          className={`h-9 w-9 sm:h-10 sm:w-10 p-0.5 rounded-full cursor-pointer inline-flex items-center justify-center transition-all border ${
            dropdownOpen
              ? "ring-2 ring-brand-red border-brand-red"
              : isHeroOverlay
                ? "border-white/40 hover:border-white"
                : "border-surface-border hover:border-brand-red"
          }`}
        >
          <UserAvatar user={user} className="h-full w-full text-xs" />
        </button>

        {/* Dropdown Card Popover */}
        {dropdownOpen && (
          <div
            role="menu"
            aria-label="User navigation"
            className="fixed inset-x-3 top-[4.25rem] max-h-[calc(100vh-5.5rem)] overflow-y-auto sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-72 sm:max-h-none sm:overflow-visible origin-top-right rounded-neo bg-surface-white border border-surface-border shadow-neo py-2 z-50 text-ink-charcoal animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header: User Profile Info */}
            <Link
              to="/account"
              onClick={() => setDropdownOpen(false)}
              className="px-4 py-3 border-b border-surface-border/60 flex items-center gap-3 hover:bg-canvas-ivory transition-colors"
            >
              <UserAvatar
                user={user}
                className="h-10 w-10 text-sm border border-surface-border"
              />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-sm text-ink-charcoal truncate">
                  {user.name || "Customer"}
                </p>
                <p
                  className="text-xs text-ink-muted truncate font-medium"
                  title={user.email}
                >
                  {user.email}
                </p>
              </div>
            </Link>

            {/* Standard User Menu Items */}
            <div className="py-1">
              <Link
                to="/account"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-ink-muted" />
                  <span>My Account</span>
                </div>
              </Link>

              <Link
                to="/orders"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-ink-muted" />
                  <span>My Orders</span>
                </div>
                {orders.length > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-neo-pill bg-canvas-warm border border-surface-border px-1.5 text-[10px] font-extrabold text-ink-charcoal">
                    {orders.length}
                  </span>
                )}
              </Link>

              <Link
                to="/wishlist"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-ink-muted" />
                  <span>Wishlist</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-neo-pill bg-brand-red-tint border border-brand-red/30 px-1.5 text-[10px] font-extrabold text-brand-red">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Admin Dashboard & Inventory Entry (ONLY shown for authorized administrators) */}
            {user.isAdmin && (
              <div className="py-1 border-t border-surface-border/60">
                <Link
                  to="/admin"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-extrabold text-brand-red hover:bg-brand-red/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-brand-red" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </Link>
                <Link
                  to="/inventory"
                  role="menuitem"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-extrabold text-brand-red hover:bg-brand-red/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Warehouse className="h-4 w-4 text-brand-red" />
                    <span>Inventory System</span>
                  </div>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </Link>
              </div>
            )}

            {/* Sign Out Action */}
            <div className="pt-1 border-t border-surface-border/60">
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-ink-muted hover:text-brand-red hover:bg-red-50 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-ink-muted" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Unauthenticated User State (User Icon / Sign In Button)
  return (
    <>
      <button
        type="button"
        onClick={openLoginModal}
        aria-label="Sign In with Google"
        title="Sign In with Google"
        className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm font-semibold cursor-pointer rounded-neo-sm inline-flex items-center justify-center gap-1.5 transition-colors border ${
          isHeroOverlay
            ? "bg-black/35 text-white border-white/25 hover:bg-black/55"
            : "border-surface-border bg-surface-white text-ink-secondary hover:text-brand-red hover:border-brand-red"
        }`}
      >
        <User className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign In</span>
      </button>

      {/* Sign-In Modal */}
      {loginModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:p-4 animate-in fade-in duration-150"
            onClick={closeLoginModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="signin-dialog-title"
              className="w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-neo bg-surface-white px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 shadow-neo border border-surface-border text-ink-charcoal"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="sm:hidden mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-surface-border"
                aria-hidden="true"
              />
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
                <div className="flex items-center gap-2">
                  <JoctaLogo size="sm" showText={false} />
                  <span className="font-black text-sm text-ink-charcoal">
                    Jocta Enterprises
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="h-10 w-10 -mr-2 inline-flex items-center justify-center rounded-neo-sm hover:bg-canvas-ivory text-ink-muted cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <h2
                  id="signin-dialog-title"
                  className="text-lg sm:text-base font-extrabold text-ink-charcoal"
                >
                  Sign In to Your Account
                </h2>
                <p className="text-sm sm:text-xs text-ink-muted mt-1">
                  Sign in with your Google account to access your orders and saved items.
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mb-4 rounded-neo-sm border border-red-300 bg-red-50 p-3 text-xs text-red-900 leading-relaxed"
                >
                  {authError}
                </div>
              )}

              <div className="flex flex-col items-center justify-center min-h-[50px] py-2">
                {isSubmitting ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-ink-charcoal py-3">
                    <Loader2 className="h-5 w-5 text-brand-red animate-spin" />
                    <span>Signing in with Google...</span>
                  </div>
                ) : !googleClientId ? (
                  <div className="w-full text-sm sm:text-xs text-amber-800 bg-amber-50 p-3 rounded-neo-sm border border-amber-300 text-center">
                    Google Client ID is being configured.
                  </div>
                ) : (
                  <div ref={googleBtnContainerRef} className="min-h-[44px]" />
                )}
              </div>

              {/* Quick links to Account / Orders / Wishlist even if browsing as guest */}
              <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Link
                    to="/account"
                    onClick={closeLoginModal}
                    className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2 py-2 text-[11px] font-bold text-ink-charcoal hover:border-brand-red hover:text-brand-red"
                  >
                    My Account
                  </Link>
                  <Link
                    to="/orders"
                    onClick={closeLoginModal}
                    className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2 py-2 text-[11px] font-bold text-ink-charcoal hover:border-brand-red hover:text-brand-red"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/wishlist"
                    onClick={closeLoginModal}
                    className="rounded-neo-sm border border-surface-border bg-canvas-ivory px-2 py-2 text-[11px] font-bold text-ink-charcoal hover:border-brand-red hover:text-brand-red"
                  >
                    Wishlist
                  </Link>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
