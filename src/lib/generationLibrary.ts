export type LibraryKind = "realm" | "adventure" | "characters" | "maps" | "props";

export type LibraryImage = {
  kind: string;
  label?: string;
  imageDataUrl: string;
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

const STORAGE_KEY = "ddeasy-generation-library-v1";
const MAX_ITEMS = 24;
const MAX_MARKDOWN_CHARS = 280_000;
const MAX_IMAGES_PER_ITEM = 14;

const KINDS: LibraryKind[] = [
  "realm",
  "adventure",
  "characters",
  "maps",
  "props",
];

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
  return (
    typeof o.kind === "string" &&
    typeof o.imageDataUrl === "string" &&
    (o.label === undefined || typeof o.label === "string")
  );
}

function fixLibraryItem(o: Record<string, unknown>): LibraryItem | null {
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
    o.imageModel === null || typeof o.imageModel === "string"
      ? o.imageModel
      : null;
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

export function loadGenerationLibraryItems(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
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

function persistList(list: LibraryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Saves a generation run to the library. Drops oldest entries if storage quota is exceeded.
 */
export function appendGenerationLibraryItem(
  input: NewLibraryItemInput,
): LibraryItem[] {
  if (typeof window === "undefined") return [];
  const item = normalizeInput(input);
  let list = [item, ...loadGenerationLibraryItems()].slice(0, MAX_ITEMS);

  const shrinkForQuota = (): boolean => {
    if (list.length <= 1) return false;
    list = list.slice(0, -1);
    return true;
  };

  for (;;) {
    try {
      persistList(list);
      return list;
    } catch {
      if (!shrinkForQuota()) {
        try {
          item.images = [];
          list = [item, ...loadGenerationLibraryItems()].slice(0, MAX_ITEMS);
          persistList(list);
          return list;
        } catch {
          return loadGenerationLibraryItems();
        }
      }
    }
  }
}

export function deleteGenerationLibraryItem(id: string): LibraryItem[] {
  if (typeof window === "undefined") return [];
  const next = loadGenerationLibraryItems().filter((x) => x.id !== id);
  try {
    persistList(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function deleteGenerationLibraryItems(ids: string[]): LibraryItem[] {
  if (typeof window === "undefined" || ids.length === 0) {
    return loadGenerationLibraryItems();
  }
  const drop = new Set(ids);
  const next = loadGenerationLibraryItems().filter((x) => !drop.has(x.id));
  try {
    persistList(next);
  } catch {
    /* ignore */
  }
  return next;
}

export function clearGenerationLibrary(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export function firstMarkdownHeading(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}
