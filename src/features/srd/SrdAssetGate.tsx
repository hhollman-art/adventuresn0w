"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ensureSrdAssets, isSrdAssetsReady, subscribeSrdAssets } from "@/lib/srd/srdAssets";

/** Reactive "are the SRD tables loaded?" flag. Server snapshot is always false. */
export function useSrdAssetsReady(): boolean {
  return useSyncExternalStore(subscribeSrdAssets, isSrdAssetsReady, () => false);
}

type SrdAssetGateProps = {
  children: ReactNode;
};

/**
 * Loads the SRD Asset tables once per page load and holds the App shell until
 * they are in memory. Every synchronous SRD accessor below this component is
 * guaranteed to see data, which is what the pre-eviction bundled modules
 * guaranteed implicitly.
 *
 * On the server and during hydration this renders the placeholder (the cache
 * is empty there), so server and client markup always agree.
 */
export default function SrdAssetGate({ children }: SrdAssetGateProps) {
  const ready = useSrdAssetsReady();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    setError(null);
    ensureSrdAssets().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (ready) return <>{children}</>;

  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <p className="text-sm text-[var(--text)]">
          The included rules could not be loaded, so the app cannot open yet.
        </p>
        <p className="text-xs text-[var(--muted)]">
          Check your connection, then try again. ({error})
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:opacity-80"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-[var(--muted)]"
    >
      Opening the rulebooks…
    </div>
  );
}
