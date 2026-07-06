import type { AbilityScores, PlayerCharacter } from "./types";
import { rosterToMarkdown } from "./characterMarkdown";

/** Plain-language notice — reuse in UI and /legal. */
export const DDB_IMPORT_LEGAL_NOTICE =
  "Content from D&D Beyond comes from books you own. You paste or upload it yourself — D&D Easy never logs into D&D Beyond, never uses your cookies, and never uploads this data to a server.";

type DdbParseResult =
  | { ok: true; rosterName: string; players: Omit<PlayerCharacter, "tokenId">[]; markdown: string }
  | { ok: false; error: string };

const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

const DDB_STAT_ID: Record<number, keyof AbilityScores> = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function unwrapCharacter(raw: unknown): Record<string, unknown> | null {
  const obj = asObject(raw);
  if (!obj) return null;
  if (asObject(obj.data)) return asObject(obj.data);
  return obj;
}

function extractCharacterList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.map(unwrapCharacter).filter((c): c is Record<string, unknown> => c !== null);
  }
  const obj = asObject(raw);
  if (!obj) return [];
  if (Array.isArray(obj.characters)) {
    return obj.characters
      .map(unwrapCharacter)
      .filter((c): c is Record<string, unknown> => c !== null);
  }
  const single = unwrapCharacter(obj);
  if (single && readString(single.name)) return [single];
  return [];
}

function readClassSummary(classes: unknown): { className: string; subclass: string; level: number } {
  if (!Array.isArray(classes) || classes.length === 0) {
    return { className: "", subclass: "", level: 1 };
  }

  let totalLevel = 0;
  const parts: string[] = [];
  let subclass = "";

  for (const entry of classes) {
    const row = asObject(entry);
    if (!row) continue;
    const level = readNumber(row.level, 0);
    totalLevel += level;
    const def = asObject(row.definition);
    const name = readString(def?.name);
    if (name) parts.push(level > 0 ? `${name} ${level}` : name);
    const sub = asObject(row.subclassDefinition);
    const subName = readString(sub?.name);
    if (subName && !subclass) subclass = subName;
  }

  const fallbackDef = asObject(asObject(classes[0])?.definition);
  return {
    className: parts.join(" / ") || readString(fallbackDef?.name),
    subclass,
    level: Math.max(1, Math.min(20, totalLevel || 1)),
  };
}

function readRace(character: Record<string, unknown>): string {
  const race = asObject(character.race);
  if (race) {
    return (
      readString(race.fullName) ||
      readString(race.subRaceShortName) ||
      readString(asObject(race.raceDefinition)?.name)
    );
  }
  const raceDef = asObject(character.raceDefinition);
  return readString(raceDef?.name) || readString(raceDef?.fullName);
}

function readBackground(character: Record<string, unknown>): string {
  const bg = asObject(character.background);
  if (bg) return readString(asObject(bg.definition)?.name) || readString(bg.name);
  const bgDef = asObject(character.backgroundDefinition);
  return readString(bgDef?.name);
}

function readAbilities(character: Record<string, unknown>): AbilityScores {
  const scores = { ...DEFAULT_ABILITIES };
  const stats = character.stats;
  if (!Array.isArray(stats)) return scores;
  for (const stat of stats) {
    const row = asObject(stat);
    if (!row) continue;
    const key = DDB_STAT_ID[readNumber(row.id, 0)];
    if (key) scores[key] = Math.max(1, Math.min(30, readNumber(row.value, scores[key])));
  }
  return scores;
}

function readHp(character: Record<string, unknown>): number {
  const base = readNumber(character.baseHitPoints, 0);
  const bonus = readNumber(character.bonusHitPoints, 0);
  const override = character.overrideHitPoints;
  if (override != null && override !== "") {
    return Math.max(1, readNumber(override, base + bonus));
  }
  const total = base + bonus;
  return Math.max(1, total || 10);
}

function readAc(character: Record<string, unknown>): number {
  if (character.armorClass != null) {
    return Math.max(1, Math.min(40, readNumber(character.armorClass, 10)));
  }
  const ac = asObject(character.armorClass);
  if (ac) return Math.max(1, Math.min(40, readNumber(ac.value ?? ac.total, 10)));
  return 10;
}

function readSpeed(character: Record<string, unknown>): number {
  const speed = asObject(character.speed);
  if (speed) return Math.max(0, readNumber(speed.walk ?? speed.Walk, 30));
  const movement = asObject(character.movement);
  if (movement) return Math.max(0, readNumber(movement.walk, 30));
  return 30;
}

export function ddbCharactersToMarkdown(
  rosterName: string,
  players: Omit<PlayerCharacter, "tokenId">[],
): string {
  return rosterToMarkdown(rosterName, players);
}

function parseDdbCharacter(
  raw: Record<string, unknown>,
  id: string,
): Omit<PlayerCharacter, "tokenId"> | null {
  const name = readString(raw.name);
  if (!name) return null;

  const { className, subclass, level } = readClassSummary(raw.classes);
  const alignment =
    readString(asObject(raw.alignment)?.name) ||
    readString(raw.alignment) ||
    readString(asObject(raw.alignmentDefinition)?.name);

  return {
    id,
    name,
    playerName: readString(raw.playerName) || readString(raw.player),
    species: readRace(raw),
    className,
    subclass,
    background: readBackground(raw),
    alignment,
    level,
    abilities: readAbilities(raw),
    ac: readAc(raw),
    maxHp: readHp(raw),
    speed: readSpeed(raw),
    notes: "Imported from your D&D Beyond character file on this device.",
    items: [],
    knownSpellIds: [],
    currentHp: null,
  };
}

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `ddb-${idCounter}`;
}

export function resetDdbImportIdsForTests(): void {
  idCounter = 0;
}

/** Parse user-provided D&D Beyond character JSON (file or paste). Client-side only. */
export function parseDdbPartyImport(rawText: string): DdbParseResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste JSON or choose a .json file from your device." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return {
      ok: false,
      error: "That file is not valid JSON. Export or copy your hero data and try again.",
    };
  }

  const characters = extractCharacterList(parsed);
  if (characters.length === 0) {
    return {
      ok: false,
      error:
        "No heroes found in that JSON. It should be one hero object or a list of heroes.",
    };
  }

  const players = characters
    .map((c) => parseDdbCharacter(c, nextId()))
    .filter((p): p is Omit<PlayerCharacter, "tokenId"> => p !== null);

  if (players.length === 0) {
    return { ok: false, error: "Heroes were found but none had a name field." };
  }

  const rosterName =
    readString(asObject(parsed)?.name) ||
    (players.length === 1 ? players[0]!.name : "Imported party");

  return {
    ok: true,
    rosterName,
    players,
    markdown: ddbCharactersToMarkdown(rosterName, players),
  };
}
