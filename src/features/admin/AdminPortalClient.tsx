"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminUiPanel from "@/features/admin/AdminUiPanel";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/auth/tiers";

export default function AdminPortalClient() {
  const router = useRouter();
  const { loading, session, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !session || !isAdmin(session.dm))) {
      router.replace("/login?returnTo=/admin");
    }
  }, [loading, isAuthenticated, session, router]);

  if (loading) {
    return (
      <main className="app-main mx-auto max-w-3xl px-4 py-16 text-center text-sm text-[var(--muted)]">
        Loading admin portal…
      </main>
    );
  }

  if (!session || !isAdmin(session.dm)) return null;

  return (
    <main className="app-main mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <nav className="text-xs text-[var(--muted)]">
        <Link href="/dashboard" className="underline hover:text-[var(--text)]">
          ← Dashboard
        </Link>
      </nav>
      <AdminUiPanel />
    </main>
  );
}
