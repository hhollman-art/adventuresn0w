"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BattleStage from "@/features/tabletop/BattleStage";
import { playerVisibleSession } from "@/lib/tabletop/session";
import { loadTabletopSession } from "@/lib/tabletop/store";
import { createPlayerSync } from "@/lib/tabletop/sync";
import type { TabletopSession } from "@/lib/tabletop/types";
import { useFullscreen } from "@/features/tabletop/useFullscreen";

export default function PlayerViewPage() {
  const [session, setSession] = useState<TabletopSession | null>(null);
  const [connected, setConnected] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  useEffect(() => {
    let cancelled = false;

    void loadTabletopSession().then((stored) => {
      if (!cancelled && stored) {
        setSession((current) => current ?? playerVisibleSession(stored));
      }
    });

    const sync = createPlayerSync((incoming) => {
      if (cancelled) return;
      setSession(incoming);
      setConnected(true);
    });

    return () => {
      cancelled = true;
      sync.close();
    };
  }, []);

  if (!session) {
    return (
      <main className="app-main app-main--table mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="zone-badge mb-3">Virtual Table</p>
        <h1 className="font-display text-xl font-bold">Player view</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Waiting for the Dungeon Master&hellip; Keep the Virtual Table open in another tab of
          this browser.
        </p>
        <Link href="/table" className="btn btn-accent btn-sm mt-4 inline-flex">
          Open DM view
        </Link>
      </main>
    );
  }

  const activeEntry = session.initiative.entries[session.initiative.activeIndex] ?? null;

  return (
    <main
      ref={mainRef}
      className="app-main app-main--table mx-auto flex w-full flex-1 flex-col gap-3 px-3 py-3 min-h-0"
      style={{
        height: isFullscreen ? "100dvh" : undefined,
        paddingTop: isFullscreen ? 12 : undefined,
        background: isFullscreen ? "var(--bg)" : undefined,
      }}
    >
      <div className="zone-toolbar">
        <h1 className="zone-toolbar-title">Player view</h1>
        <span className="zone-badge">Player screen</span>
        {activeEntry && (
          <span className="zone-badge" style={{ textTransform: "none", letterSpacing: "0.02em" }}>
            Round {session.initiative.round}: {activeEntry.name}&rsquo;s turn
          </span>
        )}
        <span className="flex-1" />
        <span className="text-xs text-[var(--muted)]">
          {connected ? "Live — mirroring the DM's table" : "Showing last saved state"}
        </span>
        <button
          type="button"
          onClick={() => toggleFullscreen(mainRef.current)}
          className="btn btn-sm"
          title={isFullscreen ? "Leave full screen" : "Fill the whole screen for play"}
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <BattleStage session={session} mode="player" />
        </div>

        <aside
          className="fantasy-panel hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border p-3 md:flex"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div>
            <p className="mb-1 text-xs font-bold tracking-wide uppercase">Initiative</p>
            {session.initiative.entries.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">Not in combat.</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {session.initiative.entries.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                    style={{
                      borderColor:
                        i === session.initiative.activeIndex ? "var(--accent)" : "var(--border)",
                      background:
                        i === session.initiative.activeIndex
                          ? "var(--accent-muted)"
                          : "transparent",
                    }}
                  >
                    <span className="w-6 shrink-0 text-right font-bold">{e.roll}</span>
                    <span className="truncate">{e.name}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-bold tracking-wide uppercase">Dice rolls</p>
            {session.log.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No rolls yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {session.log.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{e.expression}</span>
                      <span className="font-display text-sm font-bold">{e.total}</span>
                    </div>
                    <p className="text-[var(--muted)]">{e.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
