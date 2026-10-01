/**
 * Container relationship index — persisted `relationships[]` rows written when
 * a Creation File is instantiated into a container (campaign / character).
 *
 * Why a separate store: `campaignToContainerCF` / `characterToContainerCF`
 * are pure projections of Tier-1 id lists. They cannot carry the local
 * `instanceId` for things the row shape has no field for (spell instances,
 * campaign loot instances, scene effects). This index persists exactly those
 * rows; projections merge them back via `persisted`.
 *
 * Tier-1 membership (`SavedCampaign` ids, embedded gear) stays authoritative —
 * this index never removes it. Dangling rows (child no longer on the parent)
 * are tolerated and filtered at read time by `reconcileContainerRelationships`.
 */

import type { CiClass } from "@/lib/ciRegistry";
import type {
  CfRelationship,
  ContainerRelationKind,
  ContainerSlot,
} from "@/lib/workshop/containerCf";
import { relationshipKey, spellKeyFromSrdEntityId } from "@/lib/workshop/containerCf";

const IDB_NAME = "ddeasy-container-relationships-v1";
const IDB_STORE = "kv";
const IDB_KEY = "relationships";
const LOCAL_STORAGE_KEY = "ddeasy-container-relationships-v1";

export const CONTAINER_RELATIONSHIPS_CHANGED_EVENT = "ddeasy-container-relationships-changed";

/** Hard cap — 100× today's expected volume still fits one IDB value. */
export const MAX_CONTAINER_RELATIONSHIPS = 20_000;

const RELATION_KINDS: readonly ContainerRelationKind[] = ["link", "embed", "park", "modifier"];
const SLOTS: readonly ContainerSlot[] = [
  "inventory",
  "spells",
  "effects",
  "party",
  "adventure",
  "scene",
  "loot",
  "members",
  "vault",
  "general",
  "locations",
  "encounters",
];

/** Validate and normalize one persisted relationship row. */
export function fixCfRelationship(value: unknown): CfRelationship | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.parentId !== "string" ||
    typeof o.parentCiClass !== "string" ||
    typeof o.childId !== "string" ||
    typeof o.childCiClass !== "string" ||
    !o.id ||
    !o.parentId ||
    !o.childId
  ) {
    return null;
  }
  if (!(RELATION_KINDS as readonly string[]).includes(String(o.kind))) return null;
  if (!(SLOTS as readonly string[]).includes(String(o.slot))) return null;

  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const rel: CfRelationship = {
    id: o.id,
    parentId: o.parentId,
    parentCiClass: o.parentCiClass as CiClass,
    childId: o.childId,
    childCiClass: o.childCiClass as CiClass,
    kind: o.kind as ContainerRelationKind,
    slot: o.slot as ContainerSlot,
    label: typeof o.label === "string" ? o.label : o.childId,
    active: o.active !== false,
    createdAt,
  };
  if (typeof o.sourceLibraryId === "string") rel.sourceLibraryId = o.sourceLibraryId;
  else if (o.sourceLibraryId === null) rel.sourceLibraryId = null;
  if (typeof o.notes === "string") rel.notes = o.notes;
  if (o._source === "SRD" && typeof o.instanceId === "string") {
    rel._source = "SRD";
    rel.instanceId = o.instanceId;
    rel.sourceSrdEntityId =
      typeof o.sourceSrdEntityId === "string" ? o.sourceSrdEntityId : null;
  }
  return rel;
}

/** Upsert by membership key (parent + slot + child); newest row wins. Pure. */
export function upsertRelationshipRows(
  list: readonly CfRelationship[],
  incoming: readonly CfRelationship[],
): CfRelationship[] {
  const byKey = new Map<string, CfRelationship>();
  for (const rel of list) byKey.set(relationshipKey(rel), rel);
  for (const rel of incoming) {
    const key = relationshipKey(rel);
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, ...rel, id: existing.id } : rel);
  }
  const merged = [...byKey.values()];
  if (merged.length <= MAX_CONTAINER_RELATIONSHIPS) return merged;
  // Keep the newest rows when over cap.
  return [...merged]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_CONTAINER_RELATIONSHIPS);
}

/**
 * Drop persisted rows whose child no longer exists on the parent. Pure — the
 * caller supplies the live child ids per slot. Rows for slots not supplied are
 * kept untouched (unknown ≠ deleted).
 */
export function reconcileContainerRelationships(
  rows: readonly CfRelationship[],
  live: Partial<Record<ContainerSlot, ReadonlySet<string>>>,
): CfRelationship[] {
  return rows.filter((rel) => {
    const ids = live[rel.slot];
    if (!ids) return true;
    if (ids.has(rel.childId)) return true;
    // Spell instances are keyed by catalogue key on the sheet, not instanceId.
    if (rel.slot === "spells" && rel.sourceSrdEntityId) {
      const key = spellKeyFromSrdEntityId(rel.sourceSrdEntityId);
      if (key && ids.has(key)) return true;
    }
    if (rel.sourceLibraryId && ids.has(rel.sourceLibraryId)) return true;
    return false;
  });
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONTAINER_RELATIONSHIPS_CHANGED_EVENT));
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

function fixList(value: unknown): CfRelationship[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => fixCfRelationship(row))
    .filter((r): r is CfRelationship => r !== null);
}

async function idbGetAll(): Promise<CfRelationship[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      resolve(v === undefined ? undefined : fixList(v));
    };
  });
}

async function idbSetAll(rows: CfRelationship[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(rows, IDB_KEY);
  });
}

function loadFromLocalStorage(): CfRelationship[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  try {
    return fixList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

async function loadAllInternal(): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  try {
    let rows = await idbGetAll();
    if (rows === undefined || rows.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        rows = mirror;
        try {
          await idbSetAll(rows);
        } catch {
          /* keep mirror */
        }
      } else {
        rows = [];
      }
    }
    return rows;
  } catch {
    return loadFromLocalStorage();
  }
}

async function persistAll(rows: CfRelationship[]): Promise<void> {
  let lastError: unknown = null;
  // Without IndexedDB (old browsers, private modes) the mirror is the store.
  if (typeof indexedDB !== "undefined") {
    try {
      await idbSetAll(rows);
    } catch (err) {
      lastError = err;
    }
  }
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rows));
    notifyChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }
  if (lastError) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Could not save container relationships");
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

/* ---------------------------------------------------------------- */
/* Public async API — signatures stay stable if the backend changes.  */
/* ---------------------------------------------------------------- */

/** All persisted relationship rows (every container). */
export async function loadContainerRelationships(): Promise<CfRelationship[]> {
  return loadAllInternal();
}

/** Persisted rows owned by one container. */
export async function loadContainerRelationshipsFor(
  parentId: string,
): Promise<CfRelationship[]> {
  const all = await loadAllInternal();
  return all.filter((r) => r.parentId === parentId);
}

/** Reverse lookup — every container that holds this child / instance id. */
export async function containersHoldingChild(childId: string): Promise<CfRelationship[]> {
  const all = await loadAllInternal();
  return all.filter((r) => r.childId === childId || r.instanceId === childId);
}

/** Record (upsert) one or more relationship rows. Non-destructive. */
export async function recordContainerRelationship(
  rel: CfRelationship | readonly CfRelationship[],
): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  const incoming = Array.isArray(rel) ? (rel as readonly CfRelationship[]) : [rel as CfRelationship];
  if (incoming.length === 0) return loadAllInternal();
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const next = upsertRelationshipRows(current, incoming);
    await persistAll(next);
    return next;
  });
}

/** Remove one row by id. */
export async function removeContainerRelationship(id: string): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const next = current.filter((r) => r.id !== id);
    if (next.length !== current.length) await persistAll(next);
    return next;
  });
}

/**
 * Remove relationship rows for a child (or that instance id).
 *
 * - `(parentId, childId)` — only the rows where that container holds the child.
 * - `(childId)` — every row for the child in every container (hard purge of a
 *   local instance). Never touches the child's own storage (SRD corpus, Library).
 */
export async function removeContainerRelationshipsForChild(
  childId: string,
): Promise<CfRelationship[]>;
export async function removeContainerRelationshipsForChild(
  parentId: string,
  childId: string,
): Promise<CfRelationship[]>;
export async function removeContainerRelationshipsForChild(
  parentOrChildId: string,
  maybeChildId?: string,
): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  const parentId = maybeChildId === undefined ? null : parentOrChildId;
  const childId = maybeChildId ?? parentOrChildId;
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const next = current.filter(
      (r) =>
        !(
          (parentId === null || r.parentId === parentId) &&
          (r.childId === childId || r.instanceId === childId)
        ),
    );
    if (next.length !== current.length) await persistAll(next);
    return next;
  });
}

/**
 * Atomically move one row to a new container: delete `fromId` and upsert
 * `next` in a single write, so the child is never held by both (or neither).
 */
export async function reparentContainerRelationship(
  fromId: string,
  next: CfRelationship,
): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const rest = current.filter((r) => r.id !== fromId);
    const out = upsertRelationshipRows(rest, [next]);
    await persistAll(out);
    return out;
  });
}

/** Replace every row owned by one container in a single write. */
export async function replaceContainerRelationshipsForParent(
  parentId: string,
  rows: readonly CfRelationship[],
): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const rest = current.filter((r) => r.parentId !== parentId);
    const owned = rows.filter((r) => r.parentId === parentId);
    const out = upsertRelationshipRows(rest, owned);
    await persistAll(out);
    return out;
  });
}

/** Drop every row owned by a deleted container. Children are never touched. */
export async function removeContainerRelationshipsForParent(
  parentId: string,
): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const current = await loadAllInternal();
    const next = current.filter((r) => r.parentId !== parentId);
    if (next.length !== current.length) await persistAll(next);
    return next;
  });
}

/** Backup restore — merge by id, skip existing. */
export async function importContainerRelationships(
  rows: unknown[],
): Promise<{ added: number; relationships: CfRelationship[] }> {
  if (typeof window === "undefined") return { added: 0, relationships: [] };
  return withWriteLock(async () => {
    const existing = await loadAllInternal();
    const known = new Set(existing.map((r) => r.id));
    const knownKeys = new Set(existing.map((r) => relationshipKey(r)));
    const incoming = rows
      .map((row) => fixCfRelationship(row))
      .filter(
        (r): r is CfRelationship =>
          r !== null && !known.has(r.id) && !knownKeys.has(relationshipKey(r)),
      );
    if (incoming.length === 0) return { added: 0, relationships: existing };
    const next = upsertRelationshipRows(existing, incoming);
    await persistAll(next);
    return { added: incoming.length, relationships: next };
  });
}

export function onContainerRelationshipsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(CONTAINER_RELATIONSHIPS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CONTAINER_RELATIONSHIPS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
