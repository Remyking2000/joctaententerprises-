import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AdminUser } from "@jocta/shared";
import { adminApi, ApiClientError } from "../lib/api";

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: (credential: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<AdminUser | null>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const checkAuth = useCallback(async (): Promise<AdminUser | null> => {
    try {
      const data = await adminApi.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<AdminUser> => {
      setError(null);
      try {
        const data = await adminApi.loginWithGoogle(credential);
        setUser(data.user);
        return data.user;
      } catch (err) {
        let msg = "Failed to sign in with Google.";
        if (err instanceof ApiClientError) {
          msg = err.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
        checkAuth,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
