"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import DmDashboardPanel from "@/features/home/DmDashboardPanel";
import AdminAnnouncementBanner from "@/features/admin/AdminAnnouncementBanner";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/auth/tiers";
import type { QuickCreateAction } from "@/lib/workshop/dmDashboard";

export default function DashboardPageClient() {
  const router = useRouter();
  const { loading, isAuthenticated, session, tier, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?returnTo=/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const onQuickCreate = (action: QuickCreateAction) => {
    router.push(`/library?quickCreate=${action}`);
  };

  if (loading) {
    return (
      <main className="auth-page-shell flex flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-[var(--muted)]">Loading your dashboard…</p>
      </main>
    );
  }

  if (!isAuthenticated || !session) return null;

  return (
    <main className="app-main mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge w-fit">Dashboard</p>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">
            Welcome, {session.dm.username}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Signed in as {session.dm.email}
            {" · "}
            <span className="auth-tier-badge">{tier}</span> tier
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FantasyTooltipWrap label="Fantasy Forge" hint="Open the workshop to create and browse your prep">
            <Link href="/library" className="btn btn-accent btn-sm">
              Fantasy Forge
            </Link>
          </FantasyTooltipWrap>
          <FantasyTooltipWrap label="Virtual Table" hint="Run combat, fog, tokens, and dice at the table">
            <Link href="/table" className="btn btn-sm">
              Virtual Table
            </Link>
          </FantasyTooltipWrap>
          {isAdmin(session.dm) ? (
            <FantasyTooltipWrap label="Admin UI" hint="Configure site-wide banners and admin settings">
              <Link href="/admin" className="btn btn-sm">
                Admin UI
              </Link>
            </FantasyTooltipWrap>
          ) : null}
          <FantasyTooltipWrap label="Sign out" hint="End your DM session on this device">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void logout()}>
              Sign out
            </button>
          </FantasyTooltipWrap>
        </div>
      </header>

      <AdminAnnouncementBanner />

      <DmDashboardPanel onQuickCreate={onQuickCreate} />
    </main>
  );
}
