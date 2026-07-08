import { newId } from "@/lib/tabletop/session";
import type { SrdEntityId, SrdEntityKind } from "@/lib/srd/types";

/**
 * User-owned clones of bundled SRD entries — editable workspace copies.
 *
 * **Database migration note (future Prisma / Postgres):**
 * ```prisma
 * model SrdWorkspaceEntry {
 *   id              String   @id @default(uuid())
 *   userId          String?  // null = legacy local-only row; set when auth syncs
 *   sourceSrdId     String   // e.g. "spell:fireball"
 *   kind            String
 *   name            String
 *   markdown        String   @db.Text
 *   isReadOnly      Boolean  @default(false)
 *   provenance      String   @default("user")
 *   createdAt       DateTime @default(now())
 *   updatedAt       DateTime @updatedAt
 *   @@index([userId, sourceSrdId])
 * }
 * ```
 * Global SRD rows stay in bundled TS modules (`userId = null`, `isReadOnly = true`).
 */

const IDB_NAME = "ddeasy-srd-custom-library-v1";
const IDB_STORE = "kv";
const IDB_KEY = "entries";
const LOCAL_STORAGE_KEY = "ddeasy-srd-custom-library-v1";

export const CUSTOM_SRD_CHANGED_EVENT = "ddeasy-custom-srd-changed";

export const MAX_CUSTOM_SRD_ENTRIES = 512;
export const MAX_CUSTOM_SRD_MARKDOWN = 120_000;

export type SavedCustomSrdEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Owning DM account id when cloned while signed in; null for anonymous local prep. */
  userId: string | null;
  /** Always false for workspace clones — distinguishes from bundled SRD virtual rows. */
  isReadOnly: false;
  provenance: "user";
  source: "srd-clone";
  sourceSrdEntityId: SrdEntityId;
  kind: SrdEntityKind;
  name: string;
  subtitle: string | null;
  markdown: string;
};

export type SaveCustomSrdInput = {
  userId?: string | null;
  sourceSrdEntityId: SrdEntityId;
  kind: SrdEntityKind;
  name: string;
  subtitle?: string | null;
  markdown: string;
};

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOM_SRD_CHANGED_EVENT));
}

export function fixSavedCustomSrdEntry(value: unknown): SavedCustomSrdEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    !o.name.trim() ||
    typeof o.markdown !== "string" ||
    typeof o.sourceSrdEntityId !== "string" ||
    typeof o.kind !== "string"
  ) {
    return null;
  }
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    userId: typeof o.userId === "string" ? o.userId : null,
    isReadOnly: false,
    provenance: "user",
    source: "srd-clone",
    sourceSrdEntityId: o.sourceSrdEntityId as SrdEntityId,
    kind: o.kind as SrdEntityKind,
    name: o.name.trim(),
    subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
    markdown: o.markdown.slice(0, MAX_CUSTOM_SRD_MARKDOWN),
  };
}

function parseJsonArray(raw: string): SavedCustomSrdEntry[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedCustomSrdEntry(row))
      .filter((row): row is SavedCustomSrdEntry => row !== null);
  } catch {
    return [];
  }
}

function sortByUpdated(list: SavedCustomSrdEntry[]): SavedCustomSrdEntry[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

async function idbGetEntries(): Promise<SavedCustomSrdEntry[] | undefined> {
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
            .map((row) => fixSavedCustomSrdEntry(row))
            .filter((row): row is SavedCustomSrdEntry => row !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetEntries(entries: SavedCustomSrdEntry[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(entries, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedCustomSrdEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedCustomSrdEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    let entries = await idbGetEntries();
    if (entries === undefined || entries.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        entries = mirror;
        try {
          await idbSetEntries(entries);
        } catch {
          /* keep mirror */
        }
      } else {
        entries = [];
      }
    }
    return sortByUpdated(entries);
  } catch {
    return sortByUpdated(loadFromLocalStorage());
  }
}

async function persist(list: SavedCustomSrdEntry[]): Promise<void> {
  const sorted = sortByUpdated(list).slice(0, MAX_CUSTOM_SRD_ENTRIES);
  try {
    await idbSetEntries(sorted);
  } catch {
    /* IDB may fail in private mode */
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  notifyChanged();
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

export async function loadSavedCustomSrdEntries(): Promise<SavedCustomSrdEntry[]> {
  return loadInternal();
}

export function onCustomSrdChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CUSTOM_SRD_CHANGED_EVENT, listener);
  return () => window.removeEventListener(CUSTOM_SRD_CHANGED_EVENT, listener);
}

export async function saveCustomSrdEntry(input: SaveCustomSrdInput): Promise<SavedCustomSrdEntry[]> {
  return withWriteLock(async () => {
    const list = await loadInternal();
    const now = new Date().toISOString();
    const entry: SavedCustomSrdEntry = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      userId: input.userId ?? null,
      isReadOnly: false,
      provenance: "user",
      source: "srd-clone",
      sourceSrdEntityId: input.sourceSrdEntityId,
      kind: input.kind,
      name: input.name.trim(),
      subtitle: input.subtitle ?? null,
      markdown: input.markdown.slice(0, MAX_CUSTOM_SRD_MARKDOWN),
    };
    await persist([entry, ...list]);
    return loadInternal();
  });
}

export async function updateCustomSrdEntry(
  id: string,
  patch: Partial<Pick<SavedCustomSrdEntry, "name" | "subtitle" | "markdown">>,
): Promise<SavedCustomSrdEntry[]> {
  return withWriteLock(async () => {
    const list = await loadInternal();
    const now = new Date().toISOString();
    const next = list.map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        name: patch.name?.trim() || row.name,
        subtitle: patch.subtitle !== undefined ? patch.subtitle : row.subtitle,
        markdown:
          patch.markdown !== undefined
            ? patch.markdown.slice(0, MAX_CUSTOM_SRD_MARKDOWN)
            : row.markdown,
        updatedAt: now,
      };
    });
    await persist(next);
    return loadInternal();
  });
}

export async function deleteCustomSrdEntry(id: string): Promise<SavedCustomSrdEntry[]> {
  return withWriteLock(async () => {
    const list = await loadInternal();
    await persist(list.filter((row) => row.id !== id));
    return loadInternal();
  });
}

export async function importCustomSrdEntries(
  rows: SavedCustomSrdEntry[],
): Promise<SavedCustomSrdEntry[]> {
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const byId = new Map(existing.map((row) => [row.id, row]));
    for (const row of rows) {
      const fixed = fixSavedCustomSrdEntry(row);
      if (fixed) byId.set(fixed.id, fixed);
    }
    await persist([...byId.values()]);
    return loadInternal();
  });
}
