export type {
  SessionRoom,
  SessionRoomPlayer,
  SessionRoomStatus,
  SessionTransportMode,
  CreateSessionRoomResult,
  SessionRoomJoinResult,
  ByodCharacterPayload,
} from "./types";

export {
  generateRoomCode,
  normalizeRoomCode,
  isValidRoomCodeFormat,
  ROOM_CODE_MIN_LEN,
  ROOM_CODE_MAX_LEN,
  ROOM_CODE_DEFAULT_LEN,
} from "./roomCode";

export {
  playerJoinRequestSchema,
  byodPayloadSchema,
  playerCharacterSchema,
  sanitizeJoinCharacter,
  buildJoinHandshakeResponse,
  type PlayerJoinRequest,
} from "./handshake";

export type {
  TabletopMutation,
  MutationEnvelope,
  PlayerRollMutation,
  PlayerHpDeltaMutation,
  PlayerCastSpellMutation,
  PlayerUpdateNotesMutation,
  DmFullStateSyncMutation,
  MutationApplyResult,
} from "./events";
export { applyTabletopMutation } from "./events";

export {
  saveByodCharacter,
  loadByodCharacter,
  clearByodCharacter,
  getOrCreatePlayerClientId,
  savePlayerSession,
  loadPlayerSession,
  PLAYER_SESSION_STORAGE_KEY,
  type StoredPlayerSession,
} from "./byod";
