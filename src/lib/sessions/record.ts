/**
 * Session log Creation Files (`session.record`) — per-session events and continuity notes.
 */

import type { CiClass } from "@/lib/ciRegistry";

const IDB_NAME = "ddeasy-session-records-v1";
const IDB_STORE = "kv";
const IDB_KEY = "session-records";
const LOCAL_STORAGE_KEY = "ddeasy-session-records-v1";

export const SESSION_RECORDS_CHANGED_EVENT = "ddeasy-session-records-changed";
const MAX_SESSION_RECORDS = 512;

export type SessionEventKind =
  | "scene"
  | "npc"
  | "combat"
  | "loot"
  | "clue"
  | "promise"
  | "location"
  | "note";

export type SessionRecordEvent = {
  at: string;
  kind: SessionEventKind;
  text: string;
  linkedCiClass?: CiClass;
  linkedId?: string;
};

export type SavedSessionRecord = {
  id: string;
  campaignId: string;
  sessionNumber: number;
  playedAt: string;
  title: string;
  summary: string;
  events: SessionRecordEvent[];
  followUpTasks: string[];
  updatedCfIds: string[];
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

const EVENT_KINDS: SessionEventKind[] = [
  "scene",
  "npc",
  "combat",
  "loot",
  "clue",
  "promise",
  "location",
  "note",
];

function parseEventKind(value: unknown): SessionEventKind {
  return typeof value === "string" && (EVENT_KINDS as string[]).includes(value)
    ? (value as SessionEventKind)
    : "note";
}

export function fixSessionRecordEvent(value: unknown): SessionRecordEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.text !== "string") return null;
  const event: SessionRecordEvent = {
    at: typeof o.at === "string" ? o.at : "",
    kind: parseEventKind(o.kind),
    text: o.text,
  };
  if (typeof o.linkedCiClass === "string") event.linkedCiClass = o.linkedCiClass as CiClass;
  if (typeof o.linkedId === "string") event.linkedId = o.linkedId;
  return event;
}

export function fixSavedSessionRecord(value: unknown): SavedSessionRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.campaignId !== "string" ||
    typeof o.sessionNumber !== "number" ||
    o.sessionNumber < 1
  ) {
    return null;
  }
  const playedAt = typeof o.playedAt === "string" ? o.playedAt : new Date().toISOString();
  const events = Array.isArray(o.events)
    ? o.events.map((e) => fixSessionRecordEvent(e)).filter((e): e is SessionRecordEvent => e !== null)
    : [];
  return {
    id: o.id,
    campaignId: o.campaignId,
    sessionNumber: Math.floor(o.sessionNumber),
    playedAt,
    title: typeof o.title === "string" ? o.title : "",
    summary: typeof o.summary === "string" ? o.summary : "",
    events,
    followUpTasks: stringArray(o.followUpTasks),
    updatedCfIds: stringArray(o.updatedCfIds),
  };
}

function parseJsonArray(raw: string): SavedSessionRecord[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => fixSavedSessionRecord(row))
      .filter((r): r is SavedSessionRecord => r !== null);
  } catch {
    return [];
  }
}

function sortByPlayedAt(list: SavedSessionRecord[]): SavedSessionRecord[] {
  return [...list].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_RECORDS_CHANGED_EVENT));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("indexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
    });
  }
  return dbPromise;
}

async function idbGet(): Promise<SavedSessionRecord[] | undefined> {
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
          v
            .map((row) => fixSavedSessionRecord(row))
            .filter((r): r is SavedSessionRecord => r !== null),
        );
      } else resolve(undefined);
    };
  });
}

async function idbSet(items: SavedSessionRecord[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_KEY);
  });
}

function loadFromLocalStorage(): SavedSessionRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? parseJsonArray(raw) : [];
}

async function loadInternal(): Promise<SavedSessionRecord[]> {
  if (typeof window === "undefined") return [];
  try {
    let items = await idbGet();
    if (items === undefined || items.length === 0) {
      const mirror = loadFromLocalStorage();
      if (mirror.length > 0) {
        items = mirror;
        try {
          await idbSet(items);
        } catch {
          /* keep mirror */
        }
      } else items = [];
    }
    return sortByPlayedAt(items);
  } catch {
    return sortByPlayedAt(loadFromLocalStorage());
  }
}

async function persist(list: SavedSessionRecord[]): Promise<void> {
  const sorted = sortByPlayedAt(list);
  let lastError: unknown = null;
  try {
    await idbSet(sorted);
  } catch (err) {
    lastError = err;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    notifyChanged();
    if (!lastError) return;
  } catch (err) {
    lastError = err;
  }
  if (lastError) throw lastError instanceof Error ? lastError : new Error("Could not save sessions");
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

export async function loadSavedSessionRecords(): Promise<SavedSessionRecord[]> {
  return loadInternal();
}

export type SaveSessionRecordInput = {
  campaignId: string;
  sessionNumber: number;
  playedAt?: string;
  title?: string;
  summary?: string;
  events?: SessionRecordEvent[];
  followUpTasks?: string[];
  updatedCfIds?: string[];
};

export async function saveSessionRecord(
  input: SaveSessionRecordInput,
): Promise<SavedSessionRecord[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    if (!input.campaignId.trim()) throw new Error("A session log needs a campaign.");
    if (input.sessionNumber < 1) throw new Error("Session number must be at least 1.");
    const now = new Date().toISOString();
    const record: SavedSessionRecord = {
      id: newId(),
      campaignId: input.campaignId.trim(),
      sessionNumber: Math.floor(input.sessionNumber),
      playedAt: input.playedAt ?? now,
      title: input.title?.trim() ?? "",
      summary: input.summary?.trim() ?? "",
      events: input.events ?? [],
      followUpTasks: stringArray(input.followUpTasks),
      updatedCfIds: stringArray(input.updatedCfIds),
    };
    const list = [record, ...(await loadInternal())].slice(0, MAX_SESSION_RECORDS);
    await persist(list);
    return list;
  });
}

export async function updateSessionRecord(
  id: string,
  patch: Partial<SaveSessionRecordInput>,
): Promise<SavedSessionRecord[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        campaignId: patch.campaignId?.trim() || row.campaignId,
        sessionNumber:
          patch.sessionNumber !== undefined && patch.sessionNumber >= 1
            ? Math.floor(patch.sessionNumber)
            : row.sessionNumber,
        playedAt: patch.playedAt ?? row.playedAt,
        title: patch.title !== undefined ? patch.title.trim() : row.title,
        summary: patch.summary !== undefined ? patch.summary.trim() : row.summary,
        events: patch.events ?? row.events,
        followUpTasks:
          patch.followUpTasks !== undefined ? stringArray(patch.followUpTasks) : row.followUpTasks,
        updatedCfIds:
          patch.updatedCfIds !== undefined ? stringArray(patch.updatedCfIds) : row.updatedCfIds,
      };
    });
    await persist(list);
    return list;
  });
}

export async function deleteSavedSessionRecord(id: string): Promise<SavedSessionRecord[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const list = (await loadInternal()).filter((row) => row.id !== id);
    await persist(list);
    return list;
  });
}

export async function importSavedSessionRecords(
  rows: unknown[],
): Promise<{ added: number; sessionRecords: SavedSessionRecord[] }> {
  if (typeof window === "undefined") return { added: 0, sessionRecords: [] };
  return withWriteLock(async () => {
    const existing = await loadInternal();
    const known = new Set(existing.map((r) => r.id));
    const incoming = rows
      .map((row) => fixSavedSessionRecord(row))
      .filter((r): r is SavedSessionRecord => r !== null && !known.has(r.id));
    const next = [...incoming, ...existing].slice(0, MAX_SESSION_RECORDS);
    await persist(next);
    return { added: incoming.length, sessionRecords: next };
  });
}

export function onSessionRecordsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(SESSION_RECORDS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_RECORDS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const SESSION_EVENT_KIND_LABEL: Record<SessionEventKind, string> = {
  scene: "Scene",
  npc: "NPC",
  combat: "Combat",
  loot: "Loot",
  clue: "Clue",
  promise: "Promise",
  location: "Location",
  note: "Note",
};
