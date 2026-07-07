"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  clearDmActiveRoom,
  loadDmActiveRoom,
  saveDmActiveRoom,
  type DmActiveRoom,
} from "@/lib/session-room/dmHost";

type AuthStatus =
  | { kind: "loading" }
  | { kind: "disabled" }
  | { kind: "unauthenticated" }
  | { kind: "authenticated"; username: string };

type SessionRoomHostPanelProps = {
  onRoomChange: (room: DmActiveRoom | null) => void;
};

/** Compact DM session-room controls — create room code for tablet players. */
export default function SessionRoomHostPanel({ onRoomChange }: SessionRoomHostPanelProps) {
  const [auth, setAuth] = useState<AuthStatus>({ kind: "loading" });
  const [room, setRoom] = useState<DmActiveRoom | null>(() => loadDmActiveRoom());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; hostingEnabled?: boolean; session?: { dm: { username: string } } }) => {
        if (cancelled) return;
        if (!data.hostingEnabled) {
          setAuth({ kind: "disabled" });
          return;
        }
        if (!data.authenticated) {
          setAuth({ kind: "unauthenticated" });
          return;
        }
        setAuth({ kind: "authenticated", username: data.session?.dm.username ?? "DM" });
      })
      .catch(() => {
        if (!cancelled) setAuth({ kind: "disabled" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createRoom = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/session-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transport: "relay" }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        joinUrl?: string;
        transport?: "local" | "relay";
        expiresAt?: string;
      };
      if (!res.ok || !data.code || !data.joinUrl || !data.expiresAt) {
        setError(data.error ?? "Could not create session room.");
        return;
      }
      const next: DmActiveRoom = {
        code: data.code,
        transport: data.transport ?? "relay",
        joinUrl: data.joinUrl,
        expiresAt: data.expiresAt,
      };
      saveDmActiveRoom(next);
      setRoom(next);
      onRoomChange(next);
    } catch {
      setError("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }, [onRoomChange]);

  const endRoom = useCallback(() => {
    clearDmActiveRoom();
    setRoom(null);
    onRoomChange(null);
  }, [onRoomChange]);

  const copyJoinLink = useCallback(async () => {
    if (!room) return;
    const url = `${window.location.origin}${room.joinUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }, [room]);

  if (auth.kind === "loading") {
    return (
      <section className="vtt-session-room" aria-label="Session room">
        <p className="text-xs text-[var(--muted)]">Checking hosting…</p>
      </section>
    );
  }

  if (auth.kind === "disabled") {
    return (
      <section className="vtt-session-room" aria-label="Session room">
        <p className="vtt-control-sidebar-section-label">Session room</p>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Hosting not configured. Use <strong>Open player view</strong> for same-browser play, or
          set <code className="text-[10px]">DM_AUTH_*</code> env vars to enable room codes.
        </p>
      </section>
    );
  }

  if (auth.kind === "unauthenticated") {
    return (
      <section className="vtt-session-room" aria-label="Session room">
        <p className="vtt-control-sidebar-section-label">Session room</p>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Sign in to host tablets over Wi-Fi or online.
        </p>
        <Link href="/login" className="btn btn-sm btn-accent w-full">
          DM sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="vtt-session-room" aria-label="Session room">
      <p className="vtt-control-sidebar-section-label">Session room</p>
      {room ? (
        <div className="flex flex-col gap-2">
          <div
            className="rounded-md border px-3 py-2 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-elevated)" }}
          >
            <p className="text-[10px] font-bold tracking-wide uppercase text-[var(--muted)]">
              Room code
            </p>
            <p className="font-display text-2xl font-bold tracking-[0.2em]">{room.code}</p>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Tablets join at{" "}
            <Link href={room.joinUrl} className="underline">
              /join
            </Link>{" "}
            — no account needed.
          </p>
          <button type="button" className="btn btn-sm w-full" onClick={() => void copyJoinLink()}>
            {copied ? "Link copied!" : "Copy join link"}
          </button>
          <button type="button" className="btn btn-sm w-full" onClick={endRoom}>
            End session room
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Create a room code so tablets on Wi-Fi or online can join this table.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-accent w-full"
            disabled={creating}
            onClick={() => void createRoom()}
          >
            {creating ? "Creating…" : "Create room code"}
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
