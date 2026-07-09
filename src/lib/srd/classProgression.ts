/**
 * Character level progression rules derived from SRD 5.2 / macro class tables
 * (fighter.json features table, full/half/third caster spell-slot progressions).
 *
 * Used reactively whenever a PC's level or class changes — spell pickers,
 * prepared lists, and save validation all consult this module.
 */

export type CasterKind = "none" | "full" | "half" | "third" | "warlock";

/** Spell slots available at each spell level (1–9). Index 0 unused. */
export type SpellSlotRow = readonly number[];

const EMPTY_SLOTS: SpellSlotRow = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** Full casters (Bard, Cleric, Druid, Sorcerer, Wizard) — PHB / SRD table. */
const FULL_CASTER_SLOTS: readonly SpellSlotRow[] = [
  /* 0 */ EMPTY_SLOTS,
  /* 1 */ [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 2 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 3 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 4 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* 5 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /* 6 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /* 7 */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  /* 8 */ [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  /* 9 */ [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  /*10 */ [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  /*11 */ [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  /*12 */ [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  /*13 */ [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  /*14 */ [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  /*15 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  /*16 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  /*17 */ [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  /*18 */ [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  /*19 */ [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  /*20 */ [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Half casters (Paladin, Ranger) — slots begin at character level 2. */
const HALF_CASTER_SLOTS: readonly SpellSlotRow[] = [
  EMPTY_SLOTS,
  EMPTY_SLOTS,
  /* 2 */ [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 3 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 4 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 5 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 6 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 7 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* 8 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /* 9 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /*10 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /*11 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /*12 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /*13 */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  /*14 */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  /*15 */ [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  /*16 */ [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  /*17 */ [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  /*18 */ [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  /*19 */ [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  /*20 */ [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
];

/**
 * Third casters (Eldritch Knight, Arcane Trickster) — slots begin at level 3.
 * Mapped from fighter.json / rogue subclass progression.
 */
const THIRD_CASTER_SLOTS: readonly SpellSlotRow[] = [
  EMPTY_SLOTS,
  EMPTY_SLOTS,
  EMPTY_SLOTS,
  /* 3 */ [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 4 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 5 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 6 */ [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  /* 7 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 8 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /* 9 */ [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  /*10 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /*11 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /*12 */ [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  /*13 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /*14 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /*15 */ [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  /*16 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /*17 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /*18 */ [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  /*19 */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  /*20 */ [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
];

/** Warlock pact slots — count + slot level by character level. */
const WARLOCK_PACT: readonly { slots: number; slotLevel: number }[] = [
  { slots: 0, slotLevel: 0 },
  { slots: 1, slotLevel: 1 },
  { slots: 2, slotLevel: 1 },
  { slots: 2, slotLevel: 2 },
  { slots: 2, slotLevel: 2 },
  { slots: 2, slotLevel: 3 },
  { slots: 2, slotLevel: 3 },
  { slots: 2, slotLevel: 4 },
  { slots: 2, slotLevel: 4 },
  { slots: 2, slotLevel: 5 },
  { slots: 2, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 3, slotLevel: 5 },
  { slots: 4, slotLevel: 5 },
  { slots: 4, slotLevel: 5 },
  { slots: 4, slotLevel: 5 },
  { slots: 4, slotLevel: 5 },
];

const FULL_CASTERS = new Set([
  "bard",
  "cleric",
  "druid",
  "sorcerer",
  "wizard",
]);
const HALF_CASTERS = new Set(["paladin", "ranger"]);
const THIRD_CASTER_SUBCLASSES = new Set([
  "eldritch knight",
  "arcane trickster",
]);

export function clampCharacterLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(20, Math.max(1, Math.round(level)));
}

/** 5.2 proficiency bonus — matches fighter.json Proficiency Bonus column. */
export function proficiencyBonusForLevel(level: number): number {
  return 2 + Math.floor((clampCharacterLevel(level) - 1) / 4);
}

export function casterKindForClass(
  className: string,
  subclass = "",
): CasterKind {
  const cls = className.trim().toLowerCase();
  const sub = subclass.trim().toLowerCase();
  if (cls === "warlock") return "warlock";
  if (FULL_CASTERS.has(cls)) return "full";
  if (HALF_CASTERS.has(cls)) return "half";
  if (THIRD_CASTER_SUBCLASSES.has(sub)) return "third";
  // Fighter / Rogue without caster subclass — no slots.
  return "none";
}

export function spellSlotsForCharacter(
  level: number,
  className: string,
  subclass = "",
): SpellSlotRow {
  const lv = clampCharacterLevel(level);
  const kind = casterKindForClass(className, subclass);
  if (kind === "none") return EMPTY_SLOTS;
  if (kind === "full") return FULL_CASTER_SLOTS[lv] ?? EMPTY_SLOTS;
  if (kind === "half") return HALF_CASTER_SLOTS[lv] ?? EMPTY_SLOTS;
  if (kind === "third") return THIRD_CASTER_SLOTS[lv] ?? EMPTY_SLOTS;

  // Warlock — all pact slots at one slot level.
  const pact = WARLOCK_PACT[lv] ?? { slots: 0, slotLevel: 0 };
  const row: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (pact.slotLevel >= 1 && pact.slotLevel <= 9) {
    row[pact.slotLevel] = pact.slots;
  }
  return row;
}

/** Highest spell level (1–9) this character can cast; 0 = cantrips only / none. */
export function maxSpellLevelForCharacter(
  level: number,
  className: string,
  subclass = "",
): number {
  const slots = spellSlotsForCharacter(level, className, subclass);
  for (let spellLevel = 9; spellLevel >= 1; spellLevel -= 1) {
    if (slots[spellLevel]! > 0) return spellLevel;
  }
  // Full casters still get cantrips at level 1 even when checking known spells.
  const kind = casterKindForClass(className, subclass);
  if (kind === "full" || kind === "warlock") return 0;
  if (kind === "half" && clampCharacterLevel(level) >= 2) return 0;
  if (kind === "third" && clampCharacterLevel(level) >= 3) return 0;
  return -1; // no spellcasting
}

/** True when a spell of `spellLevel` (0 = cantrip) may be known/prepared. */
export function canKnowSpellAtLevel(
  characterLevel: number,
  className: string,
  subclass: string,
  spellLevel: number,
): boolean {
  const max = maxSpellLevelForCharacter(characterLevel, className, subclass);
  if (spellLevel === 0) {
    // Cantrips require any spellcasting progression.
    return max >= 0;
  }
  return spellLevel >= 1 && spellLevel <= max;
}

/**
 * Minimum character level at which a class feature named like
 * "Level N: …" becomes available (from fighter.json feature keys).
 */
export function featureUnlockLevelFromLabel(label: string): number | null {
  const m = /(?:^|\b)level\s*(\d{1,2})\b/i.exec(label.trim());
  if (!m) return null;
  return clampCharacterLevel(Number(m[1]));
}

export function isFeatureAvailableAtLevel(
  characterLevel: number,
  featureLabel: string,
): boolean {
  const unlock = featureUnlockLevelFromLabel(featureLabel);
  if (unlock === null) return true;
  return clampCharacterLevel(characterLevel) >= unlock;
}

/** Skill proficiency count guidance (SRD class traits — choose N skills). */
export function skillProficiencyCountForClass(className: string): number {
  const cls = className.trim().toLowerCase();
  if (cls === "rogue") return 4;
  if (cls === "bard" || cls === "ranger") return 3;
  return 2;
}

export type LevelProgressionSummary = {
  level: number;
  proficiencyBonus: number;
  casterKind: CasterKind;
  maxSpellLevel: number;
  spellSlots: SpellSlotRow;
  skillProficiencyCount: number;
};

export function summarizeLevelProgression(
  level: number,
  className: string,
  subclass = "",
): LevelProgressionSummary {
  const lv = clampCharacterLevel(level);
  return {
    level: lv,
    proficiencyBonus: proficiencyBonusForLevel(lv),
    casterKind: casterKindForClass(className, subclass),
    maxSpellLevel: maxSpellLevelForCharacter(lv, className, subclass),
    spellSlots: spellSlotsForCharacter(lv, className, subclass),
    skillProficiencyCount: skillProficiencyCountForClass(className),
  };
}
