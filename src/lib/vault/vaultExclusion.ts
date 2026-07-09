/**
 * Lore Vault exclusion list — CFs hard-purged / trashed from the vault.
 *
 * Excluded ids are hidden from the vault drawer (parked + library index).
 * Library originals are not deleted. Re-parking clears the exclusion so the
 * DM can stage the CF again deliberately.
 */

const IDB_NAME = "ddeasy-vault-exclusion-v1";
const IDB_STORE = "kv";
const IDB_KEY = "excluded";
const LOCAL_STORAGE_KEY = "ddeasy-vault-exclusion-v1";

export const VAULT_EXCLUSION_CHANGED_EVENT = "ddeasy-vault-exclusion-changed";

export type VaultExclusionEntry = {
  id: string;
  title: string;
  excludedAt: string;
  /** Optional SRD provenance so hydrated twins stay hidden too. */
  sourceSrdEntityId?: string | null;
};

let writeChain: Promise<void> = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VAULT_EXCLUSION_CHANGED_EVENT));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

function parseList(raw: string | null): VaultExclusionEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is VaultExclusionEntry =>
        !!row &&
        typeof row === "object" &&
        typeof (row as VaultExclusionEntry).id === "string",
    );
  } catch {
    return [];
  }
}

async function loadInternal(): Promise<VaultExclusionEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openDb();
    const fromIdb = await new Promise<VaultExclusionEntry[] | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
      req.onsuccess = () => {
        const v = req.result;
        resolve(Array.isArray(v) ? (v as VaultExclusionEntry[]) : null);
      };
    });
    if (fromIdb) return fromIdb;
  } catch {
    /* fall through */
  }
  return parseList(window.localStorage.getItem(LOCAL_STORAGE_KEY));
}

async function persist(list: VaultExclusionEntry[]): Promise<void> {
  const json = JSON.stringify(list);
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
      tx.objectStore(IDB_STORE).put(list, IDB_KEY);
    });
  } catch {
    /* localStorage mirror is enough */
  }
  notify();
}

export async function loadVaultExclusions(): Promise<VaultExclusionEntry[]> {
  return loadInternal();
}

export async function loadVaultExcludedIds(): Promise<Set<string>> {
  const list = await loadInternal();
  const ids = new Set<string>();
  for (const row of list) {
    ids.add(row.id);
    if (row.sourceSrdEntityId) ids.add(row.sourceSrdEntityId);
  }
  return ids;
}

export async function isExcludedFromVault(id: string): Promise<boolean> {
  const list = await loadInternal();
  return list.some((row) => row.id === id || row.sourceSrdEntityId === id);
}

export async function excludeFromVault(entry: {
  id: string;
  title?: string;
  sourceSrdEntityId?: string | null;
}): Promise<VaultExclusionEntry[]> {
  return withWriteLock(async () => {
    const list = await loadInternal();
    if (list.some((row) => row.id === entry.id)) return list;
    const next: VaultExclusionEntry = {
      id: entry.id,
      title: entry.title?.trim() || entry.id,
      excludedAt: new Date().toISOString(),
      sourceSrdEntityId: entry.sourceSrdEntityId ?? null,
    };
    const out = [next, ...list].slice(0, 512);
    await persist(out);
    return out;
  });
}

/** Clear exclusion when the DM deliberately parks the CF again. */
export async function clearVaultExclusion(id: string): Promise<VaultExclusionEntry[]> {
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter(
      (row) => row.id !== id && row.sourceSrdEntityId !== id,
    );
    await persist(list);
    return list;
  });
}

export function entryIsVaultExcluded(
  entry: { id: string; sourceSrdEntityId?: string | null },
  excludedIds: Set<string>,
): boolean {
  if (excludedIds.has(entry.id)) return true;
  if (entry.sourceSrdEntityId && excludedIds.has(entry.sourceSrdEntityId)) return true;
  return false;
}
