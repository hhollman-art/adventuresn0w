import type { TabletopSession } from "@/lib/tabletop/types";
import type { PlayerCharacter } from "@/lib/tabletop/types";

/** How tablets reach the DM host: same LAN or cloud relay. */
export type SessionTransportMode = "local" | "relay";

export type SessionRoomStatus = "open" | "closed" | "expired";

/**
 * Server-hosted session room — authenticated DM owns the master encounter state.
 * Players join via room code only; no accounts.
 */
export type SessionRoom = {
  id: string;
  code: string;
  dmId: string;
  status: SessionRoomStatus;
  transport: SessionTransportMode;
  createdAt: string;
  expiresAt: string;
  /** Monotonic revision for optimistic mutation ordering. */
  revision: number;
  /** DM-owned master state (full TabletopSession). */
  masterState: TabletopSession;
  players: SessionRoomPlayer[];
};

/** Unauthenticated player seat after a successful join handshake. */
export type SessionRoomPlayer = {
  seatId: string;
  displayName: string;
  joinedAt: string;
  characterId: string;
  /** Short-lived bearer token authorizing mutation events for this seat. */
  playerToken: string;
};

export type CreateSessionRoomResult = {
  room: SessionRoom;
  joinUrl: string;
};

export type SessionRoomJoinResult = {
  seatId: string;
  playerToken: string;
  revision: number;
  /** Player-safe projection of master state. */
  session: TabletopSession;
  transport: SessionTransportMode;
};

export type ByodCharacterPayload = {
  version: 1;
  savedAt: string;
  character: PlayerCharacter;
};
