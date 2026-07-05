/**
 * Library auto-save ("sync folder").
 *
 * The DM picks a folder once — a local directory or a cloud-synced folder
 * (OneDrive, Google Drive, Dropbox) — and the app automatically writes the
 * whole library (seeds, results, parties) to `ddeasy-library.json` in that
 * folder after every change. Pointing at a cloud-synced folder gives free
 * off-device backup without any manual export step.
 *
 * STRICTLY ONE-DIRECTIONAL: the app only ever WRITES to this folder. It never
 * reads data back from it on its own — loading data into the app happens only
 * through the explicit "Restore backup" action in the Library panel.
 *
 * Uses the File System Access API (Chrome/Edge). Browsers without it fall
 * back to manual Export/Restore backup in the Library panel.
 */

import {
  buildLibraryBackup,
  serializeLibraryBackup,
  type LibraryBackupFile,
} from "@/lib/workshop/libraryBackup";
import {
  characterToMarkdownFile,
  fileSlug,
} from "@/lib/tabletop/characterMarkdown";

export const SYNC_FILE_NAME = "ddeasy-library.json";
/** Folder inside the sync folder holding one portable .md file per PC. */
export const CHARACTERS_DIR_NAME = "characters";

const IDB_NAME = "ddeasy-library-sync-v1";
const IDB_STORE = "kv";
const IDB_HANDLE_KEY = "sync-folder-handle";

/* ---- Minimal File System Access API typings (not yet in lib.dom) ---- */

type FsPermissionMode = { mode?: "read" | "readwrite" };

interface SyncDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission?: (desc?: FsPermissionMode) => Promise<PermissionState>;
  requestPermission?: (desc?: FsPermissionMode) => Promise<PermissionState>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

/* ---- Status ---- */

export type LibrarySyncStatus =
  /** Browser has no File System Access API — manual export/restore only. */
  | { state: "unsupported" }
  /** No folder chosen yet. */
  | { state: "off" }
  /** Folder connected and writable — auto-save active. */
  | { state: "on"; folderName: string }
  /** Folder remembered but the browser needs a click to re-grant access. */
  | { state: "needs-permission"; folderName: string };

export function isLibrarySyncSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/* ---- Handle persistence (IndexedDB — handles are structured-cloneable) ---- */

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

async function idbGetHandle(): Promise<SyncDirectoryHandle | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_HANDLE_KEY);
      req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
      req.onsuccess = () => resolve((req.result as SyncDirectoryHandle | undefined) ?? null);
    });
  } catch {
    return null;
  }
}

async function idbSetHandle(handle: SyncDirectoryHandle | null): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    const store = tx.objectStore(IDB_STORE);
    if (handle === null) store.delete(IDB_HANDLE_KEY);
    else store.put(handle, IDB_HANDLE_KEY);
  });
}

async function queryHandlePermission(handle: SyncDirectoryHandle): Promise<PermissionState> {
  if (typeof handle.queryPermission !== "function") return "granted";
  try {
    return await handle.queryPermission({ mode: "readwrite" });
  } catch {
    return "denied";
  }
}

/* ---- Public API ---- */

export async function getLibrarySyncStatus(): Promise<LibrarySyncStatus> {
  if (!isLibrarySyncSupported()) return { state: "unsupported" };
  const handle = await idbGetHandle();
  if (!handle) return { state: "off" };
  const permission = await queryHandlePermission(handle);
  if (permission === "granted") return { state: "on", folderName: handle.name };
  return { state: "needs-permission", folderName: handle.name };
}

export type ConnectSyncFolderResult =
  | {
      ok: true;
      folderName: string;
      /**
       * True when the folder already contained a library file that the next
       * auto-save will overwrite. Informational only — the app never reads
       * that file's contents (one-directional sync).
       */
      hadExistingSnapshot: boolean;
    }
  | { ok: false; cancelled: boolean; error?: string };

/**
 * Ask the user to pick the auto-save folder. Never reads data back from the
 * folder — sync is one-directional (app → folder). It only checks whether a
 * library file already exists so the UI can warn that it will be replaced.
 */
export async function connectSyncFolder(): Promise<ConnectSyncFolderResult> {
  if (!isLibrarySyncSupported() || !window.showDirectoryPicker) {
    return { ok: false, cancelled: false, error: "This browser can't auto-save to a folder." };
  }
  let handle: SyncDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ id: "ddeasy-library", mode: "readwrite" });
  } catch (err) {
    const cancelled = err instanceof DOMException && err.name === "AbortError";
    return { ok: false, cancelled, error: cancelled ? undefined : "Could not open that folder." };
  }
  try {
    await idbSetHandle(handle);
  } catch {
    /* auto-save still works this session even if the handle can't persist */
  }

  let hadExistingSnapshot = false;
  try {
    await handle.getFileHandle(SYNC_FILE_NAME);
    hadExistingSnapshot = true;
  } catch {
    /* no snapshot in this folder yet — that's fine */
  }

  return { ok: true, folderName: handle.name, hadExistingSnapshot };
}

/** Re-grant access to the remembered folder (requires a user click). */
export async function reconnectSyncFolder(): Promise<LibrarySyncStatus> {
  const handle = await idbGetHandle();
  if (!handle) return isLibrarySyncSupported() ? { state: "off" } : { state: "unsupported" };
  if (typeof handle.requestPermission === "function") {
    try {
      const permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission === "granted") return { state: "on", folderName: handle.name };
    } catch {
      /* fall through */
    }
    return { state: "needs-permission", folderName: handle.name };
  }
  return { state: "on", folderName: handle.name };
}

/** Stop auto-saving and forget the folder (files already written are kept). */
export async function disconnectSyncFolder(): Promise<void> {
  try {
    await idbSetHandle(null);
  } catch {
    /* nothing to forget */
  }
}

async function writeTextFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  contents: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

/**
 * Write each PC as its own portable .md file under characters/<party>/.
 * These files round-trip through the character Markdown parser, so any one
 * of them can be loaded into Add party, the Virtual Table, or adventure prep
 * on another device. Write-only: renamed or deleted characters leave their
 * old files behind (the app never deletes from the user's folder).
 */
async function writeCharacterFiles(
  root: SyncDirectoryHandle,
  backup: LibraryBackupFile,
): Promise<void> {
  const charactersDir = await root.getDirectoryHandle(CHARACTERS_DIR_NAME, {
    create: true,
  });
  for (const roster of backup.parties) {
    if (roster.players.length === 0) continue;
    const partyDir = await charactersDir.getDirectoryHandle(fileSlug(roster.name), {
      create: true,
    });
    const usedNames = new Set<string>();
    for (const player of roster.players) {
      let name = `${fileSlug(player.name)}.md`;
      if (usedNames.has(name)) {
        name = `${fileSlug(player.name)}-${player.id.slice(0, 6)}.md`;
      }
      usedNames.add(name);
      await writeTextFile(partyDir, name, characterToMarkdownFile(player));
    }
  }
}

/**
 * Write the current library to the sync folder. No-op unless a folder is
 * connected with granted permission. Returns true when a file was written.
 */
export async function writeLibrarySnapshot(): Promise<boolean> {
  if (!isLibrarySyncSupported()) return false;
  const handle = await idbGetHandle();
  if (!handle) return false;
  if ((await queryHandlePermission(handle)) !== "granted") return false;
  try {
    const backup = await buildLibraryBackup();
    await writeTextFile(handle, SYNC_FILE_NAME, serializeLibraryBackup(backup));
    try {
      await writeCharacterFiles(handle, backup);
    } catch {
      /* per-character files are best-effort; the JSON snapshot is the backup */
    }
    return true;
  } catch {
    return false;
  }
}

/* ---- Debounced auto-save scheduler ---- */

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a snapshot write shortly after the last library change. Safe to
 * call on every state update — writes are debounced and silently skipped
 * when no sync folder is connected.
 */
export function scheduleLibrarySnapshot(delayMs = 1500): void {
  if (!isLibrarySyncSupported()) return;
  if (snapshotTimer !== null) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    void writeLibrarySnapshot();
  }, delayMs);
}
