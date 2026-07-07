"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DmAuthSession, UserTier } from "@/lib/auth/types";
import { canAccessPremiumFeature } from "@/lib/auth/tiers";

type AuthContextValue = {
  session: DmAuthSession | null;
  loading: boolean;
  authEnabled: boolean;
  isAuthenticated: boolean;
  tier: UserTier;
  email: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Premium feature gate — delegates to {@link canAccessPremiumFeature}.
   * When billing ships, swap the server-side check in `canAccessPremiumFeature`
   * without changing call sites in UI components.
   */
  canAccessPremium: () => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DmAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = (await res.json()) as {
        authenticated?: boolean;
        authEnabled?: boolean;
        session?: DmAuthSession;
      };
      setAuthEnabled(data.authEnabled !== false);
      setSession(data.authenticated && data.session ? data.session : null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const tier = session?.dm.tier ?? "free";
    return {
      session,
      loading,
      authEnabled,
      isAuthenticated: Boolean(session),
      tier,
      email: session?.dm.email ?? null,
      refresh,
      logout,
      canAccessPremium: () =>
        session ? canAccessPremiumFeature(session.dm) : false,
    };
  }, [session, loading, authEnabled, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
