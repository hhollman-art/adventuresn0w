/** Markdown pasted into adventure/realm generation (shared clamp). */
export const MAX_REALM_SEED_CHARS = 96_000;

/** Optional library Markdown attached to map image requests. */
export const MAX_LIBRARY_REF_CHARS = 48_000;

export function parseRealmSeedMarkdown(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return raw.length > MAX_REALM_SEED_CHARS
    ? raw.slice(0, MAX_REALM_SEED_CHARS)
    : raw;
}

export function parseLibraryReferenceMarkdown(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return raw.length > MAX_LIBRARY_REF_CHARS
    ? raw.slice(0, MAX_LIBRARY_REF_CHARS)
    : raw;
}
