import type { TabletopSession } from "./types";
import { createDefaultSession, fixSession } from "./session";

const IDB_NAME = "ddeasy-tabletop-v1";
const IDB_STORE = "kv";
const IDB_SESSION_KEY = "session";
/** Shelved per-campaign tables: `session:<campaignId>` (CI class session.snapshot). */
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
