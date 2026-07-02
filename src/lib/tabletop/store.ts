import type { TabletopSession } from "./types";
import { fixSession } from "./session";

const IDB_NAME = "ddeasy-tabletop-v1";
const IDB_STORE = "kv";
const IDB_SESSION_KEY = "session";

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

export async function loadTabletopSession(): Promise<TabletopSession | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = await openDb();
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_SESSION_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
      req.onsuccess = () => resolve(req.result);
    });
    return fixSession(value);
  } catch {
    return null;
  }
}

let saveQueue = Promise.resolve();

export function saveTabletopSession(session: TabletopSession): void {
  if (typeof window === "undefined") return;
  saveQueue = saveQueue
    .then(async () => {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
        tx.objectStore(IDB_STORE).put(session, IDB_SESSION_KEY);
      });
    })
    .catch(() => {
      /* storage best-effort; live table keeps working from memory */
    });
}
