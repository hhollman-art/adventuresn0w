/**
 * High-level SRD rule bundle taxonomy for consolidation.
 *
 * DMMS ships rules as virtual heading slices in srdDocumentIndex.data.ts (not loose
 * micro-files on disk). This map defines which index keys / chapters roll up into
 * unified bundle outputs such as create_a_character.json.
 */

/** @typedef {"create_a_character" | "combat_rules" | "adventuring_rules" | "unclassified"} SrdRuleBundleId */

/** @type {Record<SrdRuleBundleId, { title: string; outputFile: string; description: string }>} */
export const SRD_RULE_BUNDLE_META = {
  create_a_character: {
    title: "Create a Character",
    outputFile: "create_a_character.json",
    description:
      "Sequential PC creation flow: class, origin, ability scores, alignment, details, advancement, multiclassing.",
  },
  combat_rules: {
    title: "Combat Rules",
    outputFile: "combat_rules.json",
    description:
      "Combat, attacks, movement in combat, damage and healing, conditions, and encounter-building guidance.",
  },
  adventuring_rules: {
    title: "Adventuring Rules",
    outputFile: "adventuring_rules.json",
    description:
      "Social interaction, exploration, travel, environment, traps, and downtime-adjacent play.",
  },
  unclassified: {
    title: "Unclassified Rules Fragments",
    outputFile: "_unclassified_fragments.json",
    description: "Fragments that did not match a bundle — review manually.",
  },
};

/**
 * Section anchors in playing-the-game (byte offsets in SRD_DOCUMENT_BODY).
 * Used when selecting index rows by document range.
 */
export const PLAYING_THE_GAME_RANGES = {
  social_interaction: { start: 29346, end: 31828 },
  exploration: { start: 31828, end: 39481 },
  combat: { start: 39481, end: 55431 },
  damage_and_healing: { start: 55431, end: 65274 },
};

/** Keys explicitly assigned to combat (gameplay-toolbox encounter guidance). */
export const COMBAT_TOOLBOX_KEYS = new Set([
  "combat-encounters",
  "combat-encounter-difficulty",
  "step-1-choose-a-difficulty",
  "step-2-determine-your-xp-budget",
  "step-3-spend-your-budget",
  "cr-0-creatures",
  "many-creatures",
  "powerful-creatures",
  "number-of-stat-blocks",
]);

/** Keys explicitly assigned to adventuring (extended travel / environment). */
export const ADVENTURING_TOOLBOX_KEYS = new Set([
  "extended-travel",
  "slower-travelers",
  "special-movement",
  "vehicles",
  "good-roads",
  "deep-water",
  "frigid-water",
  "extreme-cold",
  "extreme-heat",
  "heavy-precipitation",
  "high-altitude",
  "strong-wind",
  "thin-ice",
  "slippery-ice",
  "traps",
  "example-traps",
  "parts-of-a-trap",
  "environmental-effects",
  "fear-and-mental-stress",
  "fear-effects",
  "mental-stress-effects",
]);

/** Combat conditions — rules-glossary rows folded into combat_rules. */
export const COMBAT_CONDITION_KEYS = new Set([
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

/** Parent section headers — containers, not leaf rule records. */
export const META_SECTION_KEYS = new Set([
  "social-interaction",
  "exploration",
  "combat",
  "damage-and-healing",
  "character-creation",
  "create-your-character",
  "creating-your-character",
  "travel-pace",
  "creating-a-background",
]);

/**
 * Filename / path heuristics for scanning loose JSON or Markdown fragments.
 * Patterns are tested against normalized paths (lowercase, forward slashes).
 */
export const FRAGMENT_PATH_RULES = [
  {
    bundleId: "create_a_character",
    patterns: [
      /character[-_]creation/i,
      /create[-_]a[-_]character/i,
      /step-\d/i,
      /choose[-_]a[-_]class/i,
      /choose[-_]a[-_]species/i,
      /choose[-_]a[-_]background/i,
      /ability[-_]scores/i,
      /multiclassing/i,
      /level[-_]advancement/i,
      /starting[-_]at[-_]higher[-_]levels/i,
      /trinkets/i,
    ],
    excludePatterns: [/creating[-_]a[-_]background\/2[-_]choose[-_]a[-_]feat/i, /gameplay[-_]toolbox.*feat/i],
  },
  {
    bundleId: "combat_rules",
    patterns: [
      /playing[-_]the[-_]game\/combat/i,
      /making[-_]an[-_]attack/i,
      /damage[-_]and[-_]healing/i,
      /order[-_]of[-_]combat/i,
      /death[-_]saving/i,
      /conditions?\//i,
      /combat[-_]encounter/i,
    ],
  },
  {
    bundleId: "adventuring_rules",
    patterns: [
      /social[-_]interaction/i,
      /exploration/i,
      /extended[-_]travel/i,
      /travel[-_]pace/i,
      /environmental[-_]effects/i,
      /traps/i,
      /resting/i,
      /vision[-_]and[-_]light/i,
    ],
    excludePatterns: [/combat/i],
  },
];

/**
 * Resolve bundle id for a bundled index row or entity summary.
 * @param {{ key: string; chapter: string; start: number; title?: string }} row
 * @returns {SrdRuleBundleId | null}
 */
export function resolveBundleForIndexRow(row) {
  const { key, chapter, start } = row;

  if (chapter === "character-creation" && !META_SECTION_KEYS.has(key)) {
    return "create_a_character";
  }

  if (chapter === "playing-the-game") {
    if (start >= PLAYING_THE_GAME_RANGES.combat.start && start < PLAYING_THE_GAME_RANGES.damage_and_healing.end) {
      return "combat_rules";
    }
    if (
      start >= PLAYING_THE_GAME_RANGES.social_interaction.start &&
      start < PLAYING_THE_GAME_RANGES.combat.start
    ) {
      return "adventuring_rules";
    }
  }

  if (chapter === "rules-glossary" && COMBAT_CONDITION_KEYS.has(key)) {
    return "combat_rules";
  }

  if (chapter === "gameplay-toolbox") {
    if (COMBAT_TOOLBOX_KEYS.has(key)) return "combat_rules";
    if (ADVENTURING_TOOLBOX_KEYS.has(key)) return "adventuring_rules";
  }

  return null;
}

/**
 * Resolve bundle id for a loose fragment record or file path.
 * @param {Record<string, unknown>} record
 * @param {string} [filePath]
 * @returns {SrdRuleBundleId | null}
 */
export function resolveBundleForFragment(record, filePath = "") {
  const source =
    String(record._source_file ?? record.sourceFile ?? filePath ?? "").toLowerCase();
  const key = String(record.key ?? record.slug ?? "").toLowerCase();
  const title = String(record.title ?? record.name ?? record.header ?? "").toLowerCase();
  const category = String(record._category ?? record.taxonomyCategory ?? "").toLowerCase();

  if (source.includes("character-creation/") || chapterFromSource(source) === "character-creation") {
    if (key === "2-choose-a-feat" && source.includes("gameplay-toolbox")) return null;
    return "create_a_character";
  }

  if (key && resolveBundleForIndexRow({ key, chapter: chapterFromSource(source), start: 0 })) {
    return resolveBundleForIndexRow({ key, chapter: chapterFromSource(source), start: 0 });
  }

  const haystack = `${source} ${key} ${title} ${filePath}`.toLowerCase();

  for (const rule of FRAGMENT_PATH_RULES) {
    if (rule.excludePatterns?.some((p) => p.test(haystack))) continue;
    if (rule.patterns.some((p) => p.test(haystack))) return rule.bundleId;
  }

  if (category === "conditions") return "combat_rules";

  return null;
}

function chapterFromSource(source) {
  const match = source.match(/srddocumentindex:([^/]+)/i);
  return match?.[1] ?? "";
}
