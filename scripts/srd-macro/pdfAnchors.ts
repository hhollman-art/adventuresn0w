/**
 * Text-anchor boundaries for macro SRD extraction.
 * Uses string matchers in the PDF stream — NOT page numbers — to locate sections.
 */

export type MacroAnchorId = "character_creation" | "fighter" | "gameplay_mechanics";

export type MacroAnchorDef = {
  id: MacroAnchorId;
  title: string;
  /** Hints for dry-run logging only (approximate PDF pages). */
  approximatePageHint?: number;
  startPhrases: string[];
  endPhrases: string[];
  /** Skip matches before this character index (avoids TOC false positives). */
  minCharIndex?: number;
};

export const MACRO_ANCHORS: MacroAnchorDef[] = [
  {
    id: "character_creation",
    title: "Character Creation",
    approximatePageHint: 19,
    minCharIndex: 50_000,
    startPhrases: ["Choose a Character Sheet", "Create Your Character", "Step 1: Choose Class"],
    endPhrases: ["Becoming a Barbarian", "Core Barbarian Traits"],
  },
  {
    id: "fighter",
    title: "Fighter",
    approximatePageHint: 47,
    minCharIndex: 140_000,
    startPhrases: ["Core Fighter Traits", "Fighter Features", "Becoming a Fighter"],
    endPhrases: ["Becoming a Monk", "Core Monk Traits", "Monk Class Features"],
  },
  {
    id: "gameplay_mechanics",
    title: "Gameplay Mechanics & Rules Glossary",
    approximatePageHint: 176,
    minCharIndex: 600_000,
    startPhrases: ["Rules Glossary", "Rules Definitions", "Glossary Conventions"],
    endPhrases: ["Gameplay Toolbox", "Magic Items"],
  },
];

export const CONDITION_NAMES = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;

export const COMBAT_ACTION_TITLE_MARK = "[Action]";

export type AnchorBoundary = {
  id: MacroAnchorId;
  title: string;
  startPhrase: string;
  endPhrase: string;
  startIndex: number;
  endIndex: number;
  charCount: number;
  startPage: number | null;
  endPage: number | null;
  approximatePageHint?: number;
};

function isTocLine(line: string): boolean {
  return /\.{4,}\s*\d+\s*$/.test(line.trim());
}

export function stripTableOfContents(text: string): string {
  return text
    .split("\n")
    .filter((line) => !isTocLine(line))
    .join("\n");
}

function findPhraseIndex(text: string, phrase: string, minIndex: number): number {
  let from = minIndex;
  while (from < text.length) {
    const index = text.indexOf(phrase, from);
    if (index < 0) return -1;
    if (index >= minIndex) return index;
    from = index + 1;
  }
  return -1;
}

export function pageAtOffset(text: string, offset: number): number | null {
  const prefix = text.slice(0, Math.max(0, offset));
  const matches = [...prefix.matchAll(/<!--\s*page:(\d+)\s*-->/g)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

export function detectAnchorBoundary(text: string, anchor: MacroAnchorDef): AnchorBoundary | null {
  const minIndex = anchor.minCharIndex ?? 0;
  let startIndex = -1;
  let startPhrase = "";

  for (const phrase of anchor.startPhrases) {
    const index = findPhraseIndex(text, phrase, minIndex);
    if (index >= 0 && (startIndex < 0 || index < startIndex)) {
      startIndex = index;
      startPhrase = phrase;
    }
  }

  if (startIndex < 0) return null;

  let endIndex = text.length;
  let endPhrase = "(document end)";

  for (const phrase of anchor.endPhrases) {
    const index = findPhraseIndex(text, phrase, startIndex + 500);
    if (index >= 0 && index < endIndex) {
      endIndex = index;
      endPhrase = phrase;
    }
  }

  return {
    id: anchor.id,
    title: anchor.title,
    startPhrase,
    endPhrase,
    startIndex,
    endIndex,
    charCount: endIndex - startIndex,
    startPage: pageAtOffset(text, startIndex),
    endPage: pageAtOffset(text, endIndex),
    approximatePageHint: anchor.approximatePageHint,
  };
}

export function detectAllAnchorBoundaries(text: string): AnchorBoundary[] {
  return MACRO_ANCHORS.map((anchor) => detectAnchorBoundary(text, anchor)).filter(
    (boundary): boundary is AnchorBoundary => boundary != null,
  );
}

export function logAnchorBoundaries(boundaries: AnchorBoundary[]): void {
  console.log("\n=== PDF anchor boundaries (text matchers) ===");
  for (const boundary of boundaries) {
    const pageRange =
      boundary.startPage != null
        ? `pages ${boundary.startPage}–${boundary.endPage ?? "?"}`
        : "pages unknown";
    console.log(`  ${boundary.title.padEnd(28)} ${boundary.charCount.toLocaleString()} chars  (${pageRange})`);
    console.log(`    start: "${boundary.startPhrase}" @ ${boundary.startIndex.toLocaleString()}`);
    console.log(`    end:   "${boundary.endPhrase}" @ ${boundary.endIndex.toLocaleString()}`);
    if (boundary.approximatePageHint != null && boundary.startPage != null) {
      const delta = boundary.startPage - boundary.approximatePageHint;
      if (Math.abs(delta) > 3) {
        console.log(`    note:  hint page ~${boundary.approximatePageHint}, found page ${boundary.startPage}`);
      }
    }
  }
}
