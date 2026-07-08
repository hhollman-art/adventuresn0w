import { newId, sortInitiative } from "@/lib/tabletop/session";
import { TOKEN_KIND_DEFAULT_COLOR, type TabletopSession } from "@/lib/tabletop/types";
import { tokenCellFootprint } from "@/lib/tabletop/gridScale";
import type { EncounterCombatPayload } from "@/lib/encounter/types";

/** Port encounter prep combatants onto the live VTT session and seed initiative. */
export function applyEncounterCombatImport(
  session: TabletopSession,
  payload: EncounterCombatPayload,
): TabletopSession {
  let tokens = [...session.tokens];
  const addedInitiative: Array<{
    id: string;
    name: string;
    roll: number;
    tokenId: string;
  }> = [];

  const centerX = Math.max(0, Math.floor(session.grid.cols / 2) - 1);
  const centerY = Math.max(0, Math.floor(session.grid.rows / 2) - 1);
  let slot = tokens.length;

  for (const row of payload.combatants) {
    const count = Math.max(1, Math.min(24, row.count ?? 1));
    for (let i = 0; i < count; i += 1) {
      const suffix = count > 1 ? ` ${i + 1}` : "";
      const label = `${row.label.trim()}${suffix}`;
      const size = row.size ?? 1;
      const footprint = tokenCellFootprint(size, session.grid.feetPerCell);
      const tokenId = newId();
      const hpMax = row.maxHp;
      tokens = [
        ...tokens,
        {
          id: tokenId,
          label,
          color: TOKEN_KIND_DEFAULT_COLOR[row.kind],
          kind: row.kind,
          x: Math.min(centerX + (slot % 5), session.grid.cols - footprint),
          y: Math.min(centerY + Math.floor(slot / 5), session.grid.rows - footprint),
          size,
          hp:
            hpMax != null && Number.isFinite(hpMax) && hpMax > 0
              ? { current: hpMax, max: hpMax }
              : null,
          hidden: false,
          imageDataUrl: null,
        },
      ];
      addedInitiative.push({
        id: newId(),
        name: label,
        roll: row.initiative ?? 10,
        tokenId,
      });
      slot += 1;
    }
  }

  const entries = sortInitiative([...session.initiative.entries, ...addedInitiative]);

  return {
    ...session,
    mapName: payload.mapName?.trim() || payload.encounterName.trim() || session.mapName,
    tokens,
    initiative: {
      ...session.initiative,
      entries,
      activeIndex: 0,
      round: session.initiative.round || 1,
    },
  };
}
