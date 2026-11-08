import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

/**
 * Route guard that protects `/admin` and `/inventory` routes.
 * Requires a server-verified session with `user.isAdmin === true`.
 * Unauthenticated or non-admin users are redirected to `/admin/login`.
 */
export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, loading, checkAuth } = useAdminAuth();
  const [verifying, setVerifying] = useState(true);
  const location = useLocation();

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
    // Verify once when the protected area is entered. Re-checking on every
    // navigation flashed a full-page spinner and remounted the whole panel.
  }, [checkAuth]);

  if ((loading || verifying) && !user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen bg-canvas-ivory text-ink-charcoal flex flex-col items-center justify-center p-4"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-brand-red animate-spin" />
          <p className="text-xs font-bold text-ink-charcoal uppercase tracking-wider">
            Verifying Administrator Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location,
          unauthorizedEmail: user && !user.isAdmin ? user.email : undefined,
        }}
        replace
      />
    );
  }

  return <>{children}</>;
}
