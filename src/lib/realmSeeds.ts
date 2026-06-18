import { REALM_SIZE_LABEL, type RealmSize } from "@/lib/realmPrompt";

const STORAGE_KEY = "ddeasy-realm-seeds-v1";
const MAX_SEEDS = 25;

/** Seeds can ground either a new realm or a new adventure. */
export type SeedKind = "realm" | "adventure";

export const SEED_KIND_LABEL: Record<SeedKind, string> = {
  realm: "Realm",
  adventure: "Adventure",
};

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

function isSeedKind(v: unknown): v is SeedKind {
  return v === "realm" || v === "adventure";
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
  // Realm seeds must carry a scale; fall back to "region" for legacy rows.
  if (kind === "realm" && realmSize === undefined) {
    return {
      id: o.id,
      createdAt: o.createdAt,
      kind,
      realmSize: "region",
      seedName: o.seedName as string | undefined,
      titleHint: o.titleHint,
      briefDescription: o.briefDescription,
      markdown: o.markdown,
    };
  }
  return {
    id: o.id,
    createdAt: o.createdAt,
    kind,
    ...(kind === "realm" ? { realmSize } : {}),
    seedName: o.seedName as string | undefined,
    titleHint: o.titleHint,
    briefDescription: o.briefDescription,
    markdown: o.markdown,
  };
}

export function loadRealmSeeds(): SavedRealmSeed[] {
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

export function appendRealmSeed(params: {
  kind: SeedKind;
  seedName: string;
  realmSize?: RealmSize;
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
    kind: params.kind,
    ...(params.kind === "realm"
      ? { realmSize: params.realmSize ?? "region" }
      : {}),
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
    kind: SeedKind;
    seedName: string;
    realmSize?: RealmSize;
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
          kind: patch.kind,
          ...(patch.kind === "realm"
            ? { realmSize: patch.realmSize ?? s.realmSize ?? "region" }
            : { realmSize: undefined }),
          seedName: patch.seedName.trim(),
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
export function suggestedSeedName(
  markdown: string,
  titleHint: string,
  kind: SeedKind = "realm",
): string {
  const fromHint = titleHint.trim();
  if (fromHint) return fromHint;
  const fromTitle = firstMarkdownTitle(markdown);
  if (fromTitle) return fromTitle;
  return kind === "adventure" ? "My adventure" : "My realm";
}

/** Short label describing a seed's scope, used in pickers and lists. */
export function seedScopeLabel(s: SavedRealmSeed): string {
  if (s.kind === "adventure") return SEED_KIND_LABEL.adventure;
  return s.realmSize ? REALM_SIZE_LABEL[s.realmSize].label : SEED_KIND_LABEL.realm;
}

/** Label for &lt;select&gt; options (keep reasonably short). */
export function ddeasySeedOptionLabel(s: SavedRealmSeed): string {
  const name =
    s.seedName?.trim() ||
    s.titleHint.trim() ||
    firstMarkdownTitle(s.markdown) ||
    (s.kind === "adventure" ? "Saved adventure" : "Saved realm");
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
