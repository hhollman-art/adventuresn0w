/**
 * Location Creation Files (`location.record`) — cities, dungeons, regions, and sites.
 */

const IDB_NAME = "ddeasy-location-library-v1";
const IDB_STORE = "kv";
const IDB_KEY = "locations";
const LOCAL_STORAGE_KEY = "ddeasy-location-library-v1";

export const LOCATIONS_CHANGED_EVENT = "ddeasy-locations-changed";
const MAX_LOCATIONS = 256;

export type LocationKind =
  | "city"
  | "dungeon"
  | "region"
  | "wilderness"
  | "site"
  | "plane"
  | "other";

export type LocationSource = "created" | "import";

export type SavedLocation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  locationKind: LocationKind;
  parentLocationId: string | null;
  inhabitantNpcIds: string[];
  factionIds: string[];
  timelineNotes: string;
  markdown: string;
  source: LocationSource;
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

const LOCATION_KINDS: LocationKind[] = [
  "city",
  "dungeon",
  "region",
  "wilderness",
  "site",
  "plane",
  "other",
];

function parseLocationKind(value: unknown): LocationKind {
  return typeof value === "string" && (LOCATION_KINDS as string[]).includes(value)
    ? (value as LocationKind)
    : "other";
}

export function fixSavedLocation(value: unknown): SavedLocation | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return null;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    name: o.name.trim(),
    locationKind: parseLocationKind(o.locationKind),
    parentLocationId: typeof o.parentLocationId === "string" ? o.parentLocationId : null,
    inhabitantNpcIds: stringArray(o.inhabitantNpcIds),
    factionIds: stringArray(o.factionIds),
    timelineNotes: typeof o.timelineNotes === "string" ? o.timelineNotes : "",
    markdown: typeof o.markdown === "string" ? o.markdown : "",
    source: o.source === "created" ? "created" : "import",
  };
}

function parseJsonArray(raw: string): SavedLocation[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => fixSavedLocation(row)).filter((l): l is SavedLocation => l !== null);
  } catch {
    return [];
  }
}

function sortByUpdated(list: SavedLocation[]): SavedLocation[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCATIONS_CHANGED_EVENT));
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

async function idbGet(): Promise<SavedLocation[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) {
        resolve(v.map((row) => fixSavedLocation(row)).filter((l): l is SavedLocation => l !== null));
      } else resolve(undefined);
    };
  });
}

async function idbSet(items: SavedLocation[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedLocation[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedLocation[]> {
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

async function persist(list: SavedLocation[]): Promise<void> {
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
  if (lastError) throw lastError instanceof Error ? lastError : new Error("Could not save locations");
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

export async function loadSavedLocations(): Promise<SavedLocation[]> {
  return loadInternal();
}

export type SaveLocationInput = {
  name: string;
  locationKind?: LocationKind;
  parentLocationId?: string | null;
  inhabitantNpcIds?: string[];
  factionIds?: string[];
  timelineNotes?: string;
  markdown?: string;
  source?: LocationSource;
};

export async function saveLocation(input: SaveLocationInput): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    if (!input.name.trim()) throw new Error("A location needs at least a name.");
    const now = new Date().toISOString();
    const record: SavedLocation = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      locationKind: input.locationKind ?? "other",
      parentLocationId: input.parentLocationId ?? null,
      inhabitantNpcIds: stringArray(input.inhabitantNpcIds),
      factionIds: stringArray(input.factionIds),
      timelineNotes: input.timelineNotes ?? "",
      markdown: input.markdown ?? `# ${input.name.trim()}\n\n`,
      source: input.source ?? "created",
    };
    const list = [record, ...(await loadInternal())].slice(0, MAX_LOCATIONS);
    await persist(list);
    return list;
  });
}

export async function updateLocation(
  id: string,
  patch: SaveLocationInput,
): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        name: patch.name.trim() || row.name,
        locationKind: patch.locationKind ?? row.locationKind,
        parentLocationId:
          patch.parentLocationId !== undefined ? patch.parentLocationId : row.parentLocationId,
        inhabitantNpcIds:
          patch.inhabitantNpcIds !== undefined
            ? stringArray(patch.inhabitantNpcIds)
            : row.inhabitantNpcIds,
        factionIds: patch.factionIds !== undefined ? stringArray(patch.factionIds) : row.factionIds,
        timelineNotes: patch.timelineNotes ?? row.timelineNotes,
        markdown: patch.markdown ?? row.markdown,
        updatedAt: now,
      };
    });
    await persist(list);
    return list;
  });
}

export async function deleteSavedLocation(id: string): Promise<SavedLocation[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((row) => row.id !== id);
    await persist(list);
    return list;
  });
}

export async function importSavedLocations(
  rows: unknown[],
): Promise<{ added: number; locations: SavedLocation[] }> {
  if (typeof window === "undefined") return { added: 0, locations: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((l) => l.id));
    const incoming = rows
      .map((row) => fixSavedLocation(row))
      .filter((l): l is SavedLocation => l !== null && !known.has(l.id));
    const next = [...incoming, ...existing].slice(0, MAX_LOCATIONS);
    await persist(next);
    return { added: incoming.length, locations: next };
  });
}

export function onLocationsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(LOCATIONS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(LOCATIONS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const LOCATION_KIND_LABEL: Record<LocationKind, string> = {
  city: "City",
  dungeon: "Dungeon",
  region: "Region",
  wilderness: "Wilderness",
  site: "Site",
  plane: "Plane",
  other: "Other",
};
