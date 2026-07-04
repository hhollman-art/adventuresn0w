import type { SrdAncestryEntry } from "./types";

function ancestryId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** SRD-open ancestry / species names (CC / 5.2 lineage). */
export const SRD_ANCESTRY_NAMES = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-Elf",
  "Halfling",
  "Half-Orc",
  "Human",
  "Tiefling",
] as const;

export type SrdAncestryName = (typeof SRD_ANCESTRY_NAMES)[number];

/** @deprecated Prefer `SRD_ANCESTRY_NAMES` — kept for existing imports. */
export const SRD_RACES = SRD_ANCESTRY_NAMES;

export type SrdRace = SrdAncestryName;

export const SRD_ANCESTRY_ENTRIES: readonly SrdAncestryEntry[] = SRD_ANCESTRY_NAMES.map(
  (name) => ({
    id: ancestryId(name),
    name,
    source: "srd" as const,
  }),
);
