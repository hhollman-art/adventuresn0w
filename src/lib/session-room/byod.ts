import type { ByodCharacterPayload } from "./types";
import { byodPayloadSchema } from "./handshake";

const BYOD_STORAGE_KEY = "ddeasy-byod-character-v1";
const CLIENT_ID_KEY = "ddeasy-player-client-id-v1";

/** Persist BYOD character JSON in tablet browser storage. */
export function saveByodCharacter(payload: ByodCharacterPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BYOD_STORAGE_KEY, JSON.stringify(payload));
}

export function loadByodCharacter(): ByodCharacterPayload | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BYOD_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = byodPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearByodCharacter(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BYOD_STORAGE_KEY);
}

/** Stable tablet id for seat reconnection across refreshes. */
export function getOrCreatePlayerClientId(): string {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

export const PLAYER_SESSION_STORAGE_KEY = "ddeasy-player-session-v1";

export type StoredPlayerSession = {
  roomCode: string;
  seatId: string;
  playerToken: string;
  revision: number;
};

export function savePlayerSession(session: StoredPlayerSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PLAYER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadPlayerSession(): StoredPlayerSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PLAYER_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlayerSession;
  } catch {
    return null;
  }
}
