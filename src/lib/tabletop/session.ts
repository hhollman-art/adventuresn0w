import type {
  AbilityScores,
  CharacterItem,
  DiceLogEntry,
  InitiativeEntry,
  ItemBonuses,
  PlayerCharacter,
  TabletopSession,
  TabletopToken,
  TokenKind,
} from "./types";
import { emptyBonuses } from "./character";

export const DEFAULT_GRID_COLS = 30;
export const DEFAULT_GRID_ROWS = 20;
export const MAX_LOG_ENTRIES = 60;

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createDefaultSession(): TabletopSession {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    mapName: "Blank battlefield",
    mapImageDataUrl: null,
    grid: { cols: DEFAULT_GRID_COLS, rows: DEFAULT_GRID_ROWS, visible: true, snap: true },
    fog: { enabled: false, revealed: [] },
    tokens: [],
    players: [],
    initiative: { entries: [], activeIndex: 0, round: 1 },
    log: [],
  };
}

const TOKEN_KINDS: TokenKind[] = ["pc", "ally", "monster", "object"];

function fixToken(o: Record<string, unknown>): TabletopToken | null {
  if (
    typeof o.id !== "string" ||
    typeof o.label !== "string" ||
    typeof o.color !== "string" ||
    typeof o.x !== "number" ||
    typeof o.y !== "number"
  ) {
    return null;
  }
  const kind = TOKEN_KINDS.includes(o.kind as TokenKind) ? (o.kind as TokenKind) : "monster";
  const size =
    typeof o.size === "number" && o.size >= 1 && o.size <= 4 ? Math.round(o.size) : 1;
  let hp: TabletopToken["hp"] = null;
  if (typeof o.hp === "object" && o.hp !== null) {
    const h = o.hp as Record<string, unknown>;
    if (typeof h.current === "number" && typeof h.max === "number") {
      hp = { current: h.current, max: h.max };
    }
  }
  return {
    id: o.id,
    label: o.label,
    color: o.color,
    kind,
    x: o.x,
    y: o.y,
    size,
    hp,
    hidden: o.hidden === true,
    imageDataUrl:
      typeof o.imageDataUrl === "string" && o.imageDataUrl.startsWith("data:image")
        ? o.imageDataUrl
        : null,
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

const ABILITY_KEYS: (keyof AbilityScores)[] = ["str", "dex", "con", "int", "wis", "cha"];

function fixBonus(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(99, Math.max(-99, Math.round(value)))
    : 0;
}

function fixItemBonuses(raw: Record<string, unknown>): ItemBonuses {
  const base = emptyBonuses();
  return Object.fromEntries(
    (Object.keys(base) as (keyof ItemBonuses)[]).map((k) => [k, fixBonus(raw[k])]),
  ) as ItemBonuses;
}

function fixItem(o: Record<string, unknown>): CharacterItem | null {
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const rawBonuses = (
    typeof o.bonuses === "object" && o.bonuses !== null ? o.bonuses : {}
  ) as Record<string, unknown>;
  return {
    id: o.id,
    name: o.name,
    notes: typeof o.notes === "string" ? o.notes : "",
    bonuses: fixItemBonuses(rawBonuses),
  };
}

function fixPlayer(o: Record<string, unknown>): PlayerCharacter | null {
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) {
    return null;
  }
  const rawAbilities = (
    typeof o.abilities === "object" && o.abilities !== null ? o.abilities : {}
  ) as Record<string, unknown>;
  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((k) => [k, clampInt(rawAbilities[k], 1, 30, 10)]),
  ) as AbilityScores;

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const items = Array.isArray(o.items)
    ? o.items
        .map((item) =>
          typeof item === "object" && item !== null
            ? fixItem(item as Record<string, unknown>)
            : null,
        )
        .filter((item): item is CharacterItem => item !== null)
    : [];

  return {
    id: o.id,
    name: o.name,
    playerName: str(o.playerName),
    species: str(o.species),
    className: str(o.className),
    subclass: str(o.subclass),
    background: str(o.background),
    alignment: str(o.alignment),
    level: clampInt(o.level, 1, 20, 1),
    abilities,
    ac: clampInt(o.ac, 1, 40, 10),
    maxHp: clampInt(o.maxHp, 1, 999, 10),
    speed: clampInt(o.speed, 0, 200, 30),
    notes: str(o.notes),
    items,
    tokenId: typeof o.tokenId === "string" ? o.tokenId : null,
  };
}

function fixInitiativeEntry(o: Record<string, unknown>): InitiativeEntry | null {
  if (typeof o.id !== "string" || typeof o.name !== "string" || typeof o.roll !== "number") {
    return null;
  }
  return {
    id: o.id,
    name: o.name,
    roll: o.roll,
    tokenId: typeof o.tokenId === "string" ? o.tokenId : null,
  };
}

function fixLogEntry(o: Record<string, unknown>): DiceLogEntry | null {
  if (
    typeof o.id !== "string" ||
    typeof o.at !== "string" ||
    typeof o.expression !== "string" ||
    typeof o.detail !== "string" ||
    typeof o.total !== "number"
  ) {
    return null;
  }
  return {
    id: o.id,
    at: o.at,
    expression: o.expression,
    detail: o.detail,
    total: o.total,
    secret: o.secret === true,
  };
}

/** Validates a persisted or received session; returns null when unusable. */
export function fixSession(value: unknown): TabletopSession | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (o.version !== 1) return null;

  const grid = (typeof o.grid === "object" && o.grid !== null ? o.grid : {}) as Record<
    string,
    unknown
  >;
  const fog = (typeof o.fog === "object" && o.fog !== null ? o.fog : {}) as Record<
    string,
    unknown
  >;
  const init = (
    typeof o.initiative === "object" && o.initiative !== null ? o.initiative : {}
  ) as Record<string, unknown>;

  const cols =
    typeof grid.cols === "number" && grid.cols >= 4 && grid.cols <= 100
      ? Math.round(grid.cols)
      : DEFAULT_GRID_COLS;
  const rows =
    typeof grid.rows === "number" && grid.rows >= 4 && grid.rows <= 100
      ? Math.round(grid.rows)
      : DEFAULT_GRID_ROWS;

  const tokens = Array.isArray(o.tokens)
    ? o.tokens
        .map((t) =>
          typeof t === "object" && t !== null ? fixToken(t as Record<string, unknown>) : null,
        )
        .filter((t): t is TabletopToken => t !== null)
    : [];

  const players = Array.isArray(o.players)
    ? o.players
        .map((p) =>
          typeof p === "object" && p !== null ? fixPlayer(p as Record<string, unknown>) : null,
        )
        .filter((p): p is PlayerCharacter => p !== null)
    : [];

  const entries = Array.isArray(init.entries)
    ? init.entries
        .map((e) =>
          typeof e === "object" && e !== null
            ? fixInitiativeEntry(e as Record<string, unknown>)
            : null,
        )
        .filter((e): e is InitiativeEntry => e !== null)
    : [];

  const log = Array.isArray(o.log)
    ? o.log
        .map((e) =>
          typeof e === "object" && e !== null
            ? fixLogEntry(e as Record<string, unknown>)
            : null,
        )
        .filter((e): e is DiceLogEntry => e !== null)
        .slice(0, MAX_LOG_ENTRIES)
    : [];

  const activeIndexRaw = typeof init.activeIndex === "number" ? Math.round(init.activeIndex) : 0;

  return {
    version: 1,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
    mapName: typeof o.mapName === "string" ? o.mapName : "Battle map",
    mapImageDataUrl: typeof o.mapImageDataUrl === "string" ? o.mapImageDataUrl : null,
    grid: {
      cols,
      rows,
      visible: grid.visible !== false,
      snap: grid.snap !== false,
    },
    fog: {
      enabled: fog.enabled === true,
      revealed: Array.isArray(fog.revealed)
        ? fog.revealed.filter((k): k is string => typeof k === "string")
        : [],
    },
    tokens,
    players: players.map((p) => ({
      ...p,
      // Drop dangling token links (e.g. token deleted in another tab).
      tokenId: p.tokenId && tokens.some((t) => t.id === p.tokenId) ? p.tokenId : null,
    })),
    initiative: {
      entries,
      activeIndex:
        entries.length === 0 ? 0 : Math.min(Math.max(activeIndexRaw, 0), entries.length - 1),
      round: typeof init.round === "number" && init.round >= 1 ? Math.round(init.round) : 1,
    },
    log,
  };
}

export function sortInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) => b.roll - a.roll || a.name.localeCompare(b.name));
}

export function advanceInitiative(session: TabletopSession): TabletopSession {
  const count = session.initiative.entries.length;
  if (count === 0) return session;
  const nextIndex = (session.initiative.activeIndex + 1) % count;
  return {
    ...session,
    initiative: {
      ...session.initiative,
      activeIndex: nextIndex,
      round: nextIndex === 0 ? session.initiative.round + 1 : session.initiative.round,
    },
  };
}

export function appendLog(
  session: TabletopSession,
  entry: Omit<DiceLogEntry, "id" | "at">,
): TabletopSession {
  const item: DiceLogEntry = { ...entry, id: newId(), at: new Date().toISOString() };
  return { ...session, log: [item, ...session.log].slice(0, MAX_LOG_ENTRIES) };
}

/** Strips DM-only information for the player view: hidden tokens and secret rolls. */
export function playerVisibleSession(session: TabletopSession): TabletopSession {
  return {
    ...session,
    tokens: session.tokens.filter((t) => !t.hidden),
    log: session.log.filter((e) => !e.secret),
  };
}
