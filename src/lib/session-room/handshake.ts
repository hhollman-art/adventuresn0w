import { z } from "zod";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import type { SessionRoomJoinResult } from "./types";

const abilityScoresSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
});

const itemBonusesSchema = z.object({
  ac: z.number(),
  maxHp: z.number(),
  speed: z.number(),
  initiative: z.number(),
  passivePerception: z.number(),
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
});

const characterItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string(),
  bonuses: itemBonusesSchema,
});

/** BYOD character sheet — same shape as Tavern `PlayerCharacter`. */
export const playerCharacterSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  playerName: z.string(),
  species: z.string(),
  className: z.string(),
  subclass: z.string(),
  background: z.string(),
  alignment: z.string(),
  level: z.number().int().min(1).max(30),
  abilities: abilityScoresSchema,
  ac: z.number(),
  maxHp: z.number(),
  speed: z.number(),
  notes: z.string(),
  items: z.array(characterItemSchema),
  knownSpellIds: z.array(z.string()),
  currentHp: z.number().nullable(),
  tokenId: z.string().nullable(),
});

export const byodPayloadSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  character: playerCharacterSchema,
});

export const playerJoinRequestSchema = z.object({
  displayName: z.string().min(1).max(64),
  /** Tablet-local BYOD JSON — pushed into the DM session on join. */
  character: playerCharacterSchema,
  /** Stable per-tablet id (localStorage) to reconnect the same seat. */
  clientId: z.string().min(8).max(128).optional(),
});

export type PlayerJoinRequest = z.infer<typeof playerJoinRequestSchema>;

/**
 * Unauthenticated player join handshake:
 * 1. Tablet POSTs room code + BYOD character payload.
 * 2. Gateway validates code, assigns seat, merges character into DM master state.
 * 3. Returns player token + player-visible session snapshot.
 */
export function buildJoinHandshakeResponse(
  result: SessionRoomJoinResult,
): SessionRoomJoinResult {
  return result;
}

export function sanitizeJoinCharacter(character: PlayerCharacter): PlayerCharacter {
  return {
    ...character,
    name: character.name.trim(),
    playerName: character.playerName.trim() || character.name.trim(),
    tokenId: null,
  };
}
