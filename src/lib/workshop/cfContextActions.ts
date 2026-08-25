import type { CiClass } from "@/lib/ciRegistry";
import { getActiveCampaignId } from "@/lib/campaigns";
import {
  dropIntoVaultParking,
  linkVaultPayloadToCampaign,
} from "@/lib/workshop/containerMoveWritePath";
import { emitAppToast } from "@/lib/ui/appToast";
import type { LibraryListEntry, LibraryStorageCategory } from "@/lib/workshop/libraryCatalog";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";

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

/** Link a CF to the open chronicle (same write path as Campaign drop zones). */
export async function sendCfToActiveCampaign(target: CfContextTarget): Promise<void> {
  const activeId = getActiveCampaignId();
  if (!activeId) {
    emitAppToast("Open a chronicle first so this can join the active campaign.", "warn");
    return;
  }

  const result = await linkVaultPayloadToCampaign({
    campaignId: activeId,
    payload: vaultPayloadForTarget(target),
  });
  if (!result.ok) {
    emitAppToast(result.error, "warn");
    return;
  }
  emitAppToast(result.message, "success");
}

/** Park a CF in the Lore Vault and toast. */
export async function parkCfFromContext(target: CfContextTarget): Promise<void> {
  const result = await dropIntoVaultParking(vaultPayloadForTarget(target));
  emitAppToast(result.ok ? result.message : result.error, result.ok ? "success" : "warn");
}
