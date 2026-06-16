import { REALM_SIZE_LABEL, type RealmSize } from "@/lib/realmPrompt";

const STORAGE_KEY = "ddeasy-realm-seeds-v1";
const MAX_SEEDS = 25;

export type SavedRealmSeed = {
  id: string;
  createdAt: string;
  realmSize: RealmSize;
  /** User-chosen library name (set when saving after generation). */
  seedName?: string;
  titleHint: string;
  /** Truncated “describe what you want” text for recognition in the list */
  briefDescription: string;
  markdown: string;
};

const REALM_SIZES: RealmSize[] = [
  "world",
  "continent",
  "country",
  "region",
  "local",
];

function isRealmSize(v: unknown): v is RealmSize {
  return typeof v === "string" && (REALM_SIZES as string[]).includes(v);
}

function isSavedRealmSeed(x: unknown): x is SavedRealmSeed {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.markdown === "string" &&
    o.markdown.length > 0 &&
    isRealmSize(o.realmSize) &&
    typeof o.titleHint === "string" &&
    typeof o.briefDescription === "string" &&
    (o.seedName === undefined || typeof o.seedName === "string")
  );
}

export function loadRealmSeeds(): SavedRealmSeed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedRealmSeed);
  } catch {
    return [];
  }
}

export function appendRealmSeed(params: {
  seedName: string;
  realmSize: RealmSize;
  titleHint: string;
  briefDescription: string;
  markdown: string;
}): SavedRealmSeed[] {
  if (typeof window === "undefined") return [];
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const entry: SavedRealmSeed = {
    id,
    createdAt: new Date().toISOString(),
    realmSize: params.realmSize,
    seedName: params.seedName.trim(),
    titleHint: params.titleHint,
    briefDescription: params.briefDescription,
    markdown: params.markdown,
  };
  const prev = loadRealmSeeds();
  const next = [entry, ...prev].slice(0, MAX_SEEDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/**
 * Update an existing seed in place (used by the manual seed editor). Unknown
 * ids are a no-op. Returns the refreshed list.
 */
export function updateRealmSeed(
  id: string,
  patch: {
    seedName: string;
    realmSize: RealmSize;
    titleHint: string;
    briefDescription: string;
    markdown: string;
  },
): SavedRealmSeed[] {
  if (typeof window === "undefined") return [];
  const next = loadRealmSeeds().map((s) =>
    s.id === id
      ? {
          ...s,
          seedName: patch.seedName.trim(),
          realmSize: patch.realmSize,
          titleHint: patch.titleHint,
          briefDescription: patch.briefDescription,
          markdown: patch.markdown,
        }
      : s,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteRealmSeed(id: string): SavedRealmSeed[] {
  if (typeof window === "undefined") return [];
  const next = loadRealmSeeds().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function firstMarkdownTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

/** Default name shown in the “save seed” dialog after generation. */
export function suggestedSeedName(markdown: string, titleHint: string): string {
  const fromHint = titleHint.trim();
  if (fromHint) return fromHint;
  return firstMarkdownTitle(markdown) || "My realm";
}

/** Label for &lt;select&gt; options (keep reasonably short). */
export function realmSeedOptionLabel(s: SavedRealmSeed): string {
  const name =
    s.seedName?.trim() ||
    s.titleHint.trim() ||
    firstMarkdownTitle(s.markdown) ||
    "Saved realm";
  const scope = REALM_SIZE_LABEL[s.realmSize].label;
  const date = new Date(s.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const short =
    s.briefDescription.trim().slice(0, 72) +
    (s.briefDescription.length > 72 ? "…" : "");
  const tail = short ? ` — ${short}` : "";
  return `${name} (${scope}, ${date})${tail}`;
}
