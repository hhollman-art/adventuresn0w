import {
  loadGenerationLibraryImages,
  loadGenerationLibraryItems,
  type LibraryImageThumb,
  type LibraryItem,
} from "@/lib/generationLibrary";
import {
  getSavedCharacterRoster,
  loadSavedCharacterRosters,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  loadSavedCharacters,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";

/**
 * VTT ↔ Library (CMDB) bridge.
 * The Virtual Table never owns prep data — it reads party.roster, character.sheet,
 * and result.maps (etc.) through this module.
 */

export async function loadMapImagesFromLibrary(): Promise<LibraryImageThumb[]> {
  return loadGenerationLibraryImages();
}

export async function loadPartiesFromLibrary(): Promise<SavedCharacterRoster[]> {
  return loadSavedCharacterRosters();
}

export async function loadPartyFromLibrary(
  rosterId: string,
): Promise<SavedCharacterRoster | null> {
  return getSavedCharacterRoster(rosterId);
}

export async function loadHeroesFromLibrary(): Promise<SavedCharacter[]> {
  return loadSavedCharacters();
}

export async function loadResultScrollsFromLibrary(): Promise<LibraryItem[]> {
  return loadGenerationLibraryItems();
}

export {
  queuePartyImport,
  consumePendingPartyImport,
  savePartyFromSession,
  applyPartyImport,
  type PartyImportRequest,
} from "@/lib/tabletop/partyCampaign";

export { loadTabletopSession, saveTabletopSession, switchCampaignTable } from "@/lib/tabletop/store";
