import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { SavedCampaign } from "@/lib/campaigns";
import {
  CI_CLASS_FOR_CAMPAIGN,
  CI_CLASS_FOR_LOCATION,
  CI_CLASS_FOR_NPC,
  CI_CLASS_FOR_PARTY,
  CI_CLASS_FOR_SESSION_RECORD,
  ciClassForGameItem,
  ciClassForResult,
  ciClassForSeed,
  type CiClass,
} from "@/lib/ciRegistry";
import type { LibraryItem, LibraryKind } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed, SeedKind } from "@/lib/realmSeeds";
import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import { ciClassForSrdEntity, getSrdEntity } from "@/lib/srd/corpus";
import type { SrdEntityId } from "@/lib/srd/types";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";

export function ciClassForSrdResource(resource: SrdApiResource): CiClass {
  if (resource === "spells") return "spell.srd-entry";
  if (resource === "magic-items") return "item.srd-magic";
  if (resource === "equipment") return "item.srd-equipment";
  if (resource === "monsters") return "monster.srd-entry";
  return "rules.srd-entry";
}

export type ResolvePreviewCiClassParams = {
  selection?: LibraryViewSelection | null;
  viewingSeed?: SavedRealmSeed;
  viewingResult?: LibraryItem;
  viewingCharacter?: SavedCharacter;
  viewingItem?: SavedGameItem;
  viewingCampaign?: SavedCampaign;
  viewingNpc?: SavedNpc;
  viewingLocation?: SavedLocation;
  viewingSession?: SavedSessionRecord;
  viewingParty?: SavedCharacterRoster;
  outputLayoutKind?: string;
  editKind?: "none" | "result" | "seed" | "library-result";
  isSrdPreview?: boolean;
  srdResource?: SrdApiResource;
  srdEntityId?: SrdEntityId;
};

/** Resolve the CMDB Creation File class shown in the Scrying Glass chrome. */
export function resolvePreviewCiClass(params: ResolvePreviewCiClassParams): CiClass | null {
  if (params.viewingSeed) return ciClassForSeed(params.viewingSeed.kind);
  if (params.viewingResult) return ciClassForResult(params.viewingResult.kind);
  if (params.viewingCharacter) return "character.sheet";
  if (params.viewingItem) return ciClassForGameItem(params.viewingItem.kind);
  if (params.viewingCampaign) return CI_CLASS_FOR_CAMPAIGN;
  if (params.viewingNpc) return CI_CLASS_FOR_NPC;
  if (params.viewingLocation) return CI_CLASS_FOR_LOCATION;
  if (params.viewingSession) return CI_CLASS_FOR_SESSION_RECORD;
  if (params.viewingParty) return CI_CLASS_FOR_PARTY;

  if (params.selection?.kind === "srd-entity") {
    const entity = getSrdEntity(params.selection.entityId);
    return entity ? ciClassForSrdEntity(entity.kind) : "rules.srd-entry";
  }
  if (params.selection?.kind === "srd") {
    return ciClassForSrdResource(params.selection.resource);
  }
  if (params.srdEntityId) {
    const entity = getSrdEntity(params.srdEntityId);
    if (entity) return ciClassForSrdEntity(entity.kind);
  }
  if (params.srdResource) return ciClassForSrdResource(params.srdResource);
  if (params.isSrdPreview) return "rules.srd-entry";

  if (params.editKind === "seed" && isSeedKind(params.outputLayoutKind)) {
    return ciClassForSeed(params.outputLayoutKind);
  }
  if (
    (params.editKind === "result" || params.editKind === "library-result") &&
    isLibraryKind(params.outputLayoutKind)
  ) {
    return ciClassForResult(params.outputLayoutKind);
  }
  if (isLibraryKind(params.outputLayoutKind)) {
    return ciClassForResult(params.outputLayoutKind);
  }

  return null;
}

function isLibraryKind(value: string | undefined): value is LibraryKind {
  return (
    value === "realm" ||
    value === "adventure" ||
    value === "characters" ||
    value === "maps" ||
    value === "props"
  );
}

function isSeedKind(value: string | undefined): value is SeedKind {
  return isLibraryKind(value);
}
