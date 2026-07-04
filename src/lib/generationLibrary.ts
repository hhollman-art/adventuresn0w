export type LibraryKind = "realm" | "adventure" | "characters" | "maps" | "props";

export type LibraryImage = {
  kind: string;
  label?: string;
  imageDataUrl: string;
  /** VTT grid columns when this is a battle map aligned to the virtual table. */
  gridCols?: number;
  /** VTT grid rows when this is a battle map aligned to the virtual table. */
  gridRows?: number;
};

export type LibraryItem = {
  id: string;
  createdAt: string;
  kind: LibraryKind;
  title: string;
  markdown: string;
  textModel: string | null;
  imageModel: string | null;
  images: LibraryImage[];
};

/** Legacy localStorage key; used once to migrate into IndexedDB. */
const LEGACY_STORAGE_KEY = "ddeasy-generation-library-v1";
const IDB_NAME = "ddeasy-generation-library-v2";
const IDB_STORE = "kv";
const IDB_ITEMS_KEY = "items";

const MAX_ITEMS = 24;
const MAX_MARKDOWN_CHARS = 280_000;
const MAX_IMAGES_PER_ITEM = 14;

const KINDS: LibraryKind[] = ["realm", "adventure", "characters", "maps", "props"];

export const LIBRARY_KIND_LABEL: Record<LibraryKind, string> = {
  realm: "Realm",
  adventure: "Adventure",
  characters: "Characters",
  maps: "Maps",
  props: "Props",
};

function isLibraryKind(v: unknown): v is LibraryKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

function isLibraryImage(x: unknown): x is LibraryImage {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const gridColsOk =
    o.gridCols === undefined ||
    (typeof o.gridCols === "number" && o.gridCols >= 4 && o.gridCols <= 100);
  const gridRowsOk =
    o.gridRows === undefined ||
    (typeof o.gridRows === "number" && o.gridRows >= 4 && o.gridRows <= 100);
  return (
    typeof o.kind === "string" &&
    typeof o.imageDataUrl === "string" &&
    (o.label === undefined || typeof o.label === "string") &&
    gridColsOk &&
    gridRowsOk
  );
}

/** Exported for tests — validates one persisted row. */
export function fixLibraryItem(o: Record<string, unknown>): LibraryItem | null {
  if (
    typeof o.id !== "string" ||
    typeof o.createdAt !== "string" ||
    typeof o.title !== "string" ||
    typeof o.markdown !== "string" ||
    !isLibraryKind(o.kind) ||
    !Array.isArray(o.images)
  ) {
    return null;
  }
  const textModel =
    o.textModel === null || typeof o.textModel === "string" ? o.textModel : null;
  const imageModel =
    o.imageModel === null || typeof o.imageModel === "string" ? o.imageModel : null;
  const images = o.images.filter(isLibraryImage);
  return {
    id: o.id,
    createdAt: o.createdAt,
    kind: o.kind,
    title: o.title,
    markdown: o.markdown,
    textModel,
    imageModel,
    images,
  };
}

function parseJsonArray(raw: string): LibraryItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) =>
        typeof x === "object" && x !== null
          ? fixLibraryItem(x as Record<string, unknown>)
          : null,
      )
      .filter((x): x is LibraryItem => x !== null);
  } catch {
    return [];
  }
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

async function idbGetItems(): Promise<LibraryItem[] | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_ITEMS_KEY);
    req.onerror = () => reject(req.error ?? new Error("IDB get failed"));
    req.onsuccess = () => {
      const v = req.result;
      if (v === undefined) resolve(undefined);
      else if (Array.isArray(v)) resolve(v as LibraryItem[]);
      else resolve(undefined);
    };
  });
}

async function idbSetItems(items: LibraryItem[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.objectStore(IDB_STORE).put(items, IDB_ITEMS_KEY);
  });
}

/** Serialize writes to avoid lost updates when multiple saves race. */
let writeMutex = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeMutex.then(fn, fn);
  writeMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadItemsInternal(): Promise<LibraryItem[]> {
  if (typeof window === "undefined") return [];

  try {
    let items = await idbGetItems();
    if (items === undefined) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        items = parseJsonArray(legacy);
        try {
          await idbSetItems(items);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* keep legacy */
        }
      } else {
        items = [];
        try {
          await idbSetItems([]);
        } catch {
          /* IDB may be unavailable */
        }
      }
    }
    return items.map((x) => ({ ...x }));
  } catch {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    return legacy ? parseJsonArray(legacy) : [];
  }
}

export async function loadGenerationLibraryItems(): Promise<LibraryItem[]> {
  return loadItemsInternal();
}

export type NewLibraryItemInput = {
  kind: LibraryKind;
  title: string;
  markdown: string;
  textModel: string | null;
  imageModel: string | null;
  images: LibraryImage[];
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeInput(input: NewLibraryItemInput): LibraryItem {
  const markdown = input.markdown.slice(0, MAX_MARKDOWN_CHARS);
  const images = input.images.slice(0, MAX_IMAGES_PER_ITEM).map((img) => ({
    kind: img.kind,
    label: img.label,
    imageDataUrl: img.imageDataUrl,
  }));
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    kind: input.kind,
    title: input.title.trim() || LIBRARY_KIND_LABEL[input.kind],
    markdown,
    textModel: input.textModel,
    imageModel: input.imageModel,
    images,
  };
}

async function persistListAttempt(list: LibraryItem[]): Promise<void> {
  await idbSetItems(list);
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* backup only */
  }
}

/**
 * Saves a generation run to the library. Drops oldest entries if storage quota is exceeded.
 */
export async function appendGenerationLibraryItem(
  input: NewLibraryItemInput,
): Promise<LibraryItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const item = normalizeInput(input);
    let list = [item, ...(await loadItemsInternal())].slice(0, MAX_ITEMS);

    const shrinkForQuota = (): boolean => {
      if (list.length <= 1) return false;
      list = list.slice(0, -1);
      return true;
    };

    for (;;) {
      try {
        await persistListAttempt(list);
        return list;
      } catch {
        if (!shrinkForQuota()) {
          try {
            item.images = [];
            list = [item, ...(await loadItemsInternal())].slice(0, MAX_ITEMS);
            await persistListAttempt(list);
            return list;
          } catch {
            return loadItemsInternal();
          }
        }
      }
    }
  });
}

/**
 * Edit the saved text of a generation in place (title and/or Markdown body).
 * Images and models are preserved. Unknown ids are a no-op.
 */
export async function updateGenerationLibraryItem(
  id: string,
  patch: { title: string; markdown: string },
): Promise<LibraryItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const next = (await loadItemsInternal()).map((x) =>
      x.id === id
        ? {
            ...x,
            title: patch.title.trim() || LIBRARY_KIND_LABEL[x.kind],
            markdown: patch.markdown.slice(0, MAX_MARKDOWN_CHARS),
          }
        : x,
    );
    try {
      await persistListAttempt(next);
    } catch {
      /* ignore */
    }
    return next;
  });
}

export async function deleteGenerationLibraryItem(id: string): Promise<LibraryItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    const next = (await loadItemsInternal()).filter((x) => x.id !== id);
    try {
      await persistListAttempt(next);
    } catch {
      /* ignore */
    }
    return next;
  });
}

export async function deleteGenerationLibraryItems(ids: string[]): Promise<LibraryItem[]> {
  if (typeof window === "undefined" || ids.length === 0) {
    return loadItemsInternal();
  }
  return withWriteLock(async () => {
    const drop = new Set(ids);
    const next = (await loadItemsInternal()).filter((x) => !drop.has(x.id));
    try {
      await persistListAttempt(next);
    } catch {
      /* ignore */
    }
    return next;
  });
}

export async function clearGenerationLibrary(): Promise<LibraryItem[]> {
  if (typeof window === "undefined") return [];
  return withWriteLock(async () => {
    try {
      await idbSetItems([]);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  });
}

export function firstMarkdownHeading(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}
