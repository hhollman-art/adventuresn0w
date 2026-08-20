import {
  getCampaign,
  linkToCampaign,
  unlinkFromCampaign,
  updateCampaign,
  type SavedCampaign,
} from "@/lib/campaigns";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  mergeCampaignLinks,
  readAdventureChildIds,
  resolveAdventureChildren,
  detachLinkForCi,
  type CampaignBuilderCatalog,
  type CampaignLinkPatch,
} from "@/lib/campaignBuilder/cascade";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { CiClass } from "@/lib/ciRegistry";

export type AttachAdventureResult = {
  ok: true;
  message: string;
  cascadedCount: number;
  campaign: SavedCampaign;
};

/**
 * Link an adventure seed/result to a campaign and cascade its `childIds` into
 * Tier-1 campaign membership lists (never copies Library rows).
 */
export async function attachAdventureToCampaign(options: {
  campaignId: string;
  adventure: SavedRealmSeed | LibraryItem;
  kind: "seed" | "result";
  catalog: CampaignBuilderCatalog;
}): Promise<AttachAdventureResult | { ok: false; error: string }> {
  const { campaignId, adventure, kind, catalog } = options;
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const rootLink: CampaignLinkPatch =
    kind === "seed" ? { seedId: adventure.id } : { resultId: adventure.id };
  const children = resolveAdventureChildren(readAdventureChildIds(adventure), catalog);
  const childLinks = children.map((c) => c.link);
  const patch = mergeCampaignLinks(campaign, [rootLink, ...childLinks]);
  const list = await updateCampaign(campaignId, patch);
  const next = list.find((c) => c.id === campaignId) ?? campaign;
  scheduleLibrarySnapshot();

  const title =
    "title" in adventure && typeof adventure.title === "string"
      ? adventure.title
      : "seedName" in adventure
        ? adventure.seedName || adventure.titleHint || "Adventure"
        : "Adventure";

  return {
    ok: true,
    cascadedCount: children.length,
    campaign: next,
    message:
      children.length > 0
        ? `${title} linked — cascaded ${children.length} nested CF card${children.length === 1 ? "" : "s"}.`
        : `${title} linked to the campaign.`,
  };
}

/** Detach one CF from a campaign without deleting the Library original. */
export async function detachCfFromCampaign(options: {
  campaignId: string;
  ciClass: CiClass | string;
  id: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const campaign = await getCampaign(options.campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };
  await unlinkFromCampaign(options.campaignId, detachLinkForCi(options.ciClass, options.id));
  scheduleLibrarySnapshot();
  return { ok: true, message: "Detached from campaign — Library original kept." };
}

/** Apply a single classified link (used by zone drops and “Add to Campaign”). */
export async function attachLinkToCampaign(
  campaignId: string,
  link: CampaignLinkPatch,
): Promise<void> {
  await linkToCampaign(campaignId, link);
  scheduleLibrarySnapshot();
}
