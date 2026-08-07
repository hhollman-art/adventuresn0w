import type { SessionRoom } from "@/lib/session-room/types";

/**
 * Pluggable persistence for SessionRoom relay state.
 * Implementations must be safe across serverless instances (no process-local maps in prod).
 */
export interface SessionStore {
  /** Load a room by join code (normalized uppercase). */
  getRoom(code: string): Promise<SessionRoom | null>;
  /** Create or replace a room document. Refreshes TTL from `expiresAt` when supported. */
  setRoom(code: string, data: SessionRoom): Promise<void>;
  /**
   * Shallow-merge top-level fields onto an existing room and persist.
   * Returns null when the room is missing or expired.
   */
  updateRoom(code: string, partialData: Partial<SessionRoom>): Promise<SessionRoom | null>;
  /** Remove a room (and any secondary indexes). */
  deleteRoom(code: string): Promise<void>;
}

export const SESSION_ROOM_TTL_MS = 8 * 60 * 60 * 1000;
export const SESSION_ROOM_TTL_SECONDS = Math.floor(SESSION_ROOM_TTL_MS / 1000);

export function sessionRoomRedisKey(code: string): string {
  return `ddeasy:session-room:${code.trim().toUpperCase()}`;
}

/** Drop rooms whose expiresAt is in the past. */
export function isSessionRoomExpired(room: SessionRoom, nowMs = Date.now()): boolean {
  const expires = Date.parse(room.expiresAt);
  return !Number.isFinite(expires) || expires <= nowMs;
}

export function ttlSecondsForRoom(room: SessionRoom, nowMs = Date.now()): number {
  const expires = Date.parse(room.expiresAt);
  if (!Number.isFinite(expires)) return SESSION_ROOM_TTL_SECONDS;
  const remaining = Math.ceil((expires - nowMs) / 1000);
  return Math.max(1, Math.min(SESSION_ROOM_TTL_SECONDS, remaining));
}
