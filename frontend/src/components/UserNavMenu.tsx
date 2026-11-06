import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { JoctaLogo } from "./JoctaLogo";

interface UserNavMenuProps {
  isHeroOverlay?: boolean;
}

export function UserNavMenu({ isHeroOverlay = false }: UserNavMenuProps) {
  const { user, loading, loginWithGoogle, logout } = useAdminAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
            setLoginModalOpen(false);
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

      googleBtnContainerRef.current.innerHTML = "";
      window.google?.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 280,
        logo_alignment: "left",
      });
    } catch (err) {
      console.error("Failed to render Google button in modal:", err);
    }
  }, [loginModalOpen, gsiLoaded, googleClientId, loginWithGoogle]);

  async function handleSignOut() {
    await logout();
    setDropdownOpen(false);
  }

  // 1. Authenticated User Dropdown (matches reference design)
  if (user) {
    const avatarInitial = (user.name || user.email).charAt(0).toUpperCase();

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
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name || user.email}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-brand-red text-white font-bold flex items-center justify-center text-xs">
              {avatarInitial}
            </div>
          )}
        </button>

        {/* Dropdown Card Popover */}
        {dropdownOpen && (
          <div
            role="menu"
            aria-label="User navigation"
            className="absolute right-0 mt-2 w-72 origin-top-right rounded-neo bg-surface-white border border-surface-border shadow-neo py-2 z-50 text-ink-charcoal animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header: User Profile Info */}
            <div className="px-4 py-3 border-b border-surface-border/60 flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || user.email}
                  className="h-10 w-10 rounded-full border border-surface-border object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-brand-red text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                  {avatarInitial}
                </div>
              )}
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
            </div>

            {/* Standard User Menu Items */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors text-left"
              >
                <User className="h-4 w-4 text-ink-muted" />
                <span>My Account</span>
              </button>

              <button
                type="button"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors text-left"
              >
                <Package className="h-4 w-4 text-ink-muted" />
                <span>My Orders</span>
              </button>

              <button
                type="button"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-ink-secondary hover:text-ink-charcoal hover:bg-canvas-ivory transition-colors text-left"
              >
                <Heart className="h-4 w-4 text-ink-muted" />
                <span>Wishlist</span>
              </button>
            </div>

            {/* Admin Dashboard Entry (ONLY shown for authorized administrators) */}
            {user.isAdmin && (
              <div className="py-1 border-t border-surface-border/60">
                <Link
                  to="/admin"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-extrabold text-brand-red hover:bg-brand-red/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-brand-red" />
                    <span>Admin Dashboard</span>
                  </div>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </Link>
              </div>
            )}

            {/* Sign Out Action */}
            <div className="pt-1 border-t border-surface-border/60">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-ink-muted hover:text-brand-red hover:bg-red-50 transition-colors text-left"
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
        onClick={() => setLoginModalOpen(true)}
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
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => setLoginModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-neo bg-surface-white p-6 shadow-neo border border-surface-border text-ink-charcoal"
            onClick={(e) => e.stopPropagation()}
          >
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
                onClick={() => setLoginModalOpen(false)}
                className="p-1 rounded-neo-sm hover:bg-canvas-ivory text-ink-muted"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-base font-extrabold text-ink-charcoal">
                Sign In to Your Account
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Use your Google account to access your orders, account, or
                administrator dashboard.
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
                <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-neo-sm border border-amber-300 text-center">
                  Google Client ID is being configured.
                </div>
              ) : (
                <div ref={googleBtnContainerRef} className="min-h-[44px]" />
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-surface-border text-center">
              <p className="text-[11px] text-ink-muted">
                Authorized administrators will automatically receive access to
                the Admin Dashboard upon signing in.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
