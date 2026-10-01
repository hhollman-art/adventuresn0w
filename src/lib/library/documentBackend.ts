/**
 * Library storage backends — where Document rows physically live.
 *
 * Every collection shares ONE IndexedDB database (`ddeasy-library`) with a
 * fixed schema, so adding a collection never needs a database version bump.
 * A future server/sync backend implements the same interface; callers of
 * `defineCollection` never change.
 */

export type LibraryDocument = { id: string };

export interface DocumentBackend {
  /** All stored rows for one collection (unnormalized — callers validate). */
  readAll(collection: string): Promise<unknown[]>;
  /** Atomically replace every row of one collection. */
  replaceAll(collection: string, documents: readonly LibraryDocument[]): Promise<void>;
  readMeta(key: string): Promise<unknown>;
  writeMeta(key: string, value: unknown): Promise<void>;
}

export const LIBRARY_DB_NAME = "ddeasy-library";
const LIBRARY_DB_VERSION = 1;
const DOCUMENTS_STORE = "documents";
const META_STORE = "meta";

type StoredDocument = { collection: string; id: string; document: unknown };

let dbPromise: Promise<IDBDatabase> | null = null;

function openLibraryDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("indexedDB unavailable"));
  if (!dbPromise) {
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          db.createObjectStore(DOCUMENTS_STORE, { keyPath: ["collection", "id"] });
        }
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      };
    });
    dbPromise = opening;
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null;
    });
  }
  return dbPromise;
}

/** Every key `[collection, <any string id>]` sorts between `[collection]` and `[collection, []]`. */
function collectionRange(collection: string): IDBKeyRange {
  return IDBKeyRange.bound([collection], [collection, []]);
}

function requestResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error ?? new Error("IDB request failed"));
    req.onsuccess = () => resolve(req.result);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB write aborted"));
  });
}

const indexedDbBackend: DocumentBackend = {
  async readAll(collection) {
    const db = await openLibraryDb();
    const tx = db.transaction(DOCUMENTS_STORE, "readonly");
    const rows = await requestResult(
      tx.objectStore(DOCUMENTS_STORE).getAll(collectionRange(collection)) as IDBRequest<StoredDocument[]>,
    );
    return rows.map((row) => row.document);
  },

  async replaceAll(collection, documents) {
    const db = await openLibraryDb();
    const tx = db.transaction(DOCUMENTS_STORE, "readwrite");
    const done = transactionDone(tx);
    const store = tx.objectStore(DOCUMENTS_STORE);
    store.delete(collectionRange(collection));
    for (const document of documents) {
      store.put({ collection, id: document.id, document } satisfies StoredDocument);
    }
    await done;
  },

  async readMeta(key) {
    const db = await openLibraryDb();
    const tx = db.transaction(META_STORE, "readonly");
    return requestResult(tx.objectStore(META_STORE).get(key));
  },

  async writeMeta(key, value) {
    const db = await openLibraryDb();
    const tx = db.transaction(META_STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(META_STORE).put(value, key);
    await done;
  },
};

export function indexedDbDocumentBackend(): DocumentBackend {
  return indexedDbBackend;
}

/** In-memory backend for tests and non-browser runtimes. */
export function createMemoryDocumentBackend(): DocumentBackend {
  const collections = new Map<string, Map<string, unknown>>();
  const meta = new Map<string, unknown>();
  const clone = <T>(value: T): T => structuredClone(value);
  return {
    async readAll(collection) {
      return [...(collections.get(collection)?.values() ?? [])].map(clone);
    },
    async replaceAll(collection, documents) {
      collections.set(collection, new Map(documents.map((doc) => [doc.id, clone(doc)])));
    },
    async readMeta(key) {
      return meta.get(key);
    },
    async writeMeta(key, value) {
      meta.set(key, value);
    },
  };
}
