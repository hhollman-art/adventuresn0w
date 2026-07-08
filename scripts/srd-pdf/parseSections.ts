import { prefixedSlug, slugify } from "./slug.js";
import type { CharacterCreationStep, SystemRuleEntry } from "./types.js";

type ContentAnchor = {
  id: string;
  title: string;
  minIndex: number;
  startPhrases: string[];
  endPhrases: string[];
};

const CONTENT_ANCHORS: ContentAnchor[] = [
  {
    id: "playing-the-game",
    title: "Playing the Game",
    minIndex: 25_000,
    startPhrases: ["Rhythm of Play", "Playing the Game"],
    endPhrases: ["Choose a Character Sheet"],
  },
  {
    id: "character-creation",
    title: "Character Creation",
    minIndex: 60_000,
    startPhrases: ["Choose a Character Sheet", "Step 1: Choose Class"],
    endPhrases: ["Becoming a Barbarian", "Core Barbarian Traits"],
  },
  {
    id: "spells",
    title: "Spells",
    minIndex: 370_000,
    startPhrases: ["Spell Descriptions", "Acid Arrow"],
    endPhrases: ["Rules Glossary", "Rules Definitions"],
  },
  {
    id: "rules-glossary",
    title: "Rules Glossary",
    minIndex: 680_000,
    startPhrases: ["Rules Glossary", "Rules Definitions", "Glossary Conventions"],
    endPhrases: ["Gameplay Toolbox"],
  },
];

const CHARACTER_STEP_PATTERN =
  /^(Step [1-5]:\s*.+|Choose a Character Sheet|Create Your Character|Level Advancement|Starting at Higher Levels|Multiclassing|Trinkets)\s*$/im;

const SYSTEM_RULE_HEADING_PATTERN =
  /^(Combat|Damage and Healing|Social Interaction|Exploration|Movement and Position|Making an Attack|Resting|Cover|The Order of Combat|Combat Step by Step|Your Turn|Vision and Light|Travel|Death Saving Throws|Glossary Conventions)\s*$/im;

const CONDITION_NAMES = [
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
];

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

function findAnchorIndex(text: string, anchor: ContentAnchor): number {
  let best = -1;
  for (const phrase of anchor.startPhrases) {
    const index = findPhraseIndex(text, phrase, anchor.minIndex);
    if (index >= 0 && (best < 0 || index < best)) best = index;
  }
  return best;
}

function findEndIndex(text: string, start: number, endPhrases: string[]): number {
  let end = text.length;
  for (const phrase of endPhrases) {
    const index = findPhraseIndex(text, phrase, start + 1_000);
    if (index >= 0) end = Math.min(end, index);
  }
  return end > start ? end : text.length;
}

export function sliceContentSection(text: string, anchorId: string): string {
  const anchor = CONTENT_ANCHORS.find((item) => item.id === anchorId);
  if (!anchor) return "";
  const start = findAnchorIndex(text, anchor);
  if (start < 0) return "";
  const end = findEndIndex(text, start, anchor.endPhrases);
  return text.slice(start, end);
}

function pageNumbersInMarkdown(markdown: string): number[] {
  const pages = new Set<number>();
  for (const match of markdown.matchAll(/<!-- page:(\d+) -->/g)) {
    pages.add(Number(match[1]));
  }
  return [...pages].sort((a, b) => a - b);
}

function splitByHeadingPattern(text: string, pattern: RegExp): Array<{ key: string; title: string; markdown: string }> {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const matches = [...text.matchAll(re)];
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    const title = match[0].trim();
    return {
      key: slugify(title),
      title,
      markdown: text.slice(start, end).trim(),
    };
  });
}

export function parseCharacterCreationSteps(fullText: string): CharacterCreationStep[] {
  const chapterText = sliceContentSection(fullText, "character-creation");
  const sections = splitByHeadingPattern(chapterText, CHARACTER_STEP_PATTERN);

  return sections.map((section, order) => ({
    order,
    key: section.key,
    slug: section.key,
    title: section.title,
    markdown: section.markdown,
    _category: "character_creation" as const,
    _source_file: `srdPdf:character-creation/${section.key}`,
    sourcePages: pageNumbersInMarkdown(section.markdown),
  }));
}

export function parseSystemRules(fullText: string): SystemRuleEntry[] {
  const playingText = sliceContentSection(fullText, "playing-the-game");
  const glossaryText = sliceContentSection(fullText, "rules-glossary");
  const entries: SystemRuleEntry[] = [];
  const seen = new Set<string>();

  const push = (title: string, markdown: string, prefix: string) => {
    const slug = prefixedSlug(prefix, title);
    if (seen.has(slug) || markdown.length < 40) return;
    seen.add(slug);
    entries.push({
      key: slug,
      slug,
      title,
      markdown: markdown.trim(),
      _category: "system_rules",
      _source_file: `srdPdf:system-rules/${slug}`,
      sourcePages: pageNumbersInMarkdown(markdown),
    });
  };

  for (const section of splitByHeadingPattern(playingText, SYSTEM_RULE_HEADING_PATTERN)) {
    const prefix = /combat|attack|damage|cover|death|order of combat/i.test(section.title)
      ? "combat"
      : /exploration|travel|vision|movement|rest/i.test(section.title)
        ? "adventuring"
        : "rules";
    push(section.title, section.markdown, prefix);
  }

  for (const condition of CONDITION_NAMES) {
    const pattern = new RegExp(`^${condition}\\s*$`, "im");
    const match = pattern.exec(glossaryText);
    if (!match?.index) continue;
    const tail = glossaryText.slice(match.index + 1);
    let end = glossaryText.length;
    for (const other of CONDITION_NAMES) {
      if (other === condition) continue;
      const next = new RegExp(`^${other}\\s*$`, "im").exec(tail);
      if (next?.index != null) {
        end = Math.min(end, match.index + 1 + next.index);
      }
    }
    push(condition, glossaryText.slice(match.index, end), "condition");
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export function summarizeDetectedSections(fullText: string): Array<{ id: string; title: string; chars: number }> {
  return CONTENT_ANCHORS.map((anchor) => {
    const slice = sliceContentSection(fullText, anchor.id);
    return { id: anchor.id, title: anchor.title, chars: slice.length };
  }).filter((row) => row.chars > 0);
}

export function attachPageStats(pages: Array<{ charCount: number }>): {
  pageCount: number;
  charCount: number;
} {
  return {
    pageCount: pages.length,
    charCount: pages.reduce((sum, page) => sum + page.charCount, 0),
  };
}
