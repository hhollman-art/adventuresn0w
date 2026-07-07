/**
 * Builds a structured SRD entity catalogue from the bundled document index.
 * Run: node scripts/build-srd-entities.mjs
 * (Also invoked at the end of scripts/build-srd-document.mjs)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOC = join(ROOT, "src", "lib", "srd", "srdDocument.data.ts");
const INDEX = join(ROOT, "src", "lib", "srd", "srdDocumentIndex.data.ts");
const OUT = join(ROOT, "src", "lib", "srd", "srdEntities.data.ts");
const OUT_ORPHANS = join(ROOT, "src", "lib", "srd", "srdOrphans.data.ts");

const SRD_CLASS_KEYS = new Set([
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
]);

const SPECIES_KEYS = new Set([
  "dragonborn",
  "dwarf",
  "elf",
  "gnome",
  "goliath",
  "halfling",
  "human",
  "orc",
  "tiefling",
]);

const BACKGROUND_KEYS = new Set([
  "acolyte",
  "criminal",
  "entertainer",
  "farmer",
  "guard",
  "guide",
  "hermit",
  "merchant",
  "noble",
  "sage",
  "sailor",
  "scribe",
  "soldier",
  "wayfarer",
]);

/** Combat conditions in the Rules Glossary — not general glossary terms. */
const COMBAT_CONDITION_KEYS = new Set([
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
]);

const SKILL_KEYS = new Set([
  "acrobatics",
  "animal-handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight-of-hand",
  "stealth",
  "survival",
]);

const META_KEYS = new Set([
  "gaining-spells",
  "casting-spells",
  "casting-time",
  "range",
  "components",
  "duration",
  "effects",
  "targets",
  "saving-throws",
  "attack-rolls",
  "combining-spell-effects",
  "spell-descriptions",
  "spell-slots",
  "casting-without-slots",
  "using-a-higher-level-spell-slot",
  "identifying-a-magic-item",
  "attunement",
  "wearing-and-wielding-items",
  "activating-an-item",
  "glossary-conventions",
  "rules-definitions",
  "travel-pace",
  "creating-a-background",
  "curses-and-magical-contagions",
  "environmental-effects",
  "otherworldly-steed",
  "giant-insect",
  "draconic-spirit",
  "actions",
  "bonus-actions",
  "reactions",
  "social-interaction",
  "exploration",
  "combat",
  "damage-and-healing",
  "character-creation",
  "becoming-a-paladin",
  "becoming-a-cleric",
  "character-backgrounds",
  "character-species",
  "equipment",
  "magic-items",
  "monsters",
  "monsters-a-z",
  "animals",
  "spells",
  "feats",
  "character-classes",
]);

function readExportedJson(file, exportName) {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(`export const ${exportName}[^=]*= ([\\s\\S]+);\\s*$`);
  const m = src.match(re);
  if (!m) throw new Error(`Could not parse ${exportName} from ${file}`);
  const raw = m[1].replace(/\s*as const\s*$/, "");
  return JSON.parse(raw);
}

function extractSubtitle(body, start, end) {
  const slice = body.slice(start, end);
  const m = slice.match(/^\s*_(.+?)_/m);
  return m ? m[1].trim() : null;
}

function parentSectionKey(index, entry) {
  let parent = null;
  for (const row of index) {
    if (row.start >= entry.start) break;
    if (row.chapter !== entry.chapter) continue;
    if (row.level < entry.level) parent = row;
  }
  return parent?.key ?? null;
}

function classify(entry, body, index) {
  const { chapter, level, key, title } = entry;
  if (META_KEYS.has(key)) return { kind: null };

  if (chapter === "spells" && level === 5) {
    return { kind: "spell", taxonomy: "spells" };
  }
  if (chapter === "magic-items" && level === 5) {
    return { kind: "magic-item", taxonomy: "magic_items" };
  }
  if ((chapter === "monsters-a-z" || chapter === "animals") && level >= 4) {
    return { kind: "monster", taxonomy: "monsters" };
  }
  if (chapter === "monsters" && level === 3) {
    return { kind: null };
  }

  if (chapter === "classes") {
    if (level === 3 && SRD_CLASS_KEYS.has(key)) {
      return { kind: "class", taxonomy: "classes" };
    }
    if (level >= 4) {
      return { kind: "class-feature", taxonomy: "class_features" };
    }
  }

  if (chapter === "feats" && level === 5) {
    return { kind: "feat", taxonomy: "feats" };
  }

  if (chapter === "character-origins") {
    if (level === 3 && /background/i.test(title)) return { kind: null };
    if (level === 3 && /species/i.test(title)) return { kind: null };
    if (level === 5 && BACKGROUND_KEYS.has(key)) {
      return { kind: "background", taxonomy: "backgrounds" };
    }
    if (level === 5 && SPECIES_KEYS.has(key)) {
      return { kind: "species", taxonomy: "races" };
    }
  }

  if (chapter === "rules-glossary" && level === 5) {
    const baseKey = key.replace(/-condition$/, "");
    if (COMBAT_CONDITION_KEYS.has(baseKey)) {
      return { kind: "condition", taxonomy: "conditions" };
    }
    if (SKILL_KEYS.has(key)) {
      return { kind: "skill", taxonomy: "skills" };
    }
    return { kind: "glossary-term", taxonomy: "rules" };
  }

  if (
    (chapter === "playing-the-game" ||
      chapter === "gameplay-toolbox" ||
      chapter === "character-creation") &&
    level === 3
  ) {
    return { kind: "rule", taxonomy: "rules" };
  }

  if (chapter === "equipment" && level === 5) {
    const subtitle = extractSubtitle(body, entry.start, entry.end) ?? "";
    const parentKey = parentSectionKey(index, entry);
    if (parentKey === "armor" || /\barmor\b/i.test(subtitle) || /^armor\b/i.test(title)) {
      return { kind: "armor", taxonomy: "armor" };
    }
    if (
      parentKey === "weapons" ||
      /\bweapon\b/i.test(subtitle) ||
      /\(d\d|versatile|finesse|thrown|ammunition|loading|reach|two-handed|light|heavy|martial|simple/i.test(
        subtitle,
      )
    ) {
      return { kind: "weapon", taxonomy: "weapons" };
    }
    return { kind: "equipment", taxonomy: "equipment" };
  }

  if (chapter === "equipment" && level === 3) {
    return { kind: "rule", taxonomy: "rules" };
  }

  return { kind: null };
}

const body = readExportedJson(DOC, "SRD_DOCUMENT_BODY");
const index = readExportedJson(INDEX, "SRD_DOCUMENT_INDEX");

const entities = [];
const orphans = [];
const seen = new Set();

for (const entry of index) {
  const result = classify(entry, body, index);
  if (!result.kind) {
    if (!META_KEYS.has(entry.key)) {
      orphans.push({
        key: entry.key,
        title: entry.title,
        chapter: entry.chapter,
        level: entry.level,
        start: entry.start,
        end: entry.end,
        reason: `No taxonomy match for chapter=${entry.chapter}, level=${entry.level}`,
        fields: ["key", "title", "chapter", "level", "start", "end"],
        guess: entry.chapter === "equipment" ? "equipment" : entry.chapter,
      });
    }
    continue;
  }

  const id = `${result.kind}:${entry.key}`;
  if (seen.has(id)) {
    orphans.push({
      key: entry.key,
      title: entry.title,
      chapter: entry.chapter,
      level: entry.level,
      reason: `Duplicate id ${id} — lower-priority index row skipped`,
      guess: result.taxonomy,
    });
    continue;
  }
  seen.add(id);

  entities.push({
    id,
    kind: result.kind,
    name: entry.title,
    key: entry.key,
    chapter: entry.chapter,
    subtitle: extractSubtitle(body, entry.start, entry.end),
    start: entry.start,
    end: entry.end,
    taxonomyCategory: result.taxonomy,
    sourceFile: `srdDocumentIndex:${entry.chapter}/${entry.key}`,
  });
}

entities.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

const counts = entities.reduce((acc, e) => {
  acc[e.kind] = (acc[e.kind] ?? 0) + 1;
  return acc;
}, {});

const taxonomyCounts = entities.reduce((acc, e) => {
  acc[e.taxonomyCategory] = (acc[e.taxonomyCategory] ?? 0) + 1;
  return acc;
}, {});

writeFileSync(
  OUT,
  `/** Auto-generated by scripts/build-srd-entities.mjs — do not edit by hand. */
import type { SrdEntitySummary } from "./types";

/** ${entities.length} read-only SRD entities from the bundled document index. */
export const SRD_ENTITY_COUNTS: Record<string, number> = ${JSON.stringify(counts, null, 2)};

export const SRD_TAXONOMY_COUNTS: Record<string, number> = ${JSON.stringify(taxonomyCounts, null, 2)};

export const SRD_ENTITIES: readonly SrdEntitySummary[] = ${JSON.stringify(entities, null, 2)} as const;
`,
  "utf8",
);

writeFileSync(
  OUT_ORPHANS,
  `/** Auto-generated by scripts/build-srd-entities.mjs — unclassified or skipped index rows. */
import type { SrdOrphanRecord } from "./types";

export const SRD_ORPHAN_COUNT = ${orphans.length};

export const SRD_ORPHANS: readonly SrdOrphanRecord[] = ${JSON.stringify(orphans, null, 2)} as const;
`,
  "utf8",
);

console.log(`Wrote ${entities.length} SRD entities`, counts);
console.log(`Wrote ${orphans.length} orphan records`);
console.log("Taxonomy:", taxonomyCounts);
