/**
 * Lore Vault parking lot — operational staging for CFs.
 *
 * The vault remains a live index of Library CFs, plus an explicit "parked"
 * membership list so DMs can drag *into* the vault (stage) and *out* to
 * campaigns / character sheets. Parking never deletes Library originals.
 */

const IDB_NAME = "ddeasy-vault-parking-v1";
const IDB_STORE = "kv";
const IDB_KEY = "parked";
const LOCAL_STORAGE_KEY = "ddeasy-vault-parking-v1";

export const VAULT_PARKING_CHANGED_EVENT = "ddeasy-vault-parking-changed";

export type VaultParkedEntry = {
  id: string;
  ciClass: string;
  title: string;
  detail: string;
  parkedAt: string;
  /** Library CF id (same as id for most rows). */
  libraryId: string;
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
  window.dispatchEvent(new Event(VAULT_PARKING_CHANGED_EVENT));
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

function parseList(raw: string | null): VaultParkedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is VaultParkedEntry =>
        !!row &&
        typeof row === "object" &&
        typeof (row as VaultParkedEntry).id === "string" &&
        typeof (row as VaultParkedEntry).title === "string",
    );
  } catch {
    return [];
  }
}

async function loadInternal(): Promise<VaultParkedEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openDb();
    const fromIdb = await new Promise<VaultParkedEntry[] | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
      req.onsuccess = () => {
        const v = req.result;
        resolve(Array.isArray(v) ? (v as VaultParkedEntry[]) : null);
      };
    });
    if (fromIdb) return fromIdb;
  } catch {
    /* fall through */
  }
  return parseList(window.localStorage.getItem(LOCAL_STORAGE_KEY));
}

async function persist(list: VaultParkedEntry[]): Promise<void> {
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

export async function loadVaultParkingLot(): Promise<VaultParkedEntry[]> {
  return loadInternal();
}

export async function parkCfInVault(entry: {
  id: string;
  ciClass: string;
  title: string;
  detail?: string;
}): Promise<VaultParkedEntry[]> {
  // Deliberate re-park clears a prior trash/purge exclusion.
  try {
    const { clearVaultExclusion } = await import("@/lib/vault/vaultExclusion");
    await clearVaultExclusion(entry.id);
  } catch {
    /* exclusion store optional during early boot / tests */
  }

  return withWriteLock(async () => {
    const list = await loadInternal();
    if (list.some((row) => row.id === entry.id)) return list;
    const next: VaultParkedEntry = {
      id: entry.id,
      ciClass: entry.ciClass,
      title: entry.title,
      detail: entry.detail ?? "",
      parkedAt: new Date().toISOString(),
      libraryId: entry.id,
    };
    const out = [next, ...list].slice(0, 256);
    await persist(out);
    return out;
  });
}

export async function unparkCfFromVault(id: string): Promise<VaultParkedEntry[]> {
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((row) => row.id !== id);
    await persist(list);
    return list;
  });
}

/** Replace the entire parking lot (used by SRD stub reconciliation). */
export async function replaceVaultParkingLot(
  list: VaultParkedEntry[],
): Promise<VaultParkedEntry[]> {
  return withWriteLock(async () => {
    const capped = list.slice(0, 256);
    await persist(capped);
    return capped;
  });
}

export async function isParkedInVault(id: string): Promise<boolean> {
  const list = await loadInternal();
  return list.some((row) => row.id === id);
}
