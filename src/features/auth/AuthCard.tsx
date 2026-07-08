"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthField from "@/features/auth/AuthField";
import { useAuthForm } from "@/features/auth/useAuthForm";
import { useAuth } from "@/contexts/AuthContext";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

function AuthCardContent({ preset }: { preset?: { email: string; password: string } | null }) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { refresh } = useAuth();

  const {
    mode,
    switchMode,
    email,
    setEmail,
    password,
    setPassword,
    fieldErrors,
    formError,
    loading,
    touched,
    submit,
    onBlurEmail,
    onBlurPassword,
  } = useAuthForm({
    returnTo,
    preset,
    onSuccess: () => {
      void refresh();
    },
  });

  return (
    <div className="auth-card">
      <header className="auth-card-header">
        <p className="auth-card-badge">Dungeon Master</p>
        <h1 className="auth-card-title font-display">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="auth-card-subtitle">
          {mode === "sign-in"
            ? "Sign in to manage campaigns, host sessions, and run your table."
            : "Free during early access — premium tiers unlock advanced hosting later."}
        </p>
      </header>

      <div className="auth-card-tabs" role="tablist" aria-label="Authentication mode">
        <FantasyTooltipWrap label="Sign in" hint="Use your existing DM account">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-in"}
            className={`auth-card-tab ${mode === "sign-in" ? "auth-card-tab--active" : ""}`}
            onClick={() => switchMode("sign-in")}
          >
            Sign in
          </button>
        </FantasyTooltipWrap>
        <FantasyTooltipWrap label="Create account" hint="Register a free DM account during early access">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "sign-up"}
            className={`auth-card-tab ${mode === "sign-up" ? "auth-card-tab--active" : ""}`}
            onClick={() => switchMode("sign-up")}
          >
            Create account
          </button>
        </FantasyTooltipWrap>
      </div>

      <form
        className="auth-card-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <AuthField
          id="auth-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={onBlurEmail}
          error={fieldErrors.email}
          showError={touched.email}
          placeholder="you@example.com"
          required
        />

        <AuthField
          id="auth-password"
          label="Password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={onBlurPassword}
          error={fieldErrors.password}
          showError={touched.password}
          placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
          required
        />

        {mode === "sign-in" ? (
          <div className="auth-card-forgot">
            <a href="#" className="auth-card-forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>
        ) : null}

        {formError ? (
          <p className="auth-card-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <FantasyTooltipWrap
          label={mode === "sign-in" ? "Sign in" : "Create account"}
          hint={
            mode === "sign-in"
              ? "Access campaigns, hosting, and your dashboard"
              : "Start with a free account — premium tiers come later"
          }
          block
        >
          <button type="submit" className="btn btn-accent auth-card-submit" disabled={loading}>
            {loading
              ? mode === "sign-in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </FantasyTooltipWrap>
      </form>

      <footer className="auth-card-footer">
        <p className="auth-card-footer-note">
          Players join with a room code —{" "}
          <Link href="/join" className="auth-card-inline-link">
            no account needed
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

/**
 * Unified sign-in / sign-up card for the DMMS auth gateway.
 *
 * **Premium subscription integration (future phase):**
 * 1. After `useAuthForm` succeeds, call `refresh()` from {@link useAuth} and inspect `tier`.
 * 2. If the user requested a premium route, invoke `canAccessPremium("forge-unlimited")`
 *    and redirect to `/pricing?returnTo=…` when false.
 * 3. Wire Stripe Customer Portal webhooks to update `account.tier` server-side before
 *    issuing the session cookie on next login.
 */
export default function AuthCard({
  preset = null,
}: {
  preset?: { email: string; password: string } | null;
}) {
  return (
    <Suspense
      fallback={
        <div className="auth-card p-8 text-center text-sm text-[var(--muted)]">Loading…</div>
      }
    >
      <AuthCardContent preset={preset} />
    </Suspense>
  );
}
