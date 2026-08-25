/**
 * Homebrew Campaign Builder — zone model, adventure cascade, attach/detach.
 */

export {
  CAMPAIGN_BUILDER_ZONES,
  CAMPAIGN_BUILDER_ZONE_ICON,
  campaignBuilderZone,
  resolveCampaignBuilderZoneForCiClass,
  type CampaignBuilderZone,
  type CampaignBuilderZoneId,
} from "@/lib/campaignBuilder/zones";

export {
  classifyCampaignChildId,
  detachLinkForCi,
  mergeCampaignLinks,
  readAdventureChildIds,
  resolveAdventureChildren,
  type CampaignBuilderCatalog,
  type CampaignLinkPatch,
  type ResolvedAdventureChild,
} from "@/lib/campaignBuilder/cascade";

export {
  attachAdventureToCampaign,
  attachLinkToCampaign,
  detachCfFromCampaign,
} from "@/lib/campaignBuilder/attach";
