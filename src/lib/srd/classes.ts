import type { SrdClassEntry } from "./types";

function classId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** SRD-open class names (CC / 5.2 lineage). */
export const SRD_CLASS_NAMES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;

export type SrdClassName = (typeof SRD_CLASS_NAMES)[number];

/** @deprecated Prefer `SRD_CLASS_NAMES` — kept for existing imports. */
export const SRD_CLASSES = SRD_CLASS_NAMES;

export type SrdClass = SrdClassName;

export function findSrdClass(name: string): SrdClassEntry | undefined {
  const trimmed = name.trim();
  return SRD_CLASS_ENTRIES.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
}

export function srdSubclassForClass(className: string): string | null {
  const match = findSrdClass(className);
  return match?.srdSubclass ?? null;
}

/** The one SRD subclass bundled per class (SRD 5.x). */
export const SRD_SUBCLASS_BY_CLASS: Record<SrdClassName, string> = {
  Barbarian: "Path of the Berserker",
  Bard: "College of Lore",
  Cleric: "Life Domain",
  Druid: "Circle of the Land",
  Fighter: "Champion",
  Monk: "Way of the Open Hand",
  Paladin: "Oath of Devotion",
  Ranger: "Hunter",
  Rogue: "Thief",
  Sorcerer: "Draconic Bloodline",
  Warlock: "The Fiend",
  Wizard: "School of Evocation",
};

/** Structured class catalogue with bundled SRD subclasses. */
export const SRD_CLASS_ENTRIES: readonly SrdClassEntry[] = SRD_CLASS_NAMES.map((name) => ({
  id: classId(name),
  name,
  source: "srd" as const,
  srdSubclass: SRD_SUBCLASS_BY_CLASS[name],
}));
