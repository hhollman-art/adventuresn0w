/** Twelve SRD 5.2.1 player classes — level-3 index anchors. */
export const PLAYER_CLASS_KEYS = [
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
] as const;

export type PlayerClassKey = (typeof PLAYER_CLASS_KEYS)[number];

/** Character-creation chapter rows through trinkets (excludes character-origins backgrounds). */
export const CHARACTER_CREATION_CHAPTER = "character-creation";

/** Glossary combat / turn actions — title ends with [Action]. */
export const COMBAT_ACTION_TITLE_SUFFIX = "[Action]";

/** Playing-the-game byte ranges (mirrors srd-rule-bundle-taxonomy.mjs). */
export const PLAYING_THE_GAME_RANGES = {
  social_interaction: { start: 29346, end: 31828 },
  exploration: { start: 31828, end: 39481 },
  combat: { start: 39481, end: 55431 },
  damage_and_healing: { start: 55431, end: 65274 },
} as const;

/** Map ## chapter title in bundled markdown to logical page prefix. */
export const CHAPTER_PAGE_PREFIX: Record<string, string> = {
  "playing-the-game": "## Playing the Game",
  "character-creation": "## Character Creation",
  "character-origins": "## Character Origins",
  classes: "## Character Classes",
  feats: "## Feats",
  equipment: "## Equipment",
  spells: "## Spells",
  "rules-glossary": "## Rules Glossary",
  "gameplay-toolbox": "## Gameplay Toolbox",
};

export function isCombatActionTitle(title: string): boolean {
  return title.includes(COMBAT_ACTION_TITLE_SUFFIX);
}

export function isSubclassSection(key: string, title: string): boolean {
  return /subclass/i.test(key) || /subclass/i.test(title);
}

export function isMulticlassSection(key: string, title: string): boolean {
  return key.startsWith("becoming-a-") || /multiclass/i.test(key) || /as a multiclass/i.test(title);
}
