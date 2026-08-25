import type { AbilityScores, PlayerCharacter } from "./types";

export type ParsedCharacterRoster = {
  rosterName: string;
  players: Omit<PlayerCharacter, "tokenId">[];
};

const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

const ABILITY_ALIASES: Record<keyof AbilityScores, RegExp> = {
  str: /\b(?:STR|Strength)\b[^0-9]{0,8}(\d{1,2})/i,
  dex: /\b(?:DEX|Dexterity)\b[^0-9]{0,8}(\d{1,2})/i,
  con: /\b(?:CON|Constitution)\b[^0-9]{0,8}(\d{1,2})/i,
  int: /\b(?:INT|Intelligence)\b[^0-9]{0,8}(\d{1,2})/i,
  wis: /\b(?:WIS|Wisdom)\b[^0-9]{0,8}(\d{1,2})/i,
  cha: /\b(?:CHA|Charisma)\b[^0-9]{0,8}(\d{1,2})/i,
};

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function firstHeadingTitle(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}

function extractCharactersSection(md: string): string {
  const lines = md.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (/^##\s+characters\b/i.test(t)) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return md;

  const chunk: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (/^##\s+/.test(t) && !/^###\s+/.test(t)) break;
    chunk.push(lines[i]);
  }
  return chunk.join("\n");
}

function splitCharacterBlocks(section: string): { heading: string; body: string }[] {
  const lines = section.split("\n");
  const blocks: { heading: string; body: string }[] = [];
  let currentHeading: string | null = null;
  let bodyLines: string[] = [];

  const flush = () => {
    if (currentHeading) {
      blocks.push({ heading: currentHeading, body: bodyLines.join("\n").trim() });
    }
    bodyLines = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("### ")) {
      flush();
      currentHeading = t.replace(/^###\s+/, "").trim();
    } else if (currentHeading) {
      bodyLines.push(line);
    }
  }
  flush();
  return blocks;
}

function parseHeading(heading: string): {
  name: string;
  className: string;
  level: number;
} {
  const levelMatch =
    /\((?:Level\s*)?(\d+)\)/i.exec(heading) ?? /,\s*Level\s*(\d+)/i.exec(heading);
  const level = levelMatch ? clampInt(Number(levelMatch[1]), 1, 20, 1) : 1;

  const withoutLevel = heading
    .replace(/\((?:Level\s*)?\d+\)/i, "")
    .replace(/,\s*Level\s*\d+/i, "")
    .trim();

  const dashSplit = withoutLevel.split(/\s*[—–-]\s*/);
  if (dashSplit.length >= 2) {
    return {
      name: dashSplit[0].trim(),
      className: dashSplit.slice(1).join(" — ").trim(),
      level,
    };
  }

  return { name: withoutLevel || "Unnamed", className: "", level };
}

function parseBulletValue(body: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*(?:[-*]|\\d+\\.)\\s*(?:\\*\\*)?${label}(?:\\*\\*)?\\s*[:\\-–—]?\\s*(.+)$`,
      "im",
    );
    const m = re.exec(body);
    if (m) return m[1].replace(/\*\*/g, "").trim();
  }
  return "";
}

function parseNumber(raw: string, fallback: number, min: number, max: number): number {
  const m = /(-?\d+)/.exec(raw);
  if (!m) return fallback;
  return clampInt(Number(m[1]), min, max, fallback);
}

function parseAbilities(body: string): AbilityScores {
  const scores = { ...DEFAULT_ABILITIES };
  const compact = body.replace(/\*\*/g, "");

  for (const key of Object.keys(ABILITY_ALIASES) as (keyof AbilityScores)[]) {
    const m = ABILITY_ALIASES[key].exec(compact);
    if (m) scores[key] = clampInt(Number(m[1]), 1, 30, scores[key]);
  }

  return scores;
}

function collectNotes(body: string): string {
  const keep: string[] = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-*]\s/.test(t) || /^\d+\.\s/.test(t)) {
      keep.push(t.replace(/^[-*]\s+|^\d+\.\s+/, "").replace(/\*\*/g, ""));
    }
  }
  return keep.join("\n");
}

function parseCharacterBlock(
  heading: string,
  body: string,
  id: string,
): Omit<PlayerCharacter, "tokenId"> | null {
  const { name, className: headingClass, level } = parseHeading(heading);
  if (!name.trim()) return null;

  const species = parseBulletValue(body, ["Race", "Species", "Ancestry"]);
  const background = parseBulletValue(body, ["Background"]);
  const alignment = parseBulletValue(body, ["Alignment"]);
  const subclass = parseBulletValue(body, ["Subclass", "Sub-class", "Archetype"]);
  const playerName = parseBulletValue(body, ["Player", "Played by"]);
  const classFromBody = parseBulletValue(body, ["Class", "Character class"]);

  const acRaw = parseBulletValue(body, ["AC", "Armor Class"]);
  const hpRaw = parseBulletValue(body, ["HP", "Hit points", "Hit Points", "Health"]);
  const speedRaw = parseBulletValue(body, ["Speed", "Walk", "Walking speed"]);

  const className = (classFromBody || headingClass)
    .replace(/\(\s*Level\s*\d+\s*\)/i, "")
    .trim();

  return {
    id,
    name,
    playerName,
    species,
    className,    subclass,
    background,
    alignment,
    level,
    abilities: parseAbilities(body),
    ac: parseNumber(acRaw, 10, 1, 40),
    maxHp: parseNumber(hpRaw, 10, 1, 999),
    speed: parseNumber(speedRaw, 30, 0, 200),
    notes: collectNotes(body),
    items: [],
    knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
    currentHp: null,
  };
}

let idCounter = 0;

function tempId(): string {
  idCounter += 1;
  return `parse-${idCounter}`;
}

/** Reset temp ids between tests. */
export function resetParseCharacterIdsForTests(): void {
  idCounter = 0;
}

/**
 * Best-effort parser for pre-made character Markdown from the Characters tab.
 * Returns playable VTT sheets; unknown fields fall back to sensible defaults.
 */
export function parseCharactersMarkdown(markdown: string): ParsedCharacterRoster {
  const rosterName = firstHeadingTitle(markdown) ?? "Saved party";
  const section = extractCharactersSection(markdown);
  const blocks = splitCharacterBlocks(section);

  const players = blocks
    .map(({ heading, body }) => parseCharacterBlock(heading, body, tempId()))
    .filter((p): p is Omit<PlayerCharacter, "tokenId"> => p !== null && !!p.name.trim());

  return { rosterName, players };
}
