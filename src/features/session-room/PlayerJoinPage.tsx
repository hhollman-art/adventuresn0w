"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import {
  getOrCreatePlayerClientId,
  loadByodCharacter,
  normalizeRoomCode,
  saveByodCharacter,
  savePlayerSession,
} from "@/lib/session-room";

function defaultByodCharacter(displayName: string): PlayerCharacter {
  return {
    id: `byod-${Date.now()}`,
    name: displayName,
    playerName: displayName,
    species: "",
    className: "",
    subclass: "",
    background: "",
    alignment: "",
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ac: 10,
    maxHp: 10,
    speed: 30,
    notes: "",
    items: [],
    knownSpellIds: [],
    currentHp: null,
    tokenId: null,
  };
}

/** Mobile-responsive player join — room code + BYOD character JSON. */
export default function PlayerJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("code");
    if (fromQuery) setRoomCode(normalizeRoomCode(fromQuery));
    const stored = loadByodCharacter();
    if (stored?.character.playerName) setDisplayName(stored.character.playerName);
    else if (stored?.character.name) setDisplayName(stored.character.name);
  }, [searchParams]);

  const joinRoom = useCallback(async () => {
    const code = normalizeRoomCode(roomCode);
    const name = displayName.trim();
    if (!code || !name) {
      setStatus("Enter a room code and your name.");
      return;
    }

    setJoining(true);
    setStatus(null);
    const stored = loadByodCharacter();
    const character = stored?.character ?? defaultByodCharacter(name);
    character.playerName = name;
    if (!character.name.trim()) character.name = name;

    saveByodCharacter({
      version: 1,
      savedAt: new Date().toISOString(),
      character,
    });

    try {
      const res = await fetch(`/api/session-room/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          character,
          clientId: getOrCreatePlayerClientId(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        seatId?: string;
        playerToken?: string;
        revision?: number;
      };
      if (!res.ok || !data.seatId || !data.playerToken || data.revision == null) {
        setStatus(data.error ?? "Could not join room.");
        return;
      }

      savePlayerSession({
        roomCode: code,
        seatId: data.seatId,
        playerToken: data.playerToken,
        revision: data.revision,
      });
      router.push(`/table/player?room=${code}`);
    } catch {
      setStatus("Network error — check Wi-Fi and try again.");
    } finally {
      setJoining(false);
    }
  }, [displayName, roomCode, router]);

  return (
    <main className="app-main mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <p className="zone-badge w-fit">Player tablet</p>
      <h1 className="font-display text-2xl font-bold text-[var(--text)]">Join session</h1>
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Enter the room code from your DM. Your character sheet stays on this tablet — no account
        required.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[var(--text)]">Room code</span>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={6}
          value={roomCode}
          onChange={(e) => setRoomCode(normalizeRoomCode(e.target.value))}
          placeholder="e.g. K7M3P"
          className="rounded-md border px-3 py-3 text-center text-lg font-bold tracking-widest"
          style={{ borderColor: "var(--border)" }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-[var(--text)]">Your name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-md border px-3 py-2"
          style={{ borderColor: "var(--border)" }}
          required
        />
      </label>

      {status ? (
        <p className="rounded-md border px-3 py-2 text-sm" role="status">
          {status}
        </p>
      ) : null}

      <button type="button" className="btn btn-accent w-full" disabled={joining} onClick={() => void joinRoom()}>
        {joining ? "Joining…" : "Join table"}
      </button>

      <p className="text-center text-xs text-[var(--muted)]">
        DM? <Link href="/login" className="underline">Sign in here</Link>
      </p>
    </main>
  );
}
