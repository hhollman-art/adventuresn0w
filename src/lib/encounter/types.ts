import type { TokenKind } from "@/lib/tabletop/types";

export type EncounterCombatant = {
  label: string;
  kind: TokenKind;
  maxHp?: number;
  size?: number;
  /** Optional pre-set initiative total (defaults to 10 at the table). */
  initiative?: number;
  /** Spawn this many tokens with numbered labels (e.g. Goblin 1, Goblin 2). */
  count?: number;
};

export type EncounterCombatPayload = {
  encounterName: string;
  mapName?: string;
  combatants: EncounterCombatant[];
  openInitiativePanel?: boolean;
};

export type EncounterPrepDraft = {
  id: string;
  name: string;
  mapName: string;
  notes: string;
  combatants: EncounterCombatant[];
  updatedAt: string;
};
