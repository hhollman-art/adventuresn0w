/**
 * `defineCollection` — the single Document engine behind every Library store.
 *
 * One call replaces the per-model boilerplate (private IndexedDB database,
 * localStorage mirror, write lock, change event, cap, import-merge). Storage
 * modules keep their public functions and delegate to the returned collection.
 */

import {
  indexedDbDocumentBackend,
  type DocumentBackend,
  type LibraryDocument,
} from "./documentBackend";
import type { LegacySource } from "./legacySources";

export type { DocumentBackend, LibraryDocument } from "./documentBackend";
export type { LegacySource } from "./legacySources";

export type CollectionDefinition<T extends LibraryDocument> = {
  /** Stable collection key inside `ddeasy-library` — never rename once shipped. */
  name: string;
  /** Boundary validator; rows it rejects are dropped on every read and import. */
  normalize: (value: unknown) => T | null;
  max: number;
  /** Window event dispatched after every successful write. */
  changedEvent: string;
  /** Persisted order; also the order `load()` returns. */
  compare?: (a: T, b: T) => number;
  /** localStorage key holding a full copy — fallback store and cross-tab `storage` signal. */
  mirrorKey?: string;
  /** Pre-Library stores imported once (merge by id, existing rows win). */
  legacySources?: LegacySource[];
  backend?: DocumentBackend;
};

export type Collection<T extends LibraryDocument> = {
  readonly name: string;
  readonly changedEvent: string;
  readonly max: number;
  load(): Promise<T[]>;
  /**
   * Serialized read-modify-write. Returns the rows `mutate` produced (capped to
   * `max`); the stored copy is sorted by `compare`.
   */
  write(mutate: (current: T[]) => T[] | Promise<T[]>): Promise<T[]>;
  /** Non-destructive merge: new ids are prepended, existing ids are skipped. */
  importRows(rows: unknown[]): Promise<{ added: number; rows: T[] }>;
  subscribe(listener: () => void): () => void;
};

const MIGRATED_META_PREFIX = "migrated:";

export function defineCollection<T extends LibraryDocument>(
  definition: CollectionDefinition<T>,
): Collection<T> {
  const { name, normalize, max, changedEvent, compare, mirrorKey } = definition;
  const legacySources = definition.legacySources ?? [];
  const backend = definition.backend ?? indexedDbDocumentBackend();

  function normalizeAll(raw: readonly unknown[]): T[] {
    const seen = new Set<string>();
    const rows: T[] = [];
    for (const value of raw) {
      const row = normalize(value);
      if (row && !seen.has(row.id)) {
        seen.add(row.id);
        rows.push(row);
      }
    }
    return rows;
  }

  function sortRows(rows: readonly T[]): T[] {
    return compare ? [...rows].sort(compare) : [...rows];
  }

  function readMirror(): T[] {
    if (!mirrorKey || typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(mirrorKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? normalizeAll(parsed) : [];
    } catch {
      return [];
    }
  }

  function notifyChanged(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(changedEvent));
  }

  let migration: Promise<void> | null = null;

  async function migrateLegacy(): Promise<void> {
    const metaKey = `${MIGRATED_META_PREFIX}${name}`;
    if (await backend.readMeta(metaKey)) return;
    const current = normalizeAll(await backend.readAll(name));
    const known = new Set(current.map((row) => row.id));
    const incoming: T[] = [];
    for (const source of legacySources) {
      let raw: unknown[] | undefined;
      try {
        raw = await source();
      } catch {
        raw = undefined;
      }
      for (const row of normalizeAll(raw ?? [])) {
        if (known.has(row.id)) continue;
        known.add(row.id);
        incoming.push(row);
      }
    }
    if (incoming.length > 0) {
      await backend.replaceAll(name, sortRows([...current, ...incoming]).slice(0, max));
    }
    await backend.writeMeta(metaKey, new Date().toISOString());
  }

  function ensureMigrated(): Promise<void> {
    if (legacySources.length === 0) return Promise.resolve();
    if (!migration) {
      migration = migrateLegacy().catch((err: unknown) => {
        migration = null;
        throw err;
      });
    }
    return migration;
  }

  async function loadInternal(): Promise<T[]> {
    try {
      await ensureMigrated();
      let rows = normalizeAll(await backend.readAll(name));
      if (rows.length === 0) {
        const mirror = readMirror();
        if (mirror.length > 0) {
          rows = mirror;
          try {
            await backend.replaceAll(name, sortRows(mirror));
          } catch {
            /* keep mirror */
          }
        }
      }
      return sortRows(rows);
    } catch {
      return sortRows(readMirror());
    }
  }

  async function persist(rows: readonly T[]): Promise<void> {
    const sorted = sortRows(normalizeAll(rows));
    let lastError: unknown = null;
    try {
      await backend.replaceAll(name, sorted);
    } catch (err) {
      lastError = err;
    }
    try {
      if (mirrorKey && typeof localStorage !== "undefined") {
        localStorage.setItem(mirrorKey, JSON.stringify(sorted));
      }
      notifyChanged();
    } catch (err) {
      lastError = err;
    }
    if (lastError) {
      throw lastError instanceof Error ? lastError : new Error(`Could not save ${name}.`);
    }
  }

  let writeMutex: Promise<void> = Promise.resolve();

  function withWriteLock<R>(fn: () => Promise<R>): Promise<R> {
    const run = writeMutex.then(fn, fn);
    writeMutex = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    name,
    changedEvent,
    max,

    load: loadInternal,

    write(mutate) {
      return withWriteLock(async () => {
        const next = (await mutate(await loadInternal())).slice(0, max);
        await persist(next);
        return next;
      });
    },

    importRows(rows) {
      return withWriteLock(async () => {
        const existing = await loadInternal();
        const known = new Set(existing.map((row) => row.id));
        const incoming = normalizeAll(rows).filter((row) => !known.has(row.id));
        const next = [...incoming, ...existing].slice(0, max);
        await persist(next);
        return { added: incoming.length, rows: next };
      });
    },

    subscribe(listener) {
      if (typeof window === "undefined") return () => undefined;
      const handler = () => listener();
      window.addEventListener(changedEvent, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(changedEvent, handler);
        window.removeEventListener("storage", handler);
      };
    },
  };
}
