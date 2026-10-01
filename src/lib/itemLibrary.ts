import type { ItemBonuses } from "@/lib/tabletop/types";
import { emptyBonuses } from "@/lib/tabletop/character";
import { newId } from "@/lib/tabletop/session";

/**
 * Item library — normal equipment and magic items as first-class
 * Creation Files (CFs) (`item.equipment` / `item.magic`). The Items page
 * creates and manages these; character sheets pull gear from here (a sheet
 * embeds a copy of the item's stats, so editing a library item never
 * silently changes a character).
 */

const IDB_NAME = "ddeasy-item-library-v1";
const IDB_STORE = "kv";
const IDB_KEY = "items";
/** localStorage mirror — survives IDB quirks and syncs across tabs. */
const LOCAL_STORAGE_KEY = "ddeasy-item-library-v1";

export const ITEMS_CHANGED_EVENT = "ddeasy-items-changed";

const MAX_ITEMS = 192;

export type GameItemKind = "equipment" | "magic";

export const GAME_ITEM_KIND_LABEL: Record<GameItemKind, string> = {
  equipment: "Equipment",
  magic: "Magic item",
};

export type MagicRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very-rare"
  | "legendary"
  | "artifact";

export const MAGIC_RARITIES: MagicRarity[] = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
];

export const MAGIC_RARITY_LABEL: Record<MagicRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very-rare": "Very rare",
  legendary: "Legendary",
  artifact: "Artifact",
};

export type GameItemSource = "created" | "import";

export const GAME_ITEM_SOURCE_LABEL: Record<GameItemSource, string> = {
  created: "Created here",
  import: "Imported",
};

export type SavedGameItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
  kind: GameItemKind;
  name: string;
  /** Short type line, e.g. "Weapon (longsword)" or "Wondrous item". */
  itemType: string;
  /** Magic items only; null for normal equipment. */
  rarity: MagicRarity | null;
  requiresAttunement: boolean;
  /** Optional free-text attunement detail (e.g. "by a spellcaster"). */
  attunementNote: string;
  /** What it does, in the DM's own words. */
  description: string;
  /** Mechanical properties line (damage, AC, weapon properties, etc.). */
  properties: string;
  /** Charges / uses / recharge notes. */
  charges: string;
  /** Triggered effects, curses, or special rules. */
  effects: string;
  /** Stat modifiers applied when a character carries it (same shape as sheet gear). */
  bonuses: ItemBonuses;
  source: GameItemSource;
  /**
   * True for custom / homebrew artifacts created via the Library Create Artifact tool
   * (or flagged on save). Distinct from legal provenance — still always user-tier.
   */
  isHomebrew: boolean;
  /** DM account id or display name when known at create time. */
  createdBy: string | null;
  /** Free-form classification tags (searchable). */
  tags: string[];
  /** System / setting chips (e.g. Homebrew, Realm). */
  settingTags: string[];
  /** Book or campaign source note ("My realm codex", etc.). */
  sourceNote: string;
  /** Optional artwork as a local `data:image/...` URL (never uploaded). */
  imageDataUrl: string | null;
  /**
   * SRD instantiation provenance (`instantiateSrdEntity.ts`). Set when this
   * row was hydrated from a bundled SRD entity. Typed so a DM can rewrite the
   * description into a custom magic item without losing where it came from.
   * Legacy rows fall back to the `sourceSrdEntityId:` text tag in `description`.
   */
  instanceId: string | null;
  _source: "SRD" | null;
  sourceSrdEntityId: string | null;
};

const SRD_SOURCE_TAG = /sourceSrdEntityId:\s*([^\s\n]+)/;

/** Typed field first, then the legacy description tag written by older builds. */
export function gameItemSourceSrdEntityId(
  item: Pick<SavedGameItem, "sourceSrdEntityId" | "description">,
): string | null {
  if (item.sourceSrdEntityId) return item.sourceSrdEntityId;
  const m = item.description.match(SRD_SOURCE_TAG);
  return m?.[1]?.trim() || null;
}

function normalizeProvenance(o: {
  instanceId?: unknown;
  _source?: unknown;
  sourceSrdEntityId?: unknown;
  description?: unknown;
}): Pick<SavedGameItem, "instanceId" | "_source" | "sourceSrdEntityId"> {
  const instanceId =
    typeof o.instanceId === "string" && o.instanceId.startsWith("instance_")
      ? o.instanceId
      : null;
  const typedSource =
    typeof o.sourceSrdEntityId === "string" && o.sourceSrdEntityId.trim()
      ? o.sourceSrdEntityId.trim()
      : null;
  // Upgrade legacy rows: lift the text tag into the typed field once.
  const legacy =
    !typedSource && typeof o.description === "string"
      ? (o.description.match(SRD_SOURCE_TAG)?.[1]?.trim() ?? null)
      : null;
  const sourceSrdEntityId = typedSource ?? legacy;
  const _source: "SRD" | null =
    o._source === "SRD" || (instanceId !== null && sourceSrdEntityId !== null) || legacy !== null
      ? "SRD"
      : null;
  return { instanceId, _source, sourceSrdEntityId };
}

function normalizeKind(value: unknown): GameItemKind {
  return value === "magic" ? "magic" : "equipment";
}

function normalizeRarity(value: unknown): MagicRarity | null {
  return typeof value === "string" && (MAGIC_RARITIES as string[]).includes(value)
    ? (value as MagicRarity)
    : null;
}

function normalizeSource(value: unknown): GameItemSource {
  return value === "created" ? "created" : "import";
}

function normalizeBonuses(value: unknown): ItemBonuses {
  const base = emptyBonuses();
  if (typeof value !== "object" || value === null) return base;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof ItemBonuses)[]) {
    const n = Number(raw[key]);
    base[key] = Number.isFinite(n) ? Math.max(-99, Math.min(99, Math.round(n))) : 0;
  }
  return base;
}

function normalizeStringList(value: unknown, max = 24): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().slice(0, 40);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeImageDataUrl(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("data:image/") ? value : null;
}

/** Validates and upgrades a persisted item row. */
export function fixSavedGameItem(value: unknown): SavedGameItem | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) {
    return null;
  }
  const kind = normalizeKind(o.kind);
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const source = normalizeSource(o.source);
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    kind,
    name: o.name.trim(),
    itemType: typeof o.itemType === "string" ? o.itemType : "",
    rarity: kind === "magic" ? normalizeRarity(o.rarity) : null,
    requiresAttunement: kind === "magic" && o.requiresAttunement === true,
    attunementNote: typeof o.attunementNote === "string" ? o.attunementNote : "",
    description: typeof o.description === "string" ? o.description : "",
    properties: typeof o.properties === "string" ? o.properties : "",
    charges: typeof o.charges === "string" ? o.charges : "",
    effects: typeof o.effects === "string" ? o.effects : "",
    bonuses: normalizeBonuses(o.bonuses),
    source,
    isHomebrew: o.isHomebrew === true,
    createdBy:
      typeof o.createdBy === "string" && o.createdBy.trim()
        ? o.createdBy.trim()
        : null,
    tags: normalizeStringList(o.tags, 24),
    settingTags: normalizeStringList(o.settingTags, 12),
    sourceNote: typeof o.sourceNote === "string" ? o.sourceNote : "",
    imageDataUrl: normalizeImageDataUrl(o.imageDataUrl),
    ...normalizeProvenance(o),
  };
}

function parseJsonArray(raw: string): SavedGameItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedGameItem(row))
      .filter((i): i is SavedGameItem => i !== null);
  } catch {
    return [];
  }
}

function sortByUpdated(list: SavedGameItem[]): SavedGameItem[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyItemsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ITEMS_CHANGED_EVENT));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
    });
  }
  return dbPromise;
}

async function idbGetItems(): Promise<SavedGameItem[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) {
        resolve(
          v.map((row) => fixSavedGameItem(row)).filter((i): i is SavedGameItem => i !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetItems(items: SavedGameItem[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedGameItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedGameItem[]> {
  if (typeof window === "undefined") return [];
  try {
    let items = await idbGetItems();
    if (items === undefined || items.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        items = mirror;
        try {
          await idbSetItems(items);
        } catch {
          /* keep mirror */
        }
      } else {
        items = [];
      }
    }
    return sortByUpdated(items);
  } catch {
    return sortByUpdated(loadFromLocalStorage());
  }
}

async function persist(list: SavedGameItem[]): Promise<void> {
  const sorted = sortByUpdated(list);
  let lastError: unknown = null;

  try {
    await idbSetItems(sorted);
  } catch (err) {
    lastError = err;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyItemsChanged();
    return;
  } catch (err) {
    if (!lastError) lastError = err;
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("Could not save the item library");
  }
}

let writeMutex = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeMutex.then(fn, fn);
  writeMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function loadSavedGameItems(): Promise<SavedGameItem[]> {
  return loadInternal();
}

export type SaveGameItemInput = {
  kind: GameItemKind;
  name: string;
  itemType?: string;
  rarity?: MagicRarity | null;
  requiresAttunement?: boolean;
  attunementNote?: string;
  description?: string;
  properties?: string;
  charges?: string;
  effects?: string;
  bonuses?: ItemBonuses;
  source?: GameItemSource;
  isHomebrew?: boolean;
  createdBy?: string | null;
  tags?: string[];
  settingTags?: string[];
  sourceNote?: string;
  imageDataUrl?: string | null;
  /** SRD instantiation provenance — omitted on update ⇒ existing values are kept. */
  instanceId?: string | null;
  _source?: "SRD" | null;
  sourceSrdEntityId?: string | null;
};

function buildRecordFromInput(
  input: SaveGameItemInput,
  existing?: SavedGameItem,
): Omit<SavedGameItem, "id" | "createdAt" | "updatedAt"> {
  const kind = input.kind;
  return {
    kind,
    name: input.name.trim(),
    itemType: input.itemType?.trim() ?? "",
    rarity: kind === "magic" ? (input.rarity ?? null) : null,
    requiresAttunement: kind === "magic" && input.requiresAttunement === true,
    attunementNote:
      input.attunementNote !== undefined
        ? input.attunementNote
        : (existing?.attunementNote ?? ""),
    description: input.description ?? "",
    properties:
      input.properties !== undefined ? input.properties : (existing?.properties ?? ""),
    charges: input.charges !== undefined ? input.charges : (existing?.charges ?? ""),
    effects: input.effects !== undefined ? input.effects : (existing?.effects ?? ""),
    bonuses: normalizeBonuses(input.bonuses ?? existing?.bonuses),
    source: input.source ?? existing?.source ?? "created",
    isHomebrew:
      input.isHomebrew !== undefined ? input.isHomebrew : (existing?.isHomebrew ?? false),
    createdBy:
      input.createdBy !== undefined ? input.createdBy : (existing?.createdBy ?? null),
    tags:
      input.tags !== undefined
        ? normalizeStringList(input.tags, 24)
        : (existing?.tags ?? []),
    settingTags:
      input.settingTags !== undefined
        ? normalizeStringList(input.settingTags, 12)
        : (existing?.settingTags ?? []),
    sourceNote:
      input.sourceNote !== undefined ? input.sourceNote : (existing?.sourceNote ?? ""),
    imageDataUrl:
      input.imageDataUrl !== undefined
        ? normalizeImageDataUrl(input.imageDataUrl)
        : (existing?.imageDataUrl ?? null),
    // Local mutability: a DM editing an SRD clone into a custom item keeps the
    // typed origin unless the patch explicitly clears it.
    ...normalizeProvenance({
      instanceId: input.instanceId !== undefined ? input.instanceId : existing?.instanceId,
      _source: input._source !== undefined ? input._source : existing?._source,
      sourceSrdEntityId:
        input.sourceSrdEntityId !== undefined
          ? input.sourceSrdEntityId
          : existing?.sourceSrdEntityId,
      description: input.description ?? existing?.description,
    }),
  };
}

export async function saveGameItem(input: SaveGameItemInput): Promise<SavedGameItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    if (!input.name.trim()) {
      throw new Error("This item needs at least a name.");
    }
    const now = new Date().toISOString();
    const record: SavedGameItem = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      ...buildRecordFromInput(input),
    };
    const list = [record, ...(await loadInternal())].slice(0, MAX_ITEMS);
    await persist(list);
    return list;
  });
}

export async function updateGameItem(
  id: string,
  patch: Omit<SaveGameItemInput, "source">,
): Promise<SavedGameItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((i) => {
      if (i.id !== id) return i;
      return {
        ...i,
        ...buildRecordFromInput({ ...patch, source: i.source }, i),
        id: i.id,
        createdAt: i.createdAt,
        updatedAt: now,
        source: i.source,
      };
    });
    await persist(list);
    return list;
  });
}

/**
 * Validate + persist a custom homebrew artifact into the item library.
 * Returns the refreshed list and the new row (for instant Library selection).
 */
export async function createCustomArtifact(
  raw: unknown,
): Promise<{ items: SavedGameItem[]; item: SavedGameItem }> {
  const { parseCreateCustomArtifact } = await import("@/lib/itemArtifactSchema");
  const parsed = parseCreateCustomArtifact(raw);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const data = parsed.data;
  const settingTags = data.settingTags.includes("Homebrew")
    ? data.settingTags
    : ["Homebrew", ...data.settingTags];
  const tags = Array.from(
    new Set(
      [...data.tags, ...settingTags, data.sourceNote.trim()].filter(Boolean),
    ),
  );

  const items = await saveGameItem({
    kind: "magic",
    name: data.name,
    itemType: data.itemType,
    rarity: data.rarity,
    requiresAttunement: data.requiresAttunement,
    attunementNote: data.attunementNote,
    description: data.description,
    properties: data.properties,
    charges: data.charges,
    effects: data.effects,
    source: "created",
    isHomebrew: true,
    createdBy: data.createdBy,
    tags,
    settingTags,
    sourceNote: data.sourceNote,
    imageDataUrl: data.imageDataUrl ?? null,
  });
  const item = items.find((row) => row.name === data.name && row.isHomebrew) ?? items[0];
  if (!item) {
    throw new Error("Could not save this artifact. Please try again.");
  }
  return { items, item };
}

/** Table-ready markdown for Library detail / export. */
export function gameItemToMarkdown(item: SavedGameItem): string {
  const lines: string[] = [`# ${item.name}`, ""];
  const meta = [
    GAME_ITEM_KIND_LABEL[item.kind],
    item.itemType,
    item.kind === "magic" && item.rarity ? MAGIC_RARITY_LABEL[item.rarity] : "",
    item.requiresAttunement
      ? `Requires attunement${item.attunementNote.trim() ? ` (${item.attunementNote.trim()})` : ""}`
      : "",
    item.isHomebrew ? "Homebrew" : "",
    item.sourceNote.trim() ? `Source: ${item.sourceNote.trim()}` : "",
  ].filter(Boolean);
  if (meta.length) lines.push(meta.join(" · "), "");
  if (item.description.trim()) {
    lines.push("## Description", "", item.description.trim(), "");
  }
  if (item.properties.trim()) {
    lines.push("## Properties", "", item.properties.trim(), "");
  }
  if (item.charges.trim()) {
    lines.push("## Charges", "", item.charges.trim(), "");
  }
  if (item.effects.trim()) {
    lines.push("## Effects", "", item.effects.trim(), "");
  }
  const tags = [...item.settingTags, ...item.tags];
  if (tags.length) {
    lines.push("## Tags", "", tags.map((t) => `- ${t}`).join("\n"), "");
  }
  if (item.createdBy) {
    lines.push(`_Created by ${item.createdBy}_`, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export async function deleteGameItem(id: string): Promise<SavedGameItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((i) => i.id !== id);
    await persist(list);
    return list;
  });
}

/**
 * Merge items from a backup file. Rows with ids that already exist are
 * skipped (non-destructive restore).
 */
export async function importGameItems(
  rows: unknown[],
): Promise<{ added: number; items: SavedGameItem[] }> {
  if (typeof window === "undefined") return { added: 0, items: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((i) => i.id));
    const incoming = rows
      .map((row) => fixSavedGameItem(row))
      .filter((i): i is SavedGameItem => i !== null && !known.has(i.id));
    const next = [...incoming, ...existing].slice(0, MAX_ITEMS);
    await persist(next);
    return { added: incoming.length, items: next };
  });
}

/** Subscribe to item library changes (same tab or other tabs). */
export function onItemsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(ITEMS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ITEMS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/* ---- Sorting for the items page ---- */

export type GameItemSortKey = "updated" | "name" | "kind" | "rarity";

export const GAME_ITEM_SORT_LABEL: Record<GameItemSortKey, string> = {
  updated: "Recently updated",
  name: "Name (A–Z)",
  kind: "Kind (equipment first)",
  rarity: "Rarity (high first)",
};

const RARITY_RANK: Record<MagicRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  "very-rare": 4,
  legendary: 5,
  artifact: 6,
};

export function sortSavedGameItems(
  list: SavedGameItem[],
  key: GameItemSortKey,
): SavedGameItem[] {
  const sorted = [...list];
  switch (key) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "kind":
      sorted.sort(
        (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
      );
      break;
    case "rarity":
      sorted.sort(
        (a, b) =>
          (b.rarity ? RARITY_RANK[b.rarity] : 0) - (a.rarity ? RARITY_RANK[a.rarity] : 0) ||
          a.name.localeCompare(b.name),
      );
      break;
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return sorted;
}
