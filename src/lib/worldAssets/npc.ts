/**
 * NPC Creation Files (`npc.record`) — named NPCs with motives, secrets, and links.
 */

const IDB_NAME = "ddeasy-npc-library-v1";
const IDB_STORE = "kv";
const IDB_KEY = "npcs";
const LOCAL_STORAGE_KEY = "ddeasy-npc-library-v1";

export const NPCS_CHANGED_EVENT = "ddeasy-npcs-changed";
const MAX_NPCS = 256;

export type NpcSource = "created" | "import";

export type SavedNpc = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  briefDescription: string;
  tags: string[];
  motivation: string;
  secrets: string;
  statBlockRef: string | null;
  locationId: string | null;
  factionIds: string[];
  markdown: string;
  source: NpcSource;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string"))]
    : [];
}

export function fixSavedNpc(value: unknown): SavedNpc | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    name: o.name.trim(),
    briefDescription: typeof o.briefDescription === "string" ? o.briefDescription : "",
    tags: stringArray(o.tags),
    motivation: typeof o.motivation === "string" ? o.motivation : "",
    secrets: typeof o.secrets === "string" ? o.secrets : "",
    statBlockRef: typeof o.statBlockRef === "string" ? o.statBlockRef : null,
    locationId: typeof o.locationId === "string" ? o.locationId : null,
    factionIds: stringArray(o.factionIds),
    markdown: typeof o.markdown === "string" ? o.markdown : "",
    source: o.source === "created" ? "created" : "import",
  };
}

function parseJsonArray(raw: string): SavedNpc[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => fixSavedNpc(row)).filter((n): n is SavedNpc => n !== null);
  } catch {
    return [];
  }
}

function sortByUpdated(list: SavedNpc[]): SavedNpc[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NPCS_CHANGED_EVENT));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("indexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
    });
  }
  return dbPromise;
}

async function idbGet(): Promise<SavedNpc[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) {
        resolve(v.map((row) => fixSavedNpc(row)).filter((n): n is SavedNpc => n !== null));
      } else resolve(undefined);
    };
  });
}

async function idbSet(items: SavedNpc[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedNpc[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  try {
    let items = await idbGet();
    if (items === undefined || items.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        items = mirror;
        try {
          await idbSet(items);
        } catch {
          /* keep mirror */
        }
      } else items = [];
    }
    return sortByUpdated(items);
  } catch {
    return sortByUpdated(loadFromLocalStorage());
  }
}

async function persist(list: SavedNpc[]): Promise<void> {
  const sorted = sortByUpdated(list);
  let lastError: unknown = null;
  try {
    await idbSet(sorted);
  } catch (err) {
    lastError = err;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }
  if (lastError) throw lastError instanceof Error ? lastError : new Error("Could not save NPCs");
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

export async function loadSavedNpcs(): Promise<SavedNpc[]> {
  return loadInternal();
}

export type SaveNpcInput = {
  name: string;
  briefDescription?: string;
  tags?: string[];
  motivation?: string;
  secrets?: string;
  statBlockRef?: string | null;
  locationId?: string | null;
  factionIds?: string[];
  markdown?: string;
  source?: NpcSource;
};

export async function saveNpc(input: SaveNpcInput): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    if (!input.name.trim()) throw new Error("An NPC needs at least a name.");
    const now = new Date().toISOString();
    const record: SavedNpc = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      briefDescription: input.briefDescription?.trim() ?? "",
      tags: stringArray(input.tags),
      motivation: input.motivation ?? "",
      secrets: input.secrets ?? "",
      statBlockRef: input.statBlockRef ?? null,
      locationId: input.locationId ?? null,
      factionIds: stringArray(input.factionIds),
      markdown: input.markdown ?? `# ${input.name.trim()}\n\n`,
      source: input.source ?? "created",
    };
    const list = [record, ...(await loadInternal())].slice(0, MAX_NPCS);
    await persist(list);
    return list;
  });
}

export async function updateNpc(id: string, patch: SaveNpcInput): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        name: patch.name.trim() || row.name,
        briefDescription: patch.briefDescription?.trim() ?? row.briefDescription,
        tags: patch.tags !== undefined ? stringArray(patch.tags) : row.tags,
        motivation: patch.motivation ?? row.motivation,
        secrets: patch.secrets ?? row.secrets,
        statBlockRef: patch.statBlockRef !== undefined ? patch.statBlockRef : row.statBlockRef,
        locationId: patch.locationId !== undefined ? patch.locationId : row.locationId,
        factionIds: patch.factionIds !== undefined ? stringArray(patch.factionIds) : row.factionIds,
        markdown: patch.markdown ?? row.markdown,
        updatedAt: now,
      };
    });
    await persist(list);
    return list;
  });
}

export async function deleteSavedNpc(id: string): Promise<SavedNpc[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((row) => row.id !== id);
    await persist(list);
    return list;
  });
}

export async function importSavedNpcs(
  rows: unknown[],
): Promise<{ added: number; npcs: SavedNpc[] }> {
  if (typeof window === "undefined") return { added: 0, npcs: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((n) => n.id));
    const incoming = rows
      .map((row) => fixSavedNpc(row))
      .filter((n): n is SavedNpc => n !== null && !known.has(n.id));
    const next = [...incoming, ...existing].slice(0, MAX_NPCS);
    await persist(next);
    return { added: incoming.length, npcs: next };
  });
}

export function onNpcsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(NPCS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(NPCS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
