/**
 * Read-only adapters for pre-Library storage (one IndexedDB database + one
 * localStorage key per model). Collections read these once to migrate rows
 * into `ddeasy-library`; legacy data is never modified or deleted.
 */

export type LegacySource = () => Promise<unknown[] | undefined>;

/** Rows stored as one array under `key` in a legacy `{dbName}/{storeName}` database. */
export function legacyKvDatabase(dbName: string, storeName: string, key: string): LegacySource {
  return () =>
    new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(undefined);
        return;
      }
      const req = indexedDB.open(dbName);
      // A missing legacy database would be created by open(); abort so nothing is left behind.
      req.onupgradeneeded = () => req.transaction?.abort();
      req.onerror = () => resolve(undefined);
      req.onblocked = () => resolve(undefined);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          resolve(undefined);
          return;
        }
        const get = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
        get.onerror = () => {
          db.close();
          resolve(undefined);
        };
        get.onsuccess = () => {
          db.close();
          resolve(Array.isArray(get.result) ? get.result : undefined);
        };
      };
    });
}

/** Rows stored as a JSON array under a legacy localStorage key. */
export function legacyLocalStorage(key: string): LegacySource {
  return async () => {
    if (typeof localStorage === "undefined") return undefined;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
}
