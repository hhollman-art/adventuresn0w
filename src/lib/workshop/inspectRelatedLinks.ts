import { loadCampaigns, type SavedCampaign } from "@/lib/campaigns";
import { campaignsLinkingCi } from "@/lib/ciRelationships";
import { inspectMetaFromSelection, type InspectMeta } from "@/lib/workshop/inspectedEntity";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedLocations } from "@/lib/worldAssets/location";
import { CI_REGISTRY, type CiClass } from "@/lib/ciRegistry";

export type InspectRelatedLink = {
  id: string;
  label: string;
  hint: string;
  inspect: InspectMeta;
};

function campaignInspect(campaign: SavedCampaign): InspectMeta {
  return {
    key: `campaign:${campaign.id}`,
    label: campaign.name,
    ciClass: "campaign.record",
    cfId: campaign.id,
    srdEntityId: null,
    selection: { kind: "campaign", id: campaign.id },
  };
}

function campaignsMentioning(campaigns: SavedCampaign[], cfId: string): SavedCampaign[] {
  const viaMembership = campaignsLinkingCi(campaigns, cfId);
  const extra = campaigns.filter(
    (campaign) =>
      campaign.npcIds.includes(cfId) ||
      campaign.locationIds.includes(cfId) ||
      campaign.sessionRecordIds.includes(cfId),
  );
  const byId = new Map<string, SavedCampaign>();
  for (const row of [...viaMembership, ...extra]) byId.set(row.id, row);
  return [...byId.values()];
}

export async function loadInspectRelatedLinks(meta: InspectMeta): Promise<InspectRelatedLink[]> {
  const links: InspectRelatedLink[] = [];
  const campaigns = await loadCampaigns();

  if (meta.cfId) {
    for (const campaign of campaignsMentioning(campaigns, meta.cfId)) {
      links.push({
        id: `campaign-${campaign.id}`,
        label: campaign.name,
        hint: "Campaign that links this Creation File",
        inspect: campaignInspect(campaign),
      });
    }
  }

  const selection = meta.selection;
  if (selection?.kind === "npc") {
    const npcs = await loadSavedNpcs();
    const npc = npcs.find((row) => row.id === selection.id);
    if (npc?.locationId) {
      const locations = await loadSavedLocations();
      const location = locations.find((row) => row.id === npc.locationId);
      if (location) {
        const inspect = inspectMetaFromSelection(
          { kind: "location", id: location.id },
          { label: location.name, ciClass: "location.record" },
        );
        if (inspect) {
          links.push({
            id: `location-${location.id}`,
            label: location.name,
            hint: "Location this NPC is tied to",
            inspect,
          });
        }
      }
    }
  }

  if (selection?.kind === "location") {
    const npcs = await loadSavedNpcs();
    for (const npc of npcs.filter((row) => row.locationId === selection.id)) {
      const inspect = inspectMetaFromSelection(
        { kind: "npc", id: npc.id },
        { label: npc.name, ciClass: "npc.record" },
      );
      if (inspect) {
        links.push({
          id: `npc-${npc.id}`,
          label: npc.name,
          hint: "NPC living here",
          inspect,
        });
      }
    }
  }

  if (meta.ciClass && CI_REGISTRY[meta.ciClass as CiClass]?.provenance === "srd") {
    links.push({
      id: "srd-readonly",
      label: "Included rules (SRD)",
      hint: "Read-only — clone to The Library if you want an editable copy",
      inspect: meta,
    });
  }

  return links;
}
