/**
 * Campaign records — the DM's container for running one group.
 *
 * A campaign links (by id, never by copy) one party roster plus any seeds and
 * results that belong to that group's story, and owns one shelved Virtual
 * Table snapshot (stored separately in src/lib/tabletop/store.ts). Links are
 * references so the same realm seed can serve several campaigns; deleting a
 * campaign never deletes the linked content.
 *
 * CI class: campaign.record (see src/lib/ciRegistry.ts).
 */

const IDB_NAME = "ddeasy-campaigns-v1";
const IDB_STORE = "kv";
const IDB_KEY = "campaigns";
/** localStorage mirror — survives IDB quirks and syncs across tabs. */
const LOCAL_STORAGE_KEY = "ddeasy-campaigns-v1";
const ACTIVE_CAMPAIGN_KEY = "ddeasy-active-campaign-v1";

export const CAMPAIGNS_CHANGED_EVENT = "ddeasy-campaigns-changed";
export const ACTIVE_CAMPAIGN_CHANGED_EVENT = "ddeasy-active-campaign-changed";

const MAX_CAMPAIGNS = 16;

export type SavedCampaign = {
  id: string;
  name: string;
  /** Short table pitch / premise shown in lists. */
  description: string;
  createdAt: string;
  updatedAt: string;
  /** The group's party roster (characterRoster.ts), if linked. */
  partyId: string | null;
  /** Linked seed ids (realmSeeds.ts). References — seeds may be shared. */
  seedIds: string[];
  /** Linked result ids (generationLibrary.ts). References — may be shared. */
  resultIds: string[];
  /** Linked character sheet ids (characterLibrary.ts). References — may be shared. */
  characterIds: string[];
  /** Linked user item ids (itemLibrary.ts). References — may be shared. */
  itemIds: string[];
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

/** Validates and upgrades a persisted campaign row. */
export function fixSavedCampaign(value: unknown): SavedCampaign | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) {
    return null;
  }
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  return {
    id: o.id,
    name: o.name.trim(),
    description: typeof o.description === "string" ? o.description : "",
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    partyId: typeof o.partyId === "string" ? o.partyId : null,
    seedIds: stringArray(o.seedIds),
    resultIds: stringArray(o.resultIds),
    characterIds: stringArray(o.characterIds),
    itemIds: stringArray(o.itemIds),
  };
}

function parseJsonArray(raw: string): SavedCampaign[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedCampaign(row))
      .filter((c): c is SavedCampaign => c !== null);
  } catch {
    return [];
  }
}

function sortCampaigns(list: SavedCampaign[]): SavedCampaign[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function notifyCampaignsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAMPAIGNS_CHANGED_EVENT));
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

async function idbGetItems(): Promise<SavedCampaign[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) {
        resolve(
          v.map((row) => fixSavedCampaign(row)).filter((c): c is SavedCampaign => c !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSetItems(items: SavedCampaign[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedCampaign[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  try {
    let items = await idbGetItems();
    if (items === undefined || items.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        items = mirror;
        try {
          await idbSetItems(items);
        } catch {
          /* keep mirror */
        }
      } else {
        items = [];
      }
    }
    return sortCampaigns(items);
  } catch {
    return sortCampaigns(loadFromLocalStorage());
  }
}

async function persist(list: SavedCampaign[]): Promise<void> {
  const sorted = sortCampaigns(list);
  let lastError: unknown = null;

  try {
    await idbSetItems(sorted);
  } catch (err) {
    lastError = err;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyCampaignsChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("Could not save campaigns");
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

export async function loadCampaigns(): Promise<SavedCampaign[]> {
  return loadInternal();
}

export async function getCampaign(id: string): Promise<SavedCampaign | null> {
  const list = await loadInternal();
  return list.find((c) => c.id === id) ?? null;
}

export type SaveCampaignInput = {
  name: string;
  description?: string;
  partyId?: string | null;
  seedIds?: string[];
  resultIds?: string[];
  characterIds?: string[];
  itemIds?: string[];
};

export async function saveCampaign(input: SaveCampaignInput): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const campaign: SavedCampaign = {
      id: newId(),
      name: input.name.trim() || "New campaign",
      description: input.description?.trim() ?? "",
      createdAt: now,
      updatedAt: now,
      partyId: input.partyId ?? null,
      seedIds: stringArray(input.seedIds),
      resultIds: stringArray(input.resultIds),
      characterIds: stringArray(input.characterIds),
      itemIds: stringArray(input.itemIds),
    };
    const list = [campaign, ...(await loadInternal())].slice(0, MAX_CAMPAIGNS);
    await persist(list);
    return list;
  });
}

export type UpdateCampaignPatch = {
  name?: string;
  description?: string;
  partyId?: string | null;
  seedIds?: string[];
  resultIds?: string[];
  characterIds?: string[];
  itemIds?: string[];
};

export async function updateCampaign(
  id: string,
  patch: UpdateCampaignPatch,
): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const now = new Date().toISOString();
    const list = (await loadInternal()).map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        name: patch.name !== undefined ? patch.name.trim() || c.name : c.name,
        description: patch.description !== undefined ? patch.description : c.description,
        partyId: patch.partyId !== undefined ? patch.partyId : c.partyId,
        seedIds: patch.seedIds !== undefined ? stringArray(patch.seedIds) : c.seedIds,
        resultIds:
          patch.resultIds !== undefined ? stringArray(patch.resultIds) : c.resultIds,
        characterIds:
          patch.characterIds !== undefined ? stringArray(patch.characterIds) : c.characterIds,
        itemIds: patch.itemIds !== undefined ? stringArray(patch.itemIds) : c.itemIds,
        updatedAt: now,
      };
    });
    await persist(list);
    return list;
  });
}

/** Link a newly created item to a campaign (no-op if already linked). */
export async function linkToCampaign(
  campaignId: string,
  link: {
    seedId?: string;
    resultId?: string;
    partyId?: string;
    characterId?: string;
    itemId?: string;
  },
): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).map((c) => {
      if (c.id !== campaignId) return c;
      const next = { ...c, updatedAt: new Date().toISOString() };
      if (link.seedId && !next.seedIds.includes(link.seedId)) {
        next.seedIds = [...next.seedIds, link.seedId];
      }
      if (link.resultId && !next.resultIds.includes(link.resultId)) {
        next.resultIds = [...next.resultIds, link.resultId];
      }
      if (link.partyId) next.partyId = link.partyId;
      if (link.characterId && !next.characterIds.includes(link.characterId)) {
        next.characterIds = [...next.characterIds, link.characterId];
      }
      if (link.itemId && !next.itemIds.includes(link.itemId)) {
        next.itemIds = [...next.itemIds, link.itemId];
      }
      return next;
    });
    await persist(list);
    return list;
  });
}

/**
 * Remove one id link from a campaign without deleting the linked CI.
 */
export async function unlinkFromCampaign(
  campaignId: string,
  link: {
    seedId?: string;
    resultId?: string;
    partyId?: boolean;
    characterId?: string;
    itemId?: string;
  },
): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).map((c) => {
      if (c.id !== campaignId) return c;
      const next = { ...c, updatedAt: new Date().toISOString() };
      if (link.seedId) next.seedIds = next.seedIds.filter((id) => id !== link.seedId);
      if (link.resultId) next.resultIds = next.resultIds.filter((id) => id !== link.resultId);
      if (link.partyId) next.partyId = null;
      if (link.characterId) {
        next.characterIds = next.characterIds.filter((id) => id !== link.characterId);
      }
      if (link.itemId) next.itemIds = next.itemIds.filter((id) => id !== link.itemId);
      return next;
    });
    await persist(list);
    return list;
  });
}

/**
 * Link a newly created item to whichever campaign is open right now.
 * No-op when no campaign is active — content stays unassigned.
 */
export async function autoLinkToActiveCampaign(link: {
  seedId?: string;
  resultId?: string;
  partyId?: string;
  characterId?: string;
  itemId?: string;
}): Promise<void> {
  const activeId = getActiveCampaignId();
  if (!activeId) return;
  await linkToCampaign(activeId, link);
}

export async function deleteCampaign(id: string): Promise<SavedCampaign[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((c) => c.id !== id);
    await persist(list);
    if (getActiveCampaignId() === id) setActiveCampaignId(null);
    return list;
  });
}

/**
 * Merge campaigns from a backup file. Rows with ids that already exist are
 * skipped (non-destructive restore). Dangling links (party/seed/result ids
 * not present locally) are kept — the content may be restored later.
 */
export async function importCampaigns(
  rows: unknown[],
): Promise<{ added: number; campaigns: SavedCampaign[] }> {
  if (typeof window === "undefined") return { added: 0, campaigns: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((c) => c.id));
    const incoming = rows
      .map((row) => fixSavedCampaign(row))
      .filter((c): c is SavedCampaign => c !== null && !known.has(c.id));
    const next = [...incoming, ...existing].slice(0, MAX_CAMPAIGNS);
    await persist(next);
    return { added: incoming.length, campaigns: next };
  });
}

/** Subscribe to campaign list changes (same tab or other tabs). */
export function onCampaignsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(CAMPAIGNS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CAMPAIGNS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/* ---- Active campaign (which group the app is currently primed for) ---- */

export function getActiveCampaignId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_CAMPAIGN_KEY);
  } catch {
    return null;
  }
}

export function setActiveCampaignId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(ACTIVE_CAMPAIGN_KEY, id);
    else localStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
    window.dispatchEvent(new Event(ACTIVE_CAMPAIGN_CHANGED_EVENT));
  } catch {
    /* localStorage unavailable — active campaign stays session-only */
  }
}

/** Subscribe to active-campaign changes (same tab or other tabs). */
export function onActiveCampaignChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(ACTIVE_CAMPAIGN_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ACTIVE_CAMPAIGN_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
