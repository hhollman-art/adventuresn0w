import type { PlayerCharacter } from "./types";
import { fixPlayer, newId } from "./session";

/**
 * Standalone character library — characters as first-class Configuration
 * Items (`character.sheet`), independent of any party. The character page
 * creates and manages these; parties are assembled from them (a saved party
 * roster embeds a snapshot of each member, keeping the same character id so
 * a sheet can be traced back to its library record).
 */

const IDB_NAME = "ddeasy-character-library-v1";
const IDB_STORE = "kv";
const IDB_KEY = "characters";
/** localStorage mirror — survives IDB quirks and syncs across tabs. */
const LOCAL_STORAGE_KEY = "ddeasy-character-library-v1";

export const CHARACTERS_CHANGED_EVENT = "ddeasy-characters-changed";

const MAX_CHARACTERS = 96;

export type CharacterSource = "created" | "import" | "party";

export const CHARACTER_SOURCE_LABEL: Record<CharacterSource, string> = {
  created: "Created here",
  import: "Imported file",
  party: "From a party",
};

export type SavedCharacter = {
  /** Matches `player.id` — the stable identity across parties and the VTT. */
  id: string;
  createdAt: string;
  updatedAt: string;
  source: CharacterSource;
  player: PlayerCharacter;
};

const CHARACTER_SOURCES: CharacterSource[] = ["created", "import", "party"];

function normalizeSource(value: unknown): CharacterSource {
  return typeof value === "string" && (CHARACTER_SOURCES as string[]).includes(value)
    ? (value as CharacterSource)
    : "import";
}

/** Validates and upgrades a persisted character row. */
export function fixSavedCharacter(value: unknown): SavedCharacter | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const rawPlayer =
    typeof o.player === "object" && o.player !== null
      ? (o.player as Record<string, unknown>)
      : null;
  if (!rawPlayer) return null;
  const player = fixPlayer({ ...rawPlayer, id: o.id, tokenId: null });
  if (!player) return null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    source: normalizeSource(o.source),
    player: { ...player, tokenId: null },
  };
}

function parseJsonArray(raw: string): SavedCharacter[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedCharacter(row))
      .filter((c): c is SavedCharacter => c !== null);
  } catch {
    return [];
  }
}

function sortCharacters(list: SavedCharacter[]): SavedCharacter[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyCharactersChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHARACTERS_CHANGED_EVENT));
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

async function idbGetItems(): Promise<SavedCharacter[] | undefined> {
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
          v
            .map((row) => fixSavedCharacter(row))
            .filter((c): c is SavedCharacter => c !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetItems(items: SavedCharacter[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedCharacter[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedCharacter[]> {
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
    return sortCharacters(items);
  } catch {
    return sortCharacters(loadFromLocalStorage());
  }
}

async function persist(list: SavedCharacter[]): Promise<void> {
  const sorted = sortCharacters(list);
  let lastError: unknown = null;

  try {
    await idbSetItems(sorted);
  } catch (err) {
    lastError = err;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyCharactersChanged();
    return;
  } catch (err) {
    if (!lastError) lastError = err;
  }

  if (lastError) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Could not save the character library");
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

export async function loadSavedCharacters(): Promise<SavedCharacter[]> {
  return loadInternal();
}

export async function getSavedCharacter(id: string): Promise<SavedCharacter | null> {
  const list = await loadInternal();
  return list.find((c) => c.id === id) ?? null;
}

export type SaveCharacterInput = {
  player: Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null };
  source?: CharacterSource;
};

/** Add a character. A fresh id is minted unless the incoming id is unused. */
export async function saveCharacterToLibrary(
  input: SaveCharacterInput,
): Promise<SavedCharacter[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((c) => c.id));
    const incomingId =
      typeof input.player.id === "string" && input.player.id && !known.has(input.player.id)
        ? input.player.id
        : newId();
    const player = fixPlayer({ ...input.player, id: incomingId, tokenId: null });
    if (!player) {
      throw new Error("This character needs at least a name.");
    }
    const now = new Date().toISOString();
    const record: SavedCharacter = {
      id: incomingId,
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "created",
      player: { ...player, tokenId: null },
    };
    const list = [record, ...existing].slice(0, MAX_CHARACTERS);
    await persist(list);
    return list;
  });
}

/** Replace an existing character's sheet (identity and createdAt are kept). */
export async function updateCharacterInLibrary(
  id: string,
  player: Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null },
): Promise<SavedCharacter[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((c) => {
      if (c.id !== id) return c;
      const fixed = fixPlayer({ ...player, id, tokenId: null });
      return fixed ? { ...c, player: { ...fixed, tokenId: null }, updatedAt: now } : c;
    });
    await persist(list);
    return list;
  });
}

export async function deleteSavedCharacter(id: string): Promise<SavedCharacter[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((c) => c.id !== id);
    await persist(list);
    return list;
  });
}

/**
 * Merge characters from a backup file. Rows with ids that already exist are
 * skipped (non-destructive restore).
 */
export async function importSavedCharacters(
  rows: unknown[],
): Promise<{ added: number; characters: SavedCharacter[] }> {
  if (typeof window === "undefined") return { added: 0, characters: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((c) => c.id));
    const incoming = rows
      .map((row) => fixSavedCharacter(row))
      .filter((c): c is SavedCharacter => c !== null && !known.has(c.id));
    const next = [...incoming, ...existing].slice(0, MAX_CHARACTERS);
    await persist(next);
    return { added: incoming.length, characters: next };
  });
}

/** Subscribe to character library changes (same tab or other tabs). */
export function onCharactersChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(CHARACTERS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHARACTERS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/* ---- Sorting for the character page ---- */

export type CharacterSortKey = "updated" | "name" | "level" | "className";

export const CHARACTER_SORT_LABEL: Record<CharacterSortKey, string> = {
  updated: "Recently updated",
  name: "Name (A–Z)",
  level: "Level (high first)",
  className: "Class (A–Z)",
};

export function sortSavedCharacters(
  list: SavedCharacter[],
  key: CharacterSortKey,
): SavedCharacter[] {
  const sorted = [...list];
  switch (key) {
    case "name":
      sorted.sort((a, b) => a.player.name.localeCompare(b.player.name));
      break;
    case "level":
      sorted.sort(
        (a, b) =>
          b.player.level - a.player.level || a.player.name.localeCompare(b.player.name),
      );
      break;
    case "className":
      sorted.sort(
        (a, b) =>
          a.player.className.localeCompare(b.player.className) ||
          a.player.name.localeCompare(b.player.name),
      );
      break;
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return sorted;
}
