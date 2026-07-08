import { slugify } from "./slug.js";
import type { ParsedSpell } from "./types.js";
import { sliceContentSection } from "./parseSections.js";

const SPELL_ENTRY_PATTERN =
  /(?:^|\n\n)([A-Z][A-Za-z0-9'’\-]+(?: [A-Z][A-Za-z0-9'’\-]+){0,4})\s*\n(Cantrip|Level \d+[^\n]*)\s*\nCasting Time:\s*([^\n]+)\s*\nRange:\s*([^\n]+)\s*\nComponents:\s*([^\n]+)\s*\nDuration:\s*([^\n]+)\s*\n([\s\S]*?)(?=(?:\n\n[A-Z][A-Za-z0-9'’\-]+(?: [A-Z][A-Za-z0-9'’\-]+){0,4}\s*\n(?:Cantrip|Level \d+))|$)/g;

function parseLevel(levelLine: string): { level: number; levelLabel: string; school: string } {
  const trimmed = levelLine.trim();
  const cantrip = /cantrip/i.test(trimmed);
  const levelMatch = /level\s*(\d+)/i.exec(trimmed);
  const level = cantrip ? 0 : levelMatch ? Number(levelMatch[1]) : -1;
  const schoolMatch = /(?:cantrip|level \d+)\s+([a-z]+)/i.exec(trimmed);
  const schoolRaw = schoolMatch?.[1] ?? "unknown";
  const school = schoolRaw.charAt(0).toUpperCase() + schoolRaw.slice(1).toLowerCase();
  return { level, levelLabel: trimmed, school };
}

function parseClasses(levelLine: string): string[] {
  const paren = /\(([^)]+)\)/.exec(levelLine);
  if (!paren?.[1]) return [];
  return paren[1]
    .split(/[,;]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function splitHigherLevel(body: string): { description: string; higherLevel: string | null } {
  const match = /\bUsing a Higher-Level Spell Slot\.|\bAt Higher Levels\.?/i.exec(body);
  if (!match?.index) {
    return { description: body.trim(), higherLevel: null };
  }
  return {
    description: body.slice(0, match.index).trim(),
    higherLevel: body.slice(match.index).trim(),
  };
}

function pageNumbersInMarkdown(markdown: string): number[] {
  const pages = new Set<number>();
  for (const match of markdown.matchAll(/<!-- page:(\d+) -->/g)) {
    pages.add(Number(match[1]));
  }
  return [...pages].sort((a, b) => a - b);
}

function buildSpellMarkdown(fields: {
  name: string;
  levelLabel: string;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higherLevel: string | null;
}): string {
  const classList = fields.classes.length ? fields.classes.join(", ") : "—";
  const lines = [
    `# ${fields.name}`,
    "",
    `*${fields.levelLabel} (${fields.school}) — ${classList}*`,
    "",
    `**Casting Time:** ${fields.castingTime}`,
    `**Range:** ${fields.range}`,
    `**Components:** ${fields.components}`,
    `**Duration:** ${fields.duration}`,
    "",
    fields.description,
  ];
  if (fields.higherLevel) lines.push("", fields.higherLevel);
  return lines.join("\n").trim();
}

export function parseSpells(fullText: string): ParsedSpell[] {
  const spellsText = sliceContentSection(fullText, "spells");
  const spells: ParsedSpell[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  const re = new RegExp(SPELL_ENTRY_PATTERN.source, SPELL_ENTRY_PATTERN.flags);
  while ((match = re.exec(spellsText)) !== null) {
    const name = match[1]?.trim().replace(/\s*,\s*$/, "");
    const levelLine = match[2]?.trim() ?? "";
    if (!name || name.length < 2 || /^(System Reference|Spell Descriptions)$/i.test(name)) continue;

    const { level, levelLabel, school } = parseLevel(levelLine);
    const classes = parseClasses(levelLine);
    const castingTime = match[3]?.trim() ?? "";
    const range = match[4]?.trim() ?? "";
    const components = match[5]?.trim() ?? "";
    const duration = match[6]?.trim() ?? "";
    const body = match[7]?.trim() ?? "";
    const { description, higherLevel } = splitHigherLevel(body);
    const key = slugify(name);
    if (seen.has(key)) continue;
    seen.add(key);

    const markdown = buildSpellMarkdown({
      name,
      levelLabel,
      school,
      classes,
      castingTime,
      range,
      components,
      duration,
      description,
      higherLevel,
    });

    spells.push({
      key,
      name,
      level,
      levelLabel,
      school,
      castingTime,
      range,
      components,
      duration,
      classes,
      description,
      higherLevel,
      markdown,
      _source_file: `srdPdf:spells/${key}`,
      sourcePages: pageNumbersInMarkdown(match[0] ?? markdown),
    });
  }

  return spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function parseSpellsFromChapter(spellsText: string): ParsedSpell[] {
  return parseSpells(`<!-- page:0 -->\n${spellsText}`);
}
