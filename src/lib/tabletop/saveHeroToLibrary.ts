/**
 * One-click hero CF save pipeline — hydrate sheet → characterLibrary → Vault.
 *
 * Persistence stays in `characterLibrary` (`character.sheet`). The Universal
 * CreationFile card is the view/interchange wrapper for Vault / Campaign DnD.
 */

import {
  mintCharacterCfId,
  saveCharacterToLibrary,
  updateCharacterInLibrary,
  type CharacterSource,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { characterToCreationFile } from "@/lib/creationFile/adapters";
import type { CreationFile } from "@/lib/creationFile/types";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  autoLinkToActiveCampaign,
  getActiveCampaignId,
  getCampaign,
} from "@/lib/campaigns";
import { emitAppToast } from "@/lib/ui/appToast";
import { sendCfToActiveCampaign } from "@/lib/workshop/cfContextActions";
import { CI_CLASS_FOR_CHARACTER } from "@/lib/ciRegistry";

export type SaveHeroInput = {
  player: Omit<PlayerCharacter, "tokenId"> & { tokenId?: string | null };
  /** When set, updates that library row instead of inserting. */
  existingId?: string | null;
  source?: CharacterSource;
  /**
   * When true (default for new heroes), also link to the active campaign if one
   * is open. Updates never auto-link.
   */
  linkActiveCampaign?: boolean;
  /** Suppress success toasts (bulk recruit). */
  quiet?: boolean;
};

export type SaveHeroResult = {
  ok: true;
  character: SavedCharacter;
  /** Universal CF card projection (ciClass remains character.sheet). */
  card: CreationFile;
  characters: SavedCharacter[];
  linkedToCampaign: boolean;
  campaignName: string | null;
};

export { mintCharacterCfId };

/**
 * Instant auto-save: persist the hero to characterLibrary, project a CF card,
 * refresh Vault listeners via CHARACTERS_CHANGED, and optionally link the
 * active campaign.
 */
export async function saveHeroToLibrary(
  input: SaveHeroInput,
): Promise<SaveHeroResult | { ok: false; error: string }> {
  const name = input.player.name?.trim();
  if (!name) {
    return { ok: false, error: "Give this hero a name first." };
  }

  try {
    let characters: SavedCharacter[];
    let character: SavedCharacter | undefined;

    if (input.existingId) {
      characters = await updateCharacterInLibrary(input.existingId, input.player);
      character = characters.find((c) => c.id === input.existingId);
    } else {
      const playerId =
        typeof input.player.id === "string" && input.player.id.startsWith("cf_char_")
          ? input.player.id
          : mintCharacterCfId();
      characters = await saveCharacterToLibrary({
        player: { ...input.player, id: playerId, tokenId: null },
        source: input.source ?? "created",
      });
      character =
        characters.find((c) => c.id === playerId) ??
        characters.find((c) => c.player.name === name) ??
        characters[0];
    }

    if (!character) {
      return { ok: false, error: "Could not save this hero. Please try again." };
    }

    const card = characterToCreationFile(character);
    scheduleLibrarySnapshot();

    const shouldLink =
      input.linkActiveCampaign !== false && !input.existingId && Boolean(getActiveCampaignId());
    let linkedToCampaign = false;
    let campaignName: string | null = null;
    if (shouldLink) {
      await autoLinkToActiveCampaign({ characterId: character.id });
      linkedToCampaign = true;
      const activeId = getActiveCampaignId();
      if (activeId) {
        const campaign = await getCampaign(activeId);
        campaignName = campaign?.name?.trim() || "your campaign";
      }
    }

    if (!input.quiet) {
      const base = input.existingId
        ? `Saved changes to ${card.title}.`
        : `${card.title} saved as a Hero Creation File — now in the Lore Vault.`;
      emitAppToast(
        linkedToCampaign && campaignName
          ? `${base} Also linked to ${campaignName}.`
          : base,
        "success",
      );
    }

    return {
      ok: true,
      character,
      card,
      characters,
      linkedToCampaign,
      campaignName,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save this hero. Please try again.",
    };
  }
}

/** Context-menu helper: add an already-saved hero to the active campaign. */
export async function addSavedHeroToActiveCampaign(character: SavedCharacter): Promise<void> {
  await sendCfToActiveCampaign({
    id: character.id,
    title: character.player.name,
    ciClass: CI_CLASS_FOR_CHARACTER,
    category: "characters",
    provenance: "user",
    detail: characterToCreationFile(character).subtitle,
  });
}
