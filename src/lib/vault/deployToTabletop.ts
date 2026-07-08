import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { getSavedCharacter } from "@/lib/tabletop/characterLibrary";
import { getSavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import { applyPartyImport } from "@/lib/tabletop/partyCampaign";
import { newId } from "@/lib/tabletop/session";
import {
  TOKEN_KIND_DEFAULT_COLOR,
  type PlayerCharacter,
  type TabletopSession,
  type TabletopToken,
  type TokenKind,
} from "@/lib/tabletop/types";
import { tokenCellFootprint } from "@/lib/tabletop/gridScale";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedCustomSrdEntries } from "@/lib/srd/srdCustomLibrary";

export type TabletopDeployContext = {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
  onSelectToken: (id: string | null) => void;
  newPlayerToken: (
    session: TabletopSession,
    player: PlayerCharacter,
    tokenId: string,
  ) => TabletopToken;
};

function placeGenericToken(
  session: TabletopSession,
  label: string,
  kind: TokenKind,
  size = 1,
): TabletopToken {
  const centerX = Math.max(0, Math.floor(session.grid.cols / 2) - 1);
  const centerY = Math.max(0, Math.floor(session.grid.rows / 2) - 1);
  const footprint = tokenCellFootprint(size, session.grid.feetPerCell);
  const id = newId();
  return {
    id,
    label,
    color: TOKEN_KIND_DEFAULT_COLOR[kind],
    kind,
    x: Math.min(centerX + (session.tokens.length % 5), session.grid.cols - footprint),
    y: Math.min(centerY + Math.floor(session.tokens.length / 5), session.grid.rows - footprint),
    size,
    hp: null,
    hidden: false,
    imageDataUrl: null,
  };
}

/** Instantiate a vault card on the live Virtual Table session. */
export async function deployVaultToTabletop(
  payload: VaultDragPayload,
  ctx: TabletopDeployContext,
): Promise<{ ok: true } | { ok: false; message: string }> {
  switch (payload.ciClass) {
    case "character.sheet": {
      const saved = await getSavedCharacter(payload.id);
      if (!saved) return { ok: false, message: "That hero sheet was not found on this device." };
      const playerId = saved.player.id || newId();
      const tokenId = newId();
      const player: PlayerCharacter = { ...saved.player, id: playerId, tokenId };
      ctx.update((s) => ({
        ...s,
        tokens: [...s.tokens, ctx.newPlayerToken(s, player, tokenId)],
        players: s.players.some((p) => p.id === playerId)
          ? s.players.map((p) => (p.id === playerId ? player : p))
          : [...s.players, player],
      }));
      ctx.onSelectToken(tokenId);
      return { ok: true };
    }
    case "party.roster": {
      const roster = await getSavedCharacterRoster(payload.id);
      if (!roster) return { ok: false, message: "That fellowship was not found on this device." };
      ctx.update((s) =>
        applyPartyImport(
          s,
          roster,
          { placeTokens: true, linkCampaign: false, replaceExisting: false },
          ctx.newPlayerToken,
        ),
      );
      return { ok: true };
    }
    case "npc.record": {
      const npcs = await loadSavedNpcs();
      const npc = npcs.find((row) => row.id === payload.id);
      if (!npc) return { ok: false, message: "That NPC was not found on this device." };
      let placedId = "";
      ctx.update((s) => {
        const token = placeGenericToken(s, npc.name, "monster");
        placedId = token.id;
        return { ...s, tokens: [...s.tokens, token] };
      });
      ctx.onSelectToken(placedId);
      return { ok: true };
    }
    case "rules.custom-entry":
    case "monster.srd-entry":
    case "rules.srd-entry": {
      if (
        payload.ciClass === "rules.srd-entry" &&
        !payload.id.startsWith("monster:")
      ) {
        return {
          ok: false,
          message: "Bundled rule cards open in the Library — drop monsters onto the map.",
        };
      }
      const customRows = await loadSavedCustomSrdEntries();
      const custom = customRows.find((row) => row.id === payload.id);
      const isMonster =
        payload.id.startsWith("monster:") ||
        payload.ciClass === "monster.srd-entry" ||
        custom?.kind === "monster";
      if (payload.ciClass === "rules.custom-entry" && custom && custom.kind !== "monster") {
        return {
          ok: false,
          message: "Only custom monsters can be placed on the map — open spells in the Library.",
        };
      }
      let placedId = "";
      ctx.update((s) => {
        const token = placeGenericToken(
          s,
          payload.title,
          isMonster ? "monster" : "object",
        );
        placedId = token.id;
        return { ...s, tokens: [...s.tokens, token] };
      });
      ctx.onSelectToken(placedId);
      return { ok: true };
    }
    case "item.equipment":
    case "item.magic": {
      let placedId = "";
      ctx.update((s) => {
        const token = placeGenericToken(s, payload.title, "object");
        placedId = token.id;
        return { ...s, tokens: [...s.tokens, token] };
      });
      ctx.onSelectToken(placedId);
      return { ok: true };
    }
    default:
      return {
        ok: false,
        message: "This card type cannot be placed on the Virtual Table yet.",
      };
  }
}

/** Human-readable deploy hint for hero sheets placed via party panel. */
export function vaultDeploySummary(payload: VaultDragPayload): string {
  switch (payload.ciClass) {
    case "character.sheet":
      return `Placed ${payload.title} on the map with hero stats.`;
    case "party.roster":
      return `Loaded fellowship “${payload.title}” onto the table.`;
    case "npc.record":
      return `Spawned NPC token for ${payload.title}.`;
    default:
      return `Placed ${payload.title} on the map.`;
  }
}
