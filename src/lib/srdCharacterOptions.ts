/** @deprecated Import from `@/lib/srd` for new code. */
export {
  SRD_CLASSES,
  SRD_RACES,
  type SrdClass,
  type SrdRace,
} from "@/lib/srd";

import { SRD_CLASSES, SRD_RACES } from "@/lib/srd";

export type CharacterSlotSpec = {
  className: string;
  race: string;
};

export const ANY_CLASS_OR_RACE = "";

export const DEFAULT_PARTY_SIZE = 4;
export const MIN_PARTY_SIZE = 1;
export const MAX_PARTY_SIZE = 8;

export function emptyCharacterSlot(): CharacterSlotSpec {
  return { className: ANY_CLASS_OR_RACE, race: ANY_CLASS_OR_RACE };
}

export function defaultCharacterSlots(count = DEFAULT_PARTY_SIZE): CharacterSlotSpec[] {
  return Array.from({ length: count }, () => emptyCharacterSlot());
}

/** Parse “How many PCs” — blank defaults to DEFAULT_PARTY_SIZE. */
export function parsePartyCount(partySize: string): number {
  const trimmed = partySize.trim();
  if (!trimmed) return DEFAULT_PARTY_SIZE;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return DEFAULT_PARTY_SIZE;
  return Math.min(MAX_PARTY_SIZE, Math.max(MIN_PARTY_SIZE, n));
}

export function resizeCharacterSlots(
  slots: CharacterSlotSpec[],
  count: number,
): CharacterSlotSpec[] {
  const clamped = Math.min(MAX_PARTY_SIZE, Math.max(MIN_PARTY_SIZE, count));
  const next = slots.slice(0, clamped);
  while (next.length < clamped) next.push(emptyCharacterSlot());
  return next;
}

export function addCharacterSlot(slots: CharacterSlotSpec[]): CharacterSlotSpec[] {
  if (slots.length >= MAX_PARTY_SIZE) return slots;
  return [...slots, emptyCharacterSlot()];
}

export function removeCharacterSlot(
  slots: CharacterSlotSpec[],
  index: number,
): CharacterSlotSpec[] {
  if (slots.length <= MIN_PARTY_SIZE || index < 0 || index >= slots.length) return slots;
  return slots.filter((_, i) => i !== index);
}

export function classSelectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: ANY_CLASS_OR_RACE, label: "Any — AI chooses" },
    ...SRD_CLASSES.map((c) => ({ value: c, label: c })),
  ];
}

export function raceSelectOptions(): Array<{ value: string; label: string }> {
  return [
    { value: ANY_CLASS_OR_RACE, label: "Any — AI chooses" },
    ...SRD_RACES.map((r) => ({ value: r, label: r })),
  ];
}
