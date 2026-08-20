import type { CiClass } from "@/lib/ciRegistry";
import {
  autoLinkToActiveCampaign,
  getActiveCampaignId,
  getCampaign,
} from "@/lib/campaigns";
import { dropIntoVaultParking } from "@/lib/workshop/containerMoveWritePath";
import { emitAppToast } from "@/lib/ui/appToast";
import type { LibraryListEntry, LibraryStorageCategory } from "@/lib/workshop/libraryCatalog";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { attachAdventureToCampaign } from "@/lib/campaignBuilder/attach";
import type { CampaignBuilderCatalog } from "@/lib/campaignBuilder/cascade";
import { loadSavedCharacters } from "@/lib/tabletop/characterLibrary";
import { loadSavedGameItems } from "@/lib/itemLibrary";
import { loadRealmSeeds } from "@/lib/realmSeeds";
import { loadGenerationLibraryItems } from "@/lib/generationLibrary";
import { loadSavedCharacterRosters } from "@/lib/tabletop/characterRoster";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedLocations } from "@/lib/worldAssets/location";

async function loadCatalog(): Promise<CampaignBuilderCatalog> {
  const [characters, items, seeds, results, parties, npcs, locations] = await Promise.all([
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacterRosters(),
    loadSavedNpcs(),
    loadSavedLocations(),
  ]);
  return { characters, items, seeds, results, parties, npcs, locations };
}

export type CfContextTarget = {
  id: string;
  title: string;
  ciClass: CiClass;
  category: LibraryStorageCategory;
  provenance: "srd" | "user";
  detail?: string;
  srdEntityId?: string;
};

export function libraryEntryToContextTarget(entry: LibraryListEntry): CfContextTarget {
  return {
    id: entry.id,
    title: entry.title,
    ciClass: entry.ciClass,
    category: entry.category,
    provenance: entry.provenance,
    detail: entry.detail,
    srdEntityId: entry.srdEntityId,
  };
}

export function campaignLinkForTarget(
  target: CfContextTarget,
): Parameters<typeof autoLinkToActiveCampaign>[0] | null {
  if (target.provenance === "srd") return null;
  if (target.ciClass === "campaign.record" || target.category === "campaigns") return null;
  if (target.ciClass.startsWith("seed.")) return { seedId: target.id };
  if (target.ciClass.startsWith("result.")) return { resultId: target.id };
  if (target.ciClass === "character.sheet") return { characterId: target.id };
  if (target.ciClass === "item.equipment" || target.ciClass === "item.magic") {
    return { itemId: target.id };
  }
  if (target.ciClass === "party.roster") return { partyId: target.id };
  if (target.ciClass === "session.record") return { sessionRecordId: target.id };
  if (target.ciClass === "location.record") return { locationId: target.id };
  if (target.ciClass === "npc.record") return { npcId: target.id };
  switch (target.category) {
    case "seeds":
      return { seedId: target.id };
    case "results":
      return { resultId: target.id };
    case "characters":
      return { characterId: target.id };
    case "items":
      return { itemId: target.id };
    case "parties":
      return { partyId: target.id };
    case "sessions":
      return { sessionRecordId: target.id };
    case "world":
      return { npcId: target.id };
    default:
      return null;
  }
}

export function vaultPayloadForTarget(target: CfContextTarget): VaultDragPayload {
  return {
    vaultKind: "cf",
    id: target.srdEntityId ?? target.id,
    ciClass: target.ciClass,
    title: target.title,
    detail: target.detail ?? "",
  };
}

/** Link a CF to the open chronicle and toast the result. */
export async function sendCfToActiveCampaign(target: CfContextTarget): Promise<void> {
  const activeId = getActiveCampaignId();
  if (!activeId) {
    emitAppToast("Open a chronicle first so this can join the active campaign.", "warn");
    return;
  }

  if (target.ciClass === "seed.adventure" || target.ciClass === "result.adventure") {
    const catalog = await loadCatalog();
    const adventure =
      target.ciClass === "seed.adventure"
        ? catalog.seeds.find((s) => s.id === target.id)
        : catalog.results.find((r) => r.id === target.id);
    if (adventure) {
      const result = await attachAdventureToCampaign({
        campaignId: activeId,
        adventure,
        kind: target.ciClass === "seed.adventure" ? "seed" : "result",
        catalog,
      });
      if (!result.ok) {
        emitAppToast(result.error, "warn");
        return;
      }
      emitAppToast(result.message, "success");
      return;
    }
  }

  const link = campaignLinkForTarget(target);
  if (!link) {
    emitAppToast(
      target.provenance === "srd"
        ? `“${target.title}” is included rules — save a copy to your collection first.`
        : `“${target.title}” cannot join a campaign from here.`,
      "warn",
    );
    return;
  }
  await autoLinkToActiveCampaign(link);
  const campaign = await getCampaign(activeId);
  const name = campaign?.name?.trim() || "your campaign";
  emitAppToast(`${target.title} added to Campaign: ${name}`, "success");
}

/** Park a CF in the Lore Vault and toast. */
export async function parkCfFromContext(target: CfContextTarget): Promise<void> {
  const result = await dropIntoVaultParking(vaultPayloadForTarget(target));
  emitAppToast(result.ok ? result.message : result.error, result.ok ? "success" : "warn");
}
