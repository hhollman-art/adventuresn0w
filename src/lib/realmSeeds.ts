import { REALM_SIZE_LABEL, REALM_SIZES, type RealmSize } from "@/lib/realmPrompt";

const STORAGE_KEY = "ddeasy-realm-seeds-v1";
const MAX_SEEDS = 25;
const MAX_SEED_TAGS = 8;
const MAX_TAG_LEN = 32;

/** Normalize user or stored tag strings (lowercase slug, deduped, capped). */
export function normalizeSeedTags(input: unknown): string[] {
  const rawTags = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,;]+/)
      : [];
  const out: string[] = [];
  for (const item of rawTags) {
    if (typeof item !== "string") continue;
    const tag = item
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, MAX_TAG_LEN);
    if (!tag || out.includes(tag)) continue;
    out.push(tag);
    if (out.length >= MAX_SEED_TAGS) break;
  }
  return out;
}

export function parseSeedTagsInput(text: string): string[] {
  return normalizeSeedTags(text.split(/[,;]+/));
}

export function formatSeedTagsInput(tags: readonly string[]): string {
  return tags.join(", ");
}

export function defaultTagsForGeneratedSeed(params: {
  kind: SeedKind;
  realmSize?: RealmSize;
}): string[] {
  if (params.kind === "realm" && params.realmSize) {
    return [params.realmSize];
  }
  return [];
}

/** Seeds can ground any generator tab (realm, adventure, characters, maps, props). */
export type SeedKind =
  | "realm"
  | "adventure"
  | "characters"
  | "maps"
  | "props";

export const SEED_KIND_LABEL: Record<SeedKind, string> = {
  realm: "Realm",
  adventure: "Adventure",
  characters: "Characters",
  maps: "Maps",
  props: "Props",
};

export const SEED_KINDS: SeedKind[] = [
  "realm",
  "adventure",
  "characters",
  "maps",
  "props",
];

export type SavedRealmSeed = {
  id: string;
  createdAt: string;
  /** Which generator this seed is primarily intended to ground. */
  kind: SeedKind;
  /** Only meaningful for realm seeds; undefined for adventure seeds. */
  realmSize?: RealmSize;
  /** User-chosen library name (set when saving after generation). */
  seedName?: string;
  titleHint: string;
  /** Truncated “describe what you want” text for recognition in the list */
  briefDescription: string;
  /** Optional subcategory tags for library and workshop filtering. */
  tags?: string[];
  markdown: string;
};

function isRealmSize(v: unknown): v is RealmSize {
  return typeof v === "string" && (REALM_SIZES as string[]).includes(v);
}

function isSeedKind(v: unknown): v is SeedKind {
  return typeof v === "string" && (SEED_KINDS as string[]).includes(v);
}

function normalizeSavedSeed(x: unknown): SavedRealmSeed | null {
  if (typeof x !== "object" || x === null) return null;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.createdAt !== "string" ||
    typeof o.markdown !== "string" ||
    o.markdown.length === 0 ||
    typeof o.titleHint !== "string" ||
    typeof o.briefDescription !== "string" ||
    (o.seedName !== undefined && typeof o.seedName !== "string")
  ) {
    return null;
  }
  // Backward compatibility: seeds saved before kinds existed are realm seeds.
  const kind: SeedKind = isSeedKind(o.kind) ? o.kind : "realm";
  const realmSize = isRealmSize(o.realmSize) ? o.realmSize : undefined;
  const tags = normalizeSeedTags(o.tags);
  const base = {
    id: o.id,
    createdAt: o.createdAt,
    kind,
    seedName: o.seedName as string | undefined,
    titleHint: o.titleHint,
    briefDescription: o.briefDescription,
    ...(tags.length > 0 ? { tags } : {}),
    markdown: o.markdown,
  };
  // Realm seeds must carry a scale; fall back to "region" for legacy rows.
  if (kind === "realm" && realmSize === undefined) {
    return {
      ...base,
      realmSize: "region",
    };
  }
  return {
    ...base,
    ...(kind === "realm" ? { realmSize } : {}),
  };
}

/**
 * Async-first API (see `scale-portability` rule): today's implementation is
 * synchronous localStorage, but every exported signature returns a Promise so
 * a server/cloud backend can replace the internals without touching callers.
 */

function loadSeedsSync(): SavedRealmSeed[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSavedSeed)
      .filter((s): s is SavedRealmSeed => s !== null);
  } catch {
    return [];
  }
}

function persistSeeds(next: SavedRealmSeed[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function loadRealmSeeds(): Promise<SavedRealmSeed[]> {
  return loadSeedsSync();
}

export async function appendRealmSeed(params: {
  kind: SeedKind;
  seedName: string;
  realmSize?: RealmSize;
  titleHint: string;
  briefDescription: string;
  markdown: string;
  tags?: string[];
}): Promise<SavedRealmSeed[]> {
  if (typeof window === "undefined") return [];
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const tags = normalizeSeedTags(
    params.tags ?? defaultTagsForGeneratedSeed(params),
  );
  const entry: SavedRealmSeed = {
    id,
    createdAt: new Date().toISOString(),
    kind: params.kind,
    ...(params.kind === "realm"
      ? { realmSize: params.realmSize ?? "region" }
      : {}),
    seedName: params.seedName.trim(),
    titleHint: params.titleHint,
    briefDescription: params.briefDescription,
    ...(tags.length > 0 ? { tags } : {}),
    markdown: params.markdown,
  };
  const next = [entry, ...loadSeedsSync()].slice(0, MAX_SEEDS);
  persistSeeds(next);
  return next;
}

/**
 * Update an existing seed in place (used by the manual seed editor). Unknown
 * ids are a no-op. Returns the refreshed list.
 */
export async function updateRealmSeed(
  id: string,
  patch: {
    kind: SeedKind;
    seedName: string;
    realmSize?: RealmSize;
    titleHint: string;
    briefDescription: string;
    markdown: string;
    tags?: string[];
  },
): Promise<SavedRealmSeed[]> {
  if (typeof window === "undefined") return [];
  const tags = normalizeSeedTags(patch.tags);
  const next = loadSeedsSync().map((s) =>
    s.id === id
      ? {
          ...s,
          kind: patch.kind,
          ...(patch.kind === "realm"
            ? { realmSize: patch.realmSize ?? s.realmSize ?? "region" }
            : { realmSize: undefined }),
          seedName: patch.seedName.trim(),
          titleHint: patch.titleHint,
          briefDescription: patch.briefDescription,
          ...(tags.length > 0 ? { tags } : { tags: undefined }),
          markdown: patch.markdown,
        }
      : s,
  );
  persistSeeds(next);
  return next;
}

export async function deleteRealmSeed(id: string): Promise<SavedRealmSeed[]> {
  if (typeof window === "undefined") return [];
  const next = loadSeedsSync().filter((s) => s.id !== id);
  persistSeeds(next);
  return next;
}

/**
 * Merge seeds from a backup file into local storage. Rows with ids that
 * already exist are skipped (non-destructive restore). Returns the refreshed
 * list plus how many rows were added.
 */
export async function importRealmSeeds(rows: unknown[]): Promise<{
  added: number;
  seeds: SavedRealmSeed[];
}> {
  if (typeof window === "undefined") return { added: 0, seeds: [] };
  const existing = loadSeedsSync();
  const known = new Set(existing.map((s) => s.id));
  const incoming = rows
    .map(normalizeSavedSeed)
    .filter((s): s is SavedRealmSeed => s !== null && !known.has(s.id));
  const next = [...incoming, ...existing].slice(0, MAX_SEEDS);
  persistSeeds(next);
  return { added: incoming.length, seeds: next };
}

function firstMarkdownTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

/** Default name shown in the “save seed” dialog after generation. */
export function suggestedSeedName(
  markdown: string,
  titleHint: string,
  kind: SeedKind = "realm",
): string {
  const fromHint = titleHint.trim();
  if (fromHint) return fromHint;
  const fromTitle = firstMarkdownTitle(markdown);
  if (fromTitle) return fromTitle;
  const fallbacks: Record<SeedKind, string> = {
    realm: "My realm",
    adventure: "My adventure",
    characters: "My party",
    maps: "My map pack",
    props: "My prop",
  };
  return fallbacks[kind];
}

export function defaultSavedSeedLabel(kind: SeedKind): string {
  const labels: Record<SeedKind, string> = {
    realm: "Saved realm",
    adventure: "Saved adventure",
    characters: "Saved characters",
    maps: "Saved map pack",
    props: "Saved prop",
  };
  return labels[kind];
}

/** Primary label for a seed in lists, exports, and the output panel. */
export function seedDisplayName(s: SavedRealmSeed): string {
  return (
    s.seedName?.trim() ||
    s.titleHint.trim() ||
    firstMarkdownTitle(s.markdown) ||
    defaultSavedSeedLabel(s.kind)
  );
}

/** Short label describing a seed's scope, used in pickers and lists. */
export function seedScopeLabel(s: SavedRealmSeed): string {
  if (s.kind === "realm" && s.realmSize) {
    return REALM_SIZE_LABEL[s.realmSize].label;
  }
  return SEED_KIND_LABEL[s.kind];
}

/** Label for &lt;select&gt; options (keep reasonably short). */
export function ddeasySeedOptionLabel(s: SavedRealmSeed): string {
  const name =
    s.seedName?.trim() ||
    s.titleHint.trim() ||
    firstMarkdownTitle(s.markdown) ||
    defaultSavedSeedLabel(s.kind);
  const scope = seedScopeLabel(s);
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

/** @deprecated Use ddeasySeedOptionLabel */
export const realmSeedOptionLabel = ddeasySeedOptionLabel;
