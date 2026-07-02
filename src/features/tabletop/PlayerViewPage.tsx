"use client";

import { useEffect, useRef, useState } from "react";
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

    // Fallback for when the DM tab hasn't answered yet: show the last saved
    // state (already stripped of DM-only info).
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
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold">Player view</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Waiting for the Dungeon Master&hellip; Keep the Virtual Table open in another tab of
          this browser.
        </p>
      </main>
    );
  }

  const activeEntry = session.initiative.entries[session.initiative.activeIndex] ?? null;

  return (
    <main
      ref={mainRef}
      className="mx-auto flex w-full max-w-[110rem] flex-col gap-3 px-3 pb-4"
      style={{
        height: isFullscreen ? "100vh" : "calc(100vh - 140px)",
        minHeight: 480,
        paddingTop: isFullscreen ? 12 : 0,
        background: isFullscreen ? "var(--bg)" : undefined,
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-bold">Player view</h1>
        {activeEntry && (
          <span
            className="rounded-md px-2 py-1 text-xs font-semibold"
            style={{ background: "rgba(154,116,22,0.15)" }}
          >
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
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
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
                          ? "rgba(201,162,39,0.15)"
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
