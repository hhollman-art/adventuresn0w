import type { SrdSpellEntry } from "./types";
import { SRD_SPELLS_DATA } from "./spells.data";

export { SRD_SPELLS_DATA };

/** SRD-open spell catalogue (CC BY 4.0 via Open5e wotc-srd document). */
export const SRD_SPELLS: readonly SrdSpellEntry[] = SRD_SPELLS_DATA;

const spellById = new Map(SRD_SPELLS.map((s) => [s.id, s]));

export function findSrdSpell(id: string): SrdSpellEntry | undefined {
  return spellById.get(id);
}

/** Map display class name to Open5e spell list key. */
export function srdClassSpellListKey(className: string): string | null {
  const normalized = className.trim().toLowerCase();
  const map: Record<string, string> = {
    bard: "bard",
    cleric: "cleric",
    druid: "druid",
    paladin: "paladin",
    ranger: "ranger",
    sorcerer: "sorcerer",
    warlock: "warlock",
    wizard: "wizard",
  };
  return map[normalized] ?? null;
}

export function srdSpellsForClass(className: string): readonly SrdSpellEntry[] {
  const key = srdClassSpellListKey(className);
  if (!key) return [];
  return SRD_SPELLS.filter((s) => s.classes.includes(key));
}

export function formatSpellLevel(level: number): string {
  if (level <= 0) return "Cantrip";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}

export function formatSpellOption(spell: SrdSpellEntry): string {
  return `${formatSpellLevel(spell.level)}, ${spell.school}`;
}
