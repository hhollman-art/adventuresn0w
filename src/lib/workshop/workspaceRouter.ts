import type { SrdEntityId } from "@/lib/srd/types";
import type { EncounterCombatPayload } from "@/lib/encounter/types";

export const PENDING_ENCOUNTER_COMBAT_KEY = "ddeasy-pending-encounter-combat";

/** Cross-workspace intents nested components can dispatch through the context router. */
export type WorkspaceRouterAction =
  | { type: "open-scrying-spell"; spellId: string; name: string }
  | { type: "open-scrying-entity"; entityId: SrdEntityId }
  | { type: "navigate"; href: string; replace?: boolean }
  | { type: "send-encounter-to-combat"; payload: EncounterCombatPayload };

export function queueEncounterCombatImport(payload: EncounterCombatPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_ENCOUNTER_COMBAT_KEY, JSON.stringify(payload));
}

export function consumePendingEncounterCombatImport(): EncounterCombatPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_ENCOUNTER_COMBAT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_ENCOUNTER_COMBAT_KEY);
  try {
    const parsed = JSON.parse(raw) as EncounterCombatPayload;
    if (typeof parsed.encounterName !== "string" || !Array.isArray(parsed.combatants)) {
      return null;
    }
    return {
      encounterName: parsed.encounterName,
      mapName: typeof parsed.mapName === "string" ? parsed.mapName : undefined,
      combatants: parsed.combatants.filter(
        (row) => typeof row?.label === "string" && row.label.trim().length > 0,
      ),
      openInitiativePanel: parsed.openInitiativePanel !== false,
    };
  } catch {
    return null;
  }
}
