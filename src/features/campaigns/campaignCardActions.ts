import type { CiClass } from "@/lib/ciRegistry";
import type { SrdEntityId } from "@/lib/srd/types";
import { parseSrdEntityId } from "@/lib/srd/corpus";
import type { CampaignZoneCard } from "@/lib/campaignBuilder/zoneCards";
import { detachCfFromCampaign } from "@/lib/campaignBuilder/attach";
import { unlinkSrdInstanceFromCampaign } from "@/lib/workshop/containerMoveWritePath";
import { inspectEntity } from "@/lib/workshop/inspectedEntity";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { LibraryStorageCategory } from "@/lib/workshop/libraryCatalog";

export function categoryForCiClass(ciClass: string): LibraryStorageCategory {
  if (ciClass.startsWith("seed.")) return "seeds";
  if (ciClass.startsWith("result.")) return "results";
  if (ciClass === "character.sheet") return "characters";
  if (ciClass.startsWith("item.")) return "items";
  if (ciClass === "party.roster") return "parties";
  if (ciClass === "npc.record" || ciClass === "location.record") return "world";
  if (ciClass === "monster.srd-entry") return "monsters";
  return "campaigns";
}

function srdEntityIdForCard(card: CampaignZoneCard): SrdEntityId | null {
  const source = card.relationship?.sourceSrdEntityId ?? card.id;
  return parseSrdEntityId(source);
}

export function selectionForCard(card: CampaignZoneCard): LibraryViewSelection {
  const srdEntityId = card.relationship || card.id.startsWith("monster:") ? srdEntityIdForCard(card) : null;
  if (srdEntityId) return { kind: "srd-entity", entityId: srdEntityId, name: card.title };
  if (card.ciClass.startsWith("seed.")) return { kind: "seed", id: card.id };
  if (card.ciClass.startsWith("result.")) return { kind: "result", id: card.id };
  if (card.ciClass === "character.sheet") return { kind: "character", id: card.id };
  if (card.ciClass === "party.roster") return { kind: "party", id: card.id };
  if (card.ciClass === "item.equipment" || card.ciClass === "item.magic") {
    return { kind: "item", id: card.id };
  }
  if (card.ciClass === "npc.record") return { kind: "npc", id: card.id };
  if (card.ciClass === "location.record") return { kind: "location", id: card.id };
  return { kind: "campaign", id: card.id };
}

/** Open a container card in the Scrying Glass. */
export function inspectCampaignCard(campaignId: string, card: CampaignZoneCard): void {
  const isSrd = Boolean(card.relationship) || card.id.startsWith("monster:");
  inspectEntity({
    key: `campaign:${campaignId}:${card.id}`,
    label: card.title,
    ciClass: card.ciClass as CiClass,
    cfId: isSrd ? null : card.id,
    selection: selectionForCard(card),
  });
}

/** Take a card out of the campaign — never deletes the Library original. */
export async function removeCampaignCard(
  campaignId: string,
  card: CampaignZoneCard,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (card.relationship) {
    const result = await unlinkSrdInstanceFromCampaign(campaignId, card.relationship);
    return result.ok ? { ok: true, message: result.message } : result;
  }
  return detachCfFromCampaign({ campaignId, ciClass: card.ciClass, id: card.id });
}
