"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { APP_ICONS } from "@/lib/ui/appIcons";

type HearthAuthNavProps = {
  /** Larger button styling for the welcome hearth hero. */
  variant?: "header" | "hero";
  className?: string;
};

/**
 * Hearth / site-header entry point for DM sign-in.
 * Shows account status when authenticated; otherwise routes to `/login`.
 */
export default function HearthAuthNav({ variant = "header", className = "" }: HearthAuthNavProps) {
  const pathname = usePathname() ?? "/";
  const { loading, authEnabled, isAuthenticated, session, tier } = useAuth();

  if (!authEnabled) return null;

  const returnTo = pathname.startsWith("/login") ? "/" : pathname;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  if (loading) {
    return (
      <span
        className={`hearth-auth-nav hearth-auth-nav--${variant} hearth-auth-nav--loading ${className}`.trim()}
        aria-hidden="true"
      />
    );
  }

  if (isAuthenticated && session) {
    return (
      <Link
        href="/dashboard"
        className={`hearth-auth-nav hearth-auth-nav--${variant} hearth-auth-nav--signed-in ${className}`.trim()}
      >
        <span className="hearth-auth-nav-icon" aria-hidden="true">
          {APP_ICONS.account}
        </span>
        <span className="hearth-auth-nav-label">{session.dm.username}</span>
        <span className="hearth-auth-nav-tier auth-tier-badge">{tier}</span>
      </Link>
    );
  }

  return (
    <Link
      href={loginHref}
      className={`hearth-auth-nav hearth-auth-nav--${variant} hearth-auth-nav--sign-in ${className}`.trim()}
    >
      <span className="hearth-auth-nav-icon" aria-hidden="true">
        {APP_ICONS.signIn}
      </span>
      <span className="hearth-auth-nav-label">Sign in</span>
    </Link>
  );
}
