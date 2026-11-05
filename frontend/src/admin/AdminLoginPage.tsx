import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Loader2,
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
  const { user, loading: authLoading, loginWithGoogle } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbiddenError, setIsForbiddenError] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const googleClientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

  const fromLocation =
    (location.state as { from?: { pathname: string } } | undefined)?.from
      ?.pathname || "/admin";

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate(fromLocation, { replace: true });
    }
  }, [user, authLoading, navigate, fromLocation]);

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
            await loginWithGoogle(response.credential);
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
              Secure server-verified authentication enabled with Google
              Identity Services.
            </span>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className={`mb-6 rounded-neo-sm border p-4 text-sm font-medium space-y-1 ${
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
                    ? "Unauthorized Google Account"
                    : "Sign-In Failed"}
                </span>
              </div>
              <p className="pl-6 leading-relaxed">{errorMessage}</p>
              {isForbiddenError && (
                <p className="pl-6 text-sm text-amber-800 pt-1">
                  If you require administrator access, request that your Google
                  email be added to the server's administrator allowlist.
                </p>
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
                  Configure <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> and{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> in your{" "}
                  <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">.env</code> configuration to render Google Sign-In.
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
              Only authorized email accounts (including{" "}
              <span className="font-mono font-semibold text-ink-charcoal">
                ycremy2000@gmail.com
              </span>
              ) are granted administrative privileges.
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
