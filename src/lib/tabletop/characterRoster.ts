import type { PlayerCharacter } from "./types";
import { fixPlayer, newId } from "./session";

const IDB_NAME = "ddeasy-character-rosters-v1";
const IDB_STORE = "kv";
const IDB_KEY = "rosters";
/** localStorage mirror — survives IDB quirks and syncs across tabs. */
const LOCAL_STORAGE_KEY = "ddeasy-character-rosters-v1";

export const ROSTERS_CHANGED_EVENT = "ddeasy-rosters-changed";

export type PartySource = "workshop" | "vtt" | "import";

export type SavedCharacterRoster = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: PartySource;
  /** DM campaign notes (plot threads, downtime, treasure, etc.). */
  notes: string;
  markdown: string;
  players: PlayerCharacter[];
};

const MAX_ROSTERS = 32;

const PARTY_SOURCES: PartySource[] = ["workshop", "vtt", "import"];

export const PARTY_SOURCE_LABEL: Record<PartySource, string> = {
  workshop: "Workshop",
  vtt: "Virtual Table",
  import: "Imported file",
};

function normalizeSource(value: unknown): PartySource {
  return typeof value === "string" && (PARTY_SOURCES as string[]).includes(value)
    ? (value as PartySource)
    : "import";
}

function normalizePlayers(players: Omit<PlayerCharacter, "tokenId">[]): PlayerCharacter[] {
  return players
    .map((p) =>
      fixPlayer({
        ...p,
        tokenId: null,
        currentHp: p.currentHp ?? null,
        items: p.items ?? [],
      } as Record<string, unknown>),
    )
    .filter((p): p is PlayerCharacter => p !== null)
    .map((p) => ({ ...p, tokenId: null }));
}

/** Validates and upgrades a persisted roster row. */
export function fixSavedRoster(value: unknown): SavedCharacterRoster | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !Array.isArray(o.players)) {
    return null;
  }
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const players = o.players
    .map((p) =>
      typeof p === "object" && p !== null
        ? fixPlayer({ ...(p as Record<string, unknown>), tokenId: null })
        : null,
    )
    .filter((p): p is PlayerCharacter => p !== null)
    .map((p) => ({ ...p, tokenId: null }));

  return {
    id: o.id,
    name: o.name.trim() || "Saved party",
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    source: normalizeSource(o.source),
    notes: typeof o.notes === "string" ? o.notes : "",
    markdown: typeof o.markdown === "string" ? o.markdown : "",
    players,
  };
}

function parseJsonArray(raw: string): SavedCharacterRoster[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedRoster(row))
      .filter((r): r is SavedCharacterRoster => r !== null);
  } catch {
    return [];
  }
}

function sortRosters(list: SavedCharacterRoster[]): SavedCharacterRoster[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyRostersChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ROSTERS_CHANGED_EVENT));
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

async function idbGetItems(): Promise<SavedCharacterRoster[] | undefined> {
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
            .map((row) => fixSavedRoster(row))
            .filter((r): r is SavedCharacterRoster => r !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetItems(items: SavedCharacterRoster[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedCharacterRoster[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedCharacterRoster[]> {
  if (typeof window === "undefined") return [];

  try {
    let items = await idbGetItems();
    if (items === undefined || items.length === 0) {
      const legacy = loadFromLocalStorage();
      if (legacy.length > 0) {
        items = legacy;
        try {
          await idbSetItems(items);
        } catch {
          /* keep legacy */
        }
      } else {
        items = [];
        try {
          await idbSetItems([]);
        } catch {
          /* IDB may be unavailable */
        }
      }
    }
    return sortRosters(items);
  } catch {
    return sortRosters(loadFromLocalStorage());
  }
}

async function persist(list: SavedCharacterRoster[]): Promise<void> {
  const sorted = sortRosters(list);
  let lastError: unknown = null;

  try {
    await idbSetItems(sorted);
  } catch (err) {
    lastError = err;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyRostersChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("Could not save party library");
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

export async function loadSavedCharacterRosters(): Promise<SavedCharacterRoster[]> {
  return loadInternal();
}

export async function getSavedCharacterRoster(id: string): Promise<SavedCharacterRoster | null> {
  const list = await loadInternal();
  return list.find((r) => r.id === id) ?? null;
}

export type SaveRosterInput = {
  name: string;
  markdown?: string;
  notes?: string;
  source?: PartySource;
  players: Omit<PlayerCharacter, "tokenId">[];
};

export async function saveCharacterRoster(input: SaveRosterInput): Promise<SavedCharacterRoster[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const normalized = normalizePlayers(input.players);
    if (normalized.length === 0 && input.players.length > 0) {
      throw new Error("Could not store any characters from this roster.");
    }

    const now = new Date().toISOString();
    const roster: SavedCharacterRoster = {
      id: newId(),
      name: input.name.trim() || "Saved party",
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "workshop",
      notes: input.notes?.trim() ?? "",
      markdown: input.markdown ?? "",
      players: normalized,
    };
    const list = [roster, ...(await loadInternal())].slice(0, MAX_ROSTERS);
    await persist(list);
    return list;
  });
}

export type UpdateRosterPatch = {
  name?: string;
  notes?: string;
  markdown?: string;
  source?: PartySource;
  players?: PlayerCharacter[];
};

export async function updateCharacterRoster(
  id: string,
  patch: UpdateRosterPatch,
): Promise<SavedCharacterRoster[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        name: patch.name !== undefined ? patch.name.trim() || r.name : r.name,
        notes: patch.notes !== undefined ? patch.notes : r.notes,
        markdown: patch.markdown !== undefined ? patch.markdown : r.markdown,
        source: patch.source ?? r.source,
        updatedAt: now,
        players:
          patch.players !== undefined
            ? patch.players.map((p) => ({ ...p, tokenId: null }))
            : r.players,
      };
    });
    await persist(list);
    return list;
  });
}

export async function deleteSavedCharacterRoster(id: string): Promise<SavedCharacterRoster[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((r) => r.id !== id);
    await persist(list);
    return list;
  });
}

/** Clone saved roster players with fresh ids for a one-off import (no campaign link). */
export function cloneRosterPlayers(
  roster: SavedCharacterRoster,
): Omit<PlayerCharacter, "tokenId">[] {
  return roster.players.map((p) => ({
    ...p,
    id: newId(),
    tokenId: null,
    items: p.items.map((item) => ({ ...item, id: newId() })),
  }));
}

/** Subscribe to party library changes (same tab or other tabs). */
export function onRostersChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(ROSTERS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ROSTERS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
