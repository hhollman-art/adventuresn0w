import type { TabletopSession } from "./types";
import { createDefaultSession, fixSession } from "./session";

const IDB_NAME = "ddeasy-tabletop-v1";
const IDB_STORE = "kv";
const IDB_SESSION_KEY = "session";
/** Shelved per-campaign tables: `session:<campaignId>` (Creation File (CF) class session.snapshot). */
const CAMPAIGN_SESSION_PREFIX = "session:";
/** Slot for the table as it was before any campaign was opened. */
const NO_CAMPAIGN_SLOT = "__no-campaign__";

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

async function idbGet(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(value, key);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
    tx.objectStore(IDB_STORE).delete(key);
  });
}

export async function loadTabletopSession(): Promise<TabletopSession | null> {
  if (typeof window === "undefined") return null;
  try {
    return fixSession(await idbGet(IDB_SESSION_KEY));
  } catch {
    return null;
  }
}

let saveQueue = Promise.resolve();

export function saveTabletopSession(session: TabletopSession): void {
  if (typeof window === "undefined") return;
  saveQueue = saveQueue
    .then(() => idbPut(IDB_SESSION_KEY, session))
    .catch(() => {
      /* storage best-effort; live table keeps working from memory */
    });
}

/* ---- Per-campaign shelved tables (campaign feature) ---- */

function campaignSlotKey(campaignId: string | null): string {
  return `${CAMPAIGN_SESSION_PREFIX}${campaignId ?? NO_CAMPAIGN_SLOT}`;
}

export async function loadCampaignTableSnapshot(
  campaignId: string | null,
): Promise<TabletopSession | null> {
  if (typeof window === "undefined") return null;
  try {
    return fixSession(await idbGet(campaignSlotKey(campaignId)));
  } catch {
    return null;
  }
}

export async function deleteCampaignTableSnapshot(campaignId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbDelete(campaignSlotKey(campaignId));
  } catch {
    /* best-effort */
  }
}

export type ShelvedTableSummary = {
  campaignId: string | null;
  mapName: string;
  updatedAt: string;
  logPreview: string;
};

/** Summaries for shelved per-campaign tables (`session:<id>` slots). */
export async function listShelvedTableSummaries(): Promise<ShelvedTableSummary[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openDb();
    return await new Promise<ShelvedTableSummary[]>((resolve, reject) => {
      const summaries: ShelvedTableSummary[] = [];
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).openCursor();
      req.onerror = () => reject(req.error ?? new Error("IDB cursor failed"));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(summaries);
          return;
        }
        const key = String(cursor.key);
        if (key.startsWith(CAMPAIGN_SESSION_PREFIX) && key !== IDB_SESSION_KEY) {
          const slot = key.slice(CAMPAIGN_SESSION_PREFIX.length);
          const campaignId = slot === NO_CAMPAIGN_SLOT ? null : slot;
          const session = fixSession(cursor.value);
          if (session) {
            summaries.push({
              campaignId,
              mapName: session.mapName,
              updatedAt: session.updatedAt,
              logPreview:
                session.log[0]?.detail?.slice(0, 100) ??
                session.log[0]?.expression ??
                "",
            });
          }
        }
        cursor.continue();
      };
    });
  } catch {
    return [];
  }
}

/**
 * Swap the live Virtual Table between campaigns: shelve the current live
 * session under `fromCampaignId`'s slot, then make `toCampaignId`'s shelved
 * table (or a fresh default) the live session. `null` on either side means
 * "no campaign" — that table is shelved in its own slot, so nothing is lost.
 * Returns the session that is now live.
 */
export async function switchCampaignTable(
  fromCampaignId: string | null,
  toCampaignId: string | null,
): Promise<TabletopSession> {
  const fresh = createDefaultSession();
  if (typeof window === "undefined") return fresh;

  // Let any queued live-session write land before reading it back.
  await saveQueue.catch(() => undefined);

  try {
    const live = fixSession(await idbGet(IDB_SESSION_KEY));
    if (live) {
      await idbPut(campaignSlotKey(fromCampaignId), live);
    }
    const next = fixSession(await idbGet(campaignSlotKey(toCampaignId))) ?? fresh;
    await idbPut(IDB_SESSION_KEY, next);
    return next;
  } catch {
    return fresh;
  }
}
