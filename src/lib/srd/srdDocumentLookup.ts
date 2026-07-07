import { SRD_ATTRIBUTION_SHORT, SRD_MANIFEST } from "@/lib/srd/manifest";
import { SRD_DOCUMENT_BODY, SRD_DOCUMENT_PDF_ID } from "@/lib/srd/srdDocument.data";
import { SRD_DOCUMENT_INDEX, type SrdDocumentIndexEntry } from "@/lib/srd/srdDocumentIndex.data";
import type { SrdApiResource } from "@/lib/srd/dnd5eApi";

export type SrdDocumentChapterId =
  | "playing-the-game"
  | "character-creation"
  | "character-origins"
  | "classes"
  | "feats"
  | "equipment"
  | "spells"
  | "rules-glossary"
  | "gameplay-toolbox"
  | "magic-items"
  | "monsters"
  | "monsters-a-z"
  | "animals"
  | "unknown";

const INDEX_BY_KEY = new Map<string, SrdDocumentIndexEntry>(
  SRD_DOCUMENT_INDEX.map((entry) => [entry.key, entry]),
);

const PREFERRED_CHAPTERS: Partial<Record<SrdApiResource, readonly SrdDocumentChapterId[]>> = {
  spells: ["spells"],
  "magic-items": ["magic-items"],
  equipment: ["equipment"],
  monsters: ["monsters-a-z", "monsters", "animals"],
  classes: ["classes"],
  subclasses: ["classes"],
  races: ["character-origins"],
  feats: ["feats"],
  backgrounds: ["character-origins", "character-creation"],
  conditions: ["rules-glossary"],
  rules: ["playing-the-game", "gameplay-toolbox", "rules-glossary"],
  "rule-sections": [
    "playing-the-game",
    "gameplay-toolbox",
    "rules-glossary",
    "character-creation",
  ],
};

/** Normalize an SRD entry title or API slug for index lookup. */
export function normalizeSrdDocumentKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function lookupKeys(name: string, apiIndex?: string): string[] {
  const keys = new Set<string>();
  if (apiIndex?.trim()) keys.add(normalizeSrdDocumentKey(apiIndex));
  keys.add(normalizeSrdDocumentKey(name));
  return [...keys];
}

function aliasKeys(key: string, resource: SrdApiResource): string[] {
  const aliases = [key];
  if (resource === "monsters") {
    if (key === "goblin") aliases.push("goblin-warrior", "goblin-minion");
    if (key.endsWith("-s") && key.length > 2) aliases.push(key.slice(0, -1));
  }
  return aliases;
}

function pickEntry(
  keys: string[],
  resource: SrdApiResource,
): SrdDocumentIndexEntry | undefined {
  const chapters = PREFERRED_CHAPTERS[resource] ?? [];
  let best: SrdDocumentIndexEntry | undefined;
  let bestScore = -1;

  for (const rawKey of keys) {
    for (const key of aliasKeys(rawKey, resource)) {
      const entry = INDEX_BY_KEY.get(key);
      if (!entry) continue;
      let score = 0;
      const chapterIdx = chapters.indexOf(entry.chapter);
      if (chapterIdx >= 0) score += 100 - chapterIdx * 10;
      score += Math.max(0, 6 - entry.level);
      if (score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
  }

  return best;
}

function documentAttributionFooter(): string {
  return `\n---\n\n${SRD_ATTRIBUTION_SHORT} Text from **${SRD_DOCUMENT_PDF_ID}** (SRD ${SRD_MANIFEST.version}, CC BY 4.0).`;
}

/** Extract one entry's Markdown from the bundled SRD 5.2.1 document, if present. */
export function lookupSrdDocumentMarkdown(params: {
  resource: SrdApiResource;
  name: string;
  index?: string;
}): string | null {
  const entry = pickEntry(lookupKeys(params.name, params.index), params.resource);
  if (!entry) return null;

  const raw = SRD_DOCUMENT_BODY.slice(entry.start, entry.end).trim();
  if (!raw) return null;

  const body = raw.replace(/^#{1,6}\s+[^\n]+\n+/, "").trim();
  return `# ${entry.title}\n\n${body}\n${documentAttributionFooter()}`;
}

export function hasSrdDocumentEntry(params: {
  resource: SrdApiResource;
  name: string;
  index?: string;
}): boolean {
  return pickEntry(lookupKeys(params.name, params.index), params.resource) != null;
}
