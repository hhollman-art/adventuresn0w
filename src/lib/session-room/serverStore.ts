import { randomUUID } from "crypto";
import { createHmac, timingSafeEqual } from "crypto";
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

const ROOM_TTL_MS = 8 * 60 * 60 * 1000;

/** In-memory room registry — swap for Redis/Upstash when scaling relay mode. */
const rooms = new Map<string, SessionRoom>();
const codeIndex = new Map<string, string>();

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

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (Date.parse(room.expiresAt) <= now) {
      rooms.delete(id);
      codeIndex.delete(room.code);
    }
  }
}

export function createSessionRoom(
  dmId: string,
  transport: SessionTransportMode = "relay",
  seedState?: TabletopSession,
): CreateSessionRoomResult {
  purgeExpired();
  let code = generateRoomCode();
  while (codeIndex.has(code)) code = generateRoomCode();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ROOM_TTL_MS);
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
  rooms.set(room.id, room);
  codeIndex.set(code, room.id);
  return { room, joinUrl: `/join?code=${code}` };
}

export function getSessionRoomByCode(code: string): SessionRoom | null {
  purgeExpired();
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(normalized)) return null;
  const roomId = codeIndex.get(normalized);
  if (!roomId) return null;
  return rooms.get(roomId) ?? null;
}

export function joinSessionRoom(
  code: string,
  request: PlayerJoinRequest,
): SessionRoomJoinResult | null {
  const room = getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;

  const character = sanitizeJoinCharacter(request.character);
  const seatId = newId();
  const playerToken = issuePlayerToken(room.id, seatId);

  const players = [...room.masterState.players];
  const existingIdx = players.findIndex((p) => p.id === character.id);
  if (existingIdx >= 0) players[existingIdx] = character;
  else players.push(character);

  room.masterState = {
    ...room.masterState,
    players,
    updatedAt: new Date().toISOString(),
  };
  room.revision += 1;
  room.players.push({
    seatId,
    displayName: request.displayName.trim(),
    joinedAt: new Date().toISOString(),
    characterId: character.id,
    playerToken,
  });

  return {
    seatId,
    playerToken,
    revision: room.revision,
    session: playerVisibleSession(room.masterState),
    transport: room.transport,
  };
}

export function applyRoomMutation(
  code: string,
  seatId: string,
  playerToken: string,
  envelope: MutationEnvelope,
): { revision: number; session: TabletopSession } | null {
  const room = getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;
  if (!verifyPlayerToken(room.id, seatId, playerToken)) return null;
  if (envelope.baseRevision > room.revision) return null;

  const seat = room.players.find((p) => p.seatId === seatId);
  if (!seat) return null;

  const mutation = withSeatContext(envelope.mutation, seatId);
  const result = applyTabletopMutation(room.masterState, mutation);
  if (!result.ok) return null;

  room.masterState = result.session;
  room.revision += 1;
  return {
    revision: room.revision,
    session: playerVisibleSession(room.masterState),
  };
}

export function syncDmMasterState(
  code: string,
  dmId: string,
  state: TabletopSession,
): SessionRoom | null {
  const room = getSessionRoomByCode(code);
  if (!room || room.dmId !== dmId || room.status !== "open") return null;
  room.masterState = state;
  room.revision += 1;
  room.masterState.updatedAt = new Date().toISOString();
  return room;
}

export function getPlayerVisibleState(code: string): {
  revision: number;
  session: TabletopSession;
} | null {
  const room = getSessionRoomByCode(code);
  if (!room || room.status !== "open") return null;
  return { revision: room.revision, session: playerVisibleSession(room.masterState) };
}

function withSeatContext(mutation: TabletopMutation, seatId: string): TabletopMutation {
  if (mutation.type === "DM_STATE_SYNC") return mutation;
  return { ...mutation, seatId } as TabletopMutation;
}

/** Test-only reset */
export function __resetSessionRoomStoreForTests(): void {
  rooms.clear();
  codeIndex.clear();
}
