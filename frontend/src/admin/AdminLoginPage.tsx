import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { JoctaLogo } from "../components/JoctaLogo";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ApiClientError } from "../lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            },
          ) => void;
          prompt?: (notification: unknown) => void;
        };
      };
    };
  }
}

export function AdminLoginPage() {
  const { user, loading: authLoading, loginWithGoogle, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbiddenError, setIsForbiddenError] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const googleClientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

  const locationState = location.state as
    | { from?: { pathname: string }; unauthorizedEmail?: string }
    | undefined;

  const fromLocation = locationState?.from?.pathname || "/admin";

  // Redirect ONLY if already authenticated as an authorized administrator
  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      navigate(fromLocation, { replace: true });
    }
  }, [user, authLoading, navigate, fromLocation]);

  // Show forbidden notice if a signed-in non-admin user was redirected from /admin
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      setIsForbiddenError(true);
      setErrorMessage(
        `Access denied. You are currently signed in as "${user.email}", which is not authorized as an administrator.`,
      );
    }
  }, [authLoading, user]);

  // Check when Google Identity Services is available on window
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
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Initialize and render Google Sign-In button
  useEffect(() => {
    if (!gsiLoaded || !googleButtonRef.current || !googleClientId) {
      return;
    }

    try {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setErrorMessage("Google Sign-In returned an empty credential.");
            return;
          }

          setIsSubmitting(true);
          setErrorMessage(null);
          setIsForbiddenError(false);

          try {
            const loggedInUser = await loginWithGoogle(response.credential);
            if (!loggedInUser.isAdmin) {
              setIsForbiddenError(true);
              setErrorMessage(
                `Access denied. Google account "${loggedInUser.email}" is not on the administrator allowlist.`,
              );
              return;
            }
            navigate(fromLocation, { replace: true });
          } catch (err) {
            if (err instanceof ApiClientError) {
              if (err.statusCode === 403) {
                setIsForbiddenError(true);
                setErrorMessage(
                  err.message ||
                    "Access denied. This Google account is not on the administrator allowlist.",
                );
              } else {
                setErrorMessage(
                  err.message || "Authentication failed. Please try again.",
                );
              }
            } else {
              setErrorMessage(
                err instanceof Error
                  ? err.message
                  : "An unexpected error occurred during authentication.",
              );
            }
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google?.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 300,
        logo_alignment: "left",
      });
    } catch (err) {
      console.error("Failed to render Google Sign-In button:", err);
    }
  }, [gsiLoaded, googleClientId, loginWithGoogle, navigate, fromLocation]);

  async function handleSwitchAccount() {
    await logout();
    setErrorMessage(null);
    setIsForbiddenError(false);
  }

  return (
    <div className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-brand-red selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Top Header & Brand */}
        <div className="flex flex-col items-center text-center">
          <Link
            to="/"
            className="flex items-center gap-2 mb-4 group"
            title="Return to Jocta Storefront"
          >
            <JoctaLogo size="lg" showText={false} />
            <div className="flex flex-col text-left">
              <span className="text-2xl font-extrabold tracking-tight text-ink-charcoal group-hover:text-brand-red transition-colors">
                Jocta Enterprises
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-red">
                Administration Portal
              </span>
            </div>
          </Link>

          <h1 className="text-3xl font-black text-ink-charcoal tracking-tight sm:text-4xl">
            Administrator Sign-In
          </h1>
          <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-md">
            Sign in with an approved Google account to manage products,
            categories, inventory, and printer models.
          </p>
        </div>

        {/* Card Box */}
        <div className="mt-8 bg-surface-white border border-surface-border rounded-neo shadow-neo p-6 sm:p-10">
          {/* Security Banner */}
          <div className="mb-6 flex items-center gap-2.5 rounded-neo-sm bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              Protected route: Administrator authorization is required to access{" "}
              <code className="font-mono font-bold">/admin</code>.
            </span>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className={`mb-6 rounded-neo-sm border p-4 text-sm font-medium space-y-2 ${
                isForbiddenError
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-red-50 border-red-300 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                {isForbiddenError ? (
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-brand-red shrink-0" />
                )}
                <span>
                  {isForbiddenError
                    ? "Unauthorized Google Account (403)"
                    : "Sign-In Failed"}
                </span>
              </div>
              <p className="pl-6 leading-relaxed">{errorMessage}</p>
              {isForbiddenError && (
                <div className="pl-6 pt-1 space-y-2">
                  <p className="text-xs text-amber-800">
                    Sign in below with an authorized administrator Google
                    account, or sign out of your current customer session.
                  </p>
                  {user && !user.isAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleSwitchAccount()}
                      className="neo-button-secondary px-3 py-1.5 text-xs cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out ({user.email})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Google Sign-In Container or Loading */}
          <div className="space-y-4">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
                <span className="text-sm font-bold text-ink-charcoal">
                  Verifying administrator credentials...
                </span>
                <span className="text-sm text-ink-muted">
                  Validating Google identity &amp; session security
                </span>
              </div>
            ) : !googleClientId ? (
              <div className="rounded-neo-sm border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                  Google Client ID Required
                </p>
                <p className="text-sm leading-relaxed">
                  Configure{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">
                    VITE_GOOGLE_CLIENT_ID
                  </code>{" "}
                  and{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">
                    GOOGLE_CLIENT_ID
                  </code>{" "}
                  in your{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">
                    .env
                  </code>{" "}
                  configuration to render Google Sign-In.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  ref={googleButtonRef}
                  className="min-h-[44px] flex items-center justify-center"
                />
                {!gsiLoaded && (
                  <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />
                    <span>Loading Google authentication...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Access Policy Note */}
          <div className="mt-6 pt-5 border-t border-surface-border text-center">
            <p className="text-sm text-ink-muted">
              Only authorized administrator email accounts are granted access to
              the Administration Portal.
            </p>
          </div>
        </div>

        {/* Back to store navigation */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-secondary hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Jocta Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
