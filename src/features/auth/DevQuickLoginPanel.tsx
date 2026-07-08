"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { UserTier } from "@/lib/auth/types";

type SandboxAccountSummary = {
  email: string;
  tier: UserTier;
  label: string;
  description: string;
};

type DevQuickLoginPanelProps = {
  onApplyCredentials?: (email: string, password: string) => void;
};

/**
 * Local-dev only quick login for alpha testers.
 * Stripped from production builds via `NODE_ENV` checks and 404 API routes.
 */
export default function DevQuickLoginPanel({ onApplyCredentials }: DevQuickLoginPanelProps) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [accounts, setAccounts] = useState<SandboxAccountSummary[]>([]);
  const [sandboxPassword, setSandboxPassword] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    void fetch("/api/auth/sandbox")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { accounts?: SandboxAccountSummary[]; passwordHint?: string } | null) => {
        if (Array.isArray(data?.accounts)) {
          setAccounts(data.accounts);
        }
        if (data?.passwordHint) {
          setSandboxPassword(data.passwordHint);
        }
      })
      .catch(() => {});
  }, []);

  if (process.env.NODE_ENV !== "development" || accounts.length === 0) {
    return null;
  }

  const quickLogin = async (email: string) => {
    setLoadingEmail(email);
    setError(null);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnTo: returnTo ?? undefined }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error ?? "Dev quick login failed.");
        return;
      }
      window.location.href = data.redirectTo ?? "/dashboard";
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoadingEmail(null);
    }
  };

  return (
    <aside className="dev-quick-login" aria-label="Development quick login">
      <header className="dev-quick-login-header">
        <p className="dev-quick-login-badge">Dev only</p>
        <h2 className="dev-quick-login-title">Quick login</h2>
        <p className="dev-quick-login-subtitle">
          One-click sandbox accounts for local alpha testing. Not included in production builds.
        </p>
      </header>

      <ul className="dev-quick-login-list">
        {accounts.map((account) => (
          <li key={account.email} className="dev-quick-login-item">
            <div className="dev-quick-login-item-copy">
              <p className="dev-quick-login-item-label">{account.label}</p>
              <p className="dev-quick-login-item-email">{account.email}</p>
              <p className="dev-quick-login-item-desc">{account.description}</p>
            </div>
            <div className="dev-quick-login-item-actions">
              <span className="dev-quick-login-tier auth-tier-badge">{account.tier}</span>
              {onApplyCredentials && sandboxPassword ? (
                <button
                  type="button"
                  className="dev-quick-login-fill"
                  onClick={() => onApplyCredentials(account.email, sandboxPassword)}
                >
                  Fill form
                </button>
              ) : null}
              <button
                type="button"
                className="dev-quick-login-btn"
                disabled={loadingEmail !== null}
                onClick={() => void quickLogin(account.email)}
              >
                {loadingEmail === account.email ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {sandboxPassword ? (
        <p className="dev-quick-login-password-hint">
          Manual login password for all sandbox accounts:{" "}
          <code className="dev-quick-login-code">{sandboxPassword}</code>
        </p>
      ) : null}

      {error ? (
        <p className="dev-quick-login-error" role="alert">
          {error}
        </p>
      ) : null}
    </aside>
  );
}
