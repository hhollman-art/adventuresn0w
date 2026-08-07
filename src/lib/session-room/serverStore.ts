import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { createDefaultSession, newId } from "@/lib/tabletop/session";
import { playerVisibleSession } from "@/lib/tabletop/session";
import type { TabletopSession } from "@/lib/tabletop/types";
import { applyTabletopMutation } from "./events";
import type { MutationEnvelope, TabletopMutation } from "./events";
import { sanitizeJoinCharacter } from "./handshake";
import type { PlayerJoinRequest } from "./handshake";
import { generateRoomCode, isValidRoomCodeFormat, normalizeRoomCode } from "./roomCode";
import type {
  CreateSessionRoomResult,
  SessionRoom,
  SessionRoomJoinResult,
  SessionTransportMode,
} from "./types";
import {
  getSessionStore,
  SESSION_ROOM_TTL_MS,
  __resetSessionStoreForTests,
} from "@/lib/session-room/store";

export { SESSION_ROOM_TTL_MS };

function playerTokenSecret(): string {
  return process.env.DM_AUTH_SECRET?.trim() || "dev-player-token-secret";
}

function issuePlayerToken(roomId: string, seatId: string): string {
  const payload = `${roomId}.${seatId}.${Date.now()}`;
  const sig = createHmac("sha256", playerTokenSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyPlayerToken(roomId: string, seatId: string, token: string): boolean {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const [tokenRoomId, tokenSeatId] = payload.split(".");
  if (tokenRoomId !== roomId || tokenSeatId !== seatId) return false;
  const expected = createHmac("sha256", playerTokenSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function withSeatContext(mutation: TabletopMutation, seatId: string): TabletopMutation {
  if (mutation.type === "DM_STATE_SYNC") return mutation;
  return { ...mutation, seatId } as TabletopMutation;
}

/**
 * Create a new session room for a DM.
 * Persists via SessionStore (Redis/Upstash in prod, memory locally).
 */
export async function createSessionRoom(
  dmId: string,
  transport: SessionTransportMode = "relay",
  seedState?: TabletopSession,
): Promise<CreateSessionRoomResult> {
  const store = getSessionStore();
  let code = "";
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = generateRoomCode();
    if (!isValidRoomCodeFormat(candidate)) continue;
    const existing = await store.getRoom(candidate);
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new Error("Unable to allocate a unique room code.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_ROOM_TTL_MS);
  const room: SessionRoom = {
    id: randomUUID(),
    code,
    dmId,
    status: "open",
    transport,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revision: 1,
    masterState: seedState ?? createDefaultSession(),
    players: [],
  };
  await store.setRoom(code, room);
  return { room: structuredClone(room), joinUrl: `/join?code=${code}` };
}

export async function getSessionRoomByCode(code: string): Promise<SessionRoom | null> {
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(normalized)) return null;
  return getSessionStore().getRoom(normalized);
}

export async function joinSessionRoom(
  code: string,
  request: PlayerJoinRequest,
): Promise<SessionRoomJoinResult | null> {
  const room = await getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;

  const character = sanitizeJoinCharacter(request.character);
  const seatId = newId();
  const playerToken = issuePlayerToken(room.id, seatId);

  const players = [...room.masterState.players];
  const existingIdx = players.findIndex((p) => p.id === character.id);
  if (existingIdx >= 0) players[existingIdx] = character;
  else players.push(character);

  const masterState: TabletopSession = {
    ...room.masterState,
    players,
    updatedAt: new Date().toISOString(),
  };
  const revision = room.revision + 1;
  const roomPlayers = [
    ...room.players,
    {
      seatId,
      displayName: request.displayName.trim(),
      joinedAt: new Date().toISOString(),
      characterId: character.id,
      playerToken,
    },
  ];

  const updated = await getSessionStore().updateRoom(room.code, {
    masterState,
    revision,
    players: roomPlayers,
  });
  if (!updated) return null;

  return {
    seatId,
    playerToken,
    revision: updated.revision,
    session: playerVisibleSession(updated.masterState),
    transport: updated.transport,
  };
}

export async function applyRoomMutation(
  code: string,
  seatId: string,
  playerToken: string,
  envelope: MutationEnvelope,
): Promise<{ revision: number; session: TabletopSession } | null> {
  const room = await getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;
  if (!verifyPlayerToken(room.id, seatId, playerToken)) return null;
  if (envelope.baseRevision > room.revision) return null;

  const seat = room.players.find((p) => p.seatId === seatId);
  if (!seat) return null;

  const mutation = withSeatContext(envelope.mutation, seatId);
  const result = applyTabletopMutation(room.masterState, mutation);
  if (!result.ok) return null;

  const revision = room.revision + 1;
  const updated = await getSessionStore().updateRoom(room.code, {
    masterState: result.session,
    revision,
  });
  if (!updated) return null;

  return {
    revision: updated.revision,
    session: playerVisibleSession(updated.masterState),
  };
}

export async function syncDmMasterState(
  code: string,
  dmId: string,
  state: TabletopSession,
): Promise<SessionRoom | null> {
  const room = await getSessionRoomByCode(code);
  if (!room || room.dmId !== dmId || room.status !== "open") return null;

  const masterState: TabletopSession = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  return getSessionStore().updateRoom(room.code, {
    masterState,
    revision: room.revision + 1,
  });
}

export async function getPlayerVisibleState(code: string): Promise<{
  revision: number;
  session: TabletopSession;
} | null> {
  const room = await getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;
  return { revision: room.revision, session: playerVisibleSession(room.masterState) };
}

/** Test-only: reset the underlying SessionStore singleton to a fresh memory store. */
export function __resetSessionRoomStoreForTests(): void {
  __resetSessionStoreForTests();
}
