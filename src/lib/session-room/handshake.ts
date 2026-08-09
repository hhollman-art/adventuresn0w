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

const modifierSourceKindSchema = z.enum([
  "item",
  "equipped-item",
  "species",
  "class",
  "background",
  "feat",
  "condition",
  "curse",
  "blessing",
  "creation-file",
  "manual",
]);

const characterItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string(),
  bonuses: itemBonusesSchema,
  equipped: z.boolean().optional(),
  libraryItemId: z.string().nullable().optional(),
  sourceKind: modifierSourceKindSchema.optional(),
  instanceId: z.string().optional(),
  _source: z.enum(["SRD", "user", "import", "created"]).optional(),
  sourceSrdEntityId: z.string().nullable().optional(),
});

const characterModifierSchema = z.object({
  id: z.string(),
  sourceKind: modifierSourceKindSchema,
  sourceLabel: z.string(),
  sourceCfId: z.string().nullable(),
  target: z.enum([
    "str",
    "dex",
    "con",
    "int",
    "wis",
    "cha",
    "ac",
    "maxHp",
    "speed",
    "initiative",
    "passivePerception",
    "save-str",
    "save-dex",
    "save-con",
    "save-int",
    "save-wis",
    "save-cha",
  ]),
  value: z.number(),
  active: z.boolean(),
  notes: z.string().optional(),
});

const abilityKeySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);
const skillProficiencySchema = z.enum([
  "acrobatics",
  "animal-handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight-of-hand",
  "stealth",
  "survival",
]);
const characterAttackSchema = z.object({
  id: z.string(),
  name: z.string(),
  attackBonus: z.string(),
  damageType: z.string(),
});
const characterCurrencySchema = z.object({
  cp: z.number().int().min(0),
  sp: z.number().int().min(0),
  ep: z.number().int().min(0),
  gp: z.number().int().min(0),
  pp: z.number().int().min(0),
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
  level: z.number().int().min(1).max(20),
  abilities: abilityScoresSchema,
  ac: z.number(),
  maxHp: z.number(),
  speed: z.number(),
  notes: z.string(),
  items: z.array(characterItemSchema),
  knownSpellIds: z.array(z.string()),
  preparedSpellIds: z.array(z.string()).default([]),
  linkedModifiers: z.array(characterModifierSchema).default([]),
  currentHp: z.number().nullable(),
  tokenId: z.string().nullable(),
  experiencePoints: z.number().int().min(0).optional(),
  inspiration: z.boolean().optional(),
  proficientSavingThrows: z.array(abilityKeySchema).optional(),
  skillProficiencies: z.array(skillProficiencySchema).optional(),
  otherProficiencies: z.string().optional(),
  temporaryHp: z.number().int().min(0).optional(),
  hitDice: z.string().optional(),
  deathSaveSuccesses: z.number().int().min(0).max(3).optional(),
  deathSaveFailures: z.number().int().min(0).max(3).optional(),
  attacks: z.array(characterAttackSchema).optional(),
  currency: characterCurrencySchema.optional(),
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),
  features: z.string().optional(),
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
