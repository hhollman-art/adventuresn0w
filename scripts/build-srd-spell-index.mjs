/**
 * Builds the master SRD spell index from Open5e (structured fields) merged with
 * bundled document entity keys (5.2.1 text offsets).
 *
 * Run: node scripts/build-srd-spell-index.mjs
 * (Also invoked at the end of scripts/build-srd-spells.mjs)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENTITIES = join(ROOT, "src", "lib", "srd", "srdEntities.data.ts");
const OUT = join(ROOT, "src", "lib", "srd", "spellIndex.data.ts");

function normalizeKey(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseComponents(spell) {
  const raw = String(spell.components ?? spell.material ?? "").toUpperCase();
  return {
    verbal: raw.includes("V"),
    somatic: raw.includes("S"),
    material: raw.includes("M"),
    materialDescription: spell.material ? String(spell.material).trim() : null,
  };
}

function readSpellEntities() {
  try {
    const src = readFileSync(ENTITIES, "utf8");
    const m = src.match(/export const SRD_ENTITIES[^=]*= (\[[\s\S]+?\]) as const;/);
    if (!m) return new Map();
    const entities = JSON.parse(m[1]);
    const byKey = new Map();
    for (const entity of entities) {
      if (entity.kind !== "spell") continue;
      byKey.set(entity.key, entity);
    }
    return byKey;
  } catch {
    return new Map();
  }
}

async function fetchAllSpells() {
  const spells = [];
  let url = "https://api.open5e.com/v1/spells/?document__slug=wotc-srd&limit=100";

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open5e fetch failed (${res.status}): ${url}`);
    const data = await res.json();
    for (const spell of data.results ?? []) {
      const components = parseComponents(spell);
      const lists = Array.isArray(spell.spell_lists) ? spell.spell_lists : [];
      spells.push({
        id: String(spell.slug).trim(),
        name: String(spell.name).trim(),
        level: Number(spell.spell_level ?? spell.level_int ?? 0),
        school: String(spell.school ?? "Unknown").trim(),
        castingTime: String(spell.casting_time ?? "").trim(),
        range: String(spell.range ?? "").trim(),
        components,
        duration: String(spell.duration ?? "").trim(),
        classes: [...new Set(lists.map((c) => String(c).toLowerCase().trim()).filter(Boolean))].sort(),
        source: "open5e-wotc-srd",
        sourcePage: null,
        description: String(spell.desc ?? "").trim(),
        higherLevel: String(spell.higher_level ?? "").trim() || null,
      });
    }
    url = data.next ?? null;
  }

  return spells;
}

const documentSpells = readSpellEntities();
const open5eSpells = await fetchAllSpells();

const merged = open5eSpells.map((spell) => {
  const key = normalizeKey(spell.name);
  const doc = documentSpells.get(key) ?? documentSpells.get(spell.id);
  const hasDoc = Boolean(doc);
  return {
    ...spell,
    key,
    entityId: doc ? `spell:${doc.key}` : (`spell:${key}`),
    documentKey: doc?.key ?? key,
    sourceFile: doc ? `srdDocumentIndex:spells/${doc.key}` : "open5e:wotc-srd",
    taxonomyCategory: "spell_index",
    start: doc?.start ?? null,
    end: doc?.end ?? null,
    subtitle: doc?.subtitle ?? null,
    edition: hasDoc ? "5.2.1" : "2014",
    dataSource: hasDoc ? "document" : "open5e",
  };
});

// Include document-only spells not in Open5e
for (const [key, doc] of documentSpells) {
  if (merged.some((s) => s.documentKey === key)) continue;
  merged.push({
    id: key,
    key,
    name: doc.name,
    level: parseLevelFromSubtitle(doc.subtitle),
    school: parseSchoolFromSubtitle(doc.subtitle),
    castingTime: "",
    range: "",
    components: { verbal: false, somatic: false, material: false, materialDescription: null },
    duration: "",
    classes: [],
    source: "srd-document",
    sourcePage: null,
    description: "",
    higherLevel: null,
    entityId: `spell:${key}`,
    documentKey: key,
    sourceFile: `srdDocumentIndex:spells/${key}`,
    taxonomyCategory: "spell_index",
    start: doc.start,
    end: doc.end,
    subtitle: doc.subtitle,
    edition: "5.2.1",
    dataSource: "document",
  });
}

function parseLevelFromSubtitle(subtitle) {
  if (!subtitle) return 0;
  const m = subtitle.match(/(\d+)(?:st|nd|rd|th)-level/i);
  if (m) return Number(m[1]);
  if (/cantrip/i.test(subtitle)) return 0;
  return 0;
}

function parseSchoolFromSubtitle(subtitle) {
  if (!subtitle) return "Unknown";
  const m = subtitle.match(/^([A-Za-z]+)\s+(?:cantrip|spell)/i);
  return m ? m[1] : "Unknown";
}

merged.sort(
  (a, b) => a.level - b.level || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

const lines = merged.map((spell) => {
  const classes = spell.classes.map((c) => `"${c}"`).join(", ");
  const components = `{
      verbal: ${spell.components.verbal},
      somatic: ${spell.components.somatic},
      material: ${spell.components.material},
      materialDescription: ${spell.components.materialDescription ? JSON.stringify(spell.components.materialDescription) : "null"},
    }`;
  return `  {
    id: ${JSON.stringify(spell.id)},
    key: ${JSON.stringify(spell.key)},
    entityId: ${JSON.stringify(spell.entityId)},
    name: ${JSON.stringify(spell.name)},
    level: ${spell.level},
    school: ${JSON.stringify(spell.school)},
    castingTime: ${JSON.stringify(spell.castingTime)},
    range: ${JSON.stringify(spell.range)},
    components: ${components},
    duration: ${JSON.stringify(spell.duration)},
    classes: [${classes}],
    source: ${JSON.stringify(spell.source)},
    sourcePage: ${spell.sourcePage === null ? "null" : JSON.stringify(spell.sourcePage)},
    description: ${JSON.stringify(spell.description)},
    higherLevel: ${spell.higherLevel ? JSON.stringify(spell.higherLevel) : "null"},
    documentKey: ${JSON.stringify(spell.documentKey)},
    sourceFile: ${JSON.stringify(spell.sourceFile)},
    taxonomyCategory: "spell_index" as const,
    start: ${spell.start ?? "null"},
    end: ${spell.end ?? "null"},
    subtitle: ${spell.subtitle ? JSON.stringify(spell.subtitle) : "null"},
    edition: ${JSON.stringify(spell.edition)},
    dataSource: ${JSON.stringify(spell.dataSource)},
  },`;
});

writeFileSync(
  OUT,
  `/** Auto-generated by scripts/build-srd-spell-index.mjs — do not edit by hand. */
import type { SrdSpellIndexEntry } from "./types";

/** ${merged.length} spells — flat searchable index sorted by level then name. */
export const SRD_SPELL_INDEX: readonly SrdSpellIndexEntry[] = [
${lines.join("\n")}
];
`,
  "utf8",
);

console.log(`Wrote ${merged.length} spell index entries to ${OUT}`);
