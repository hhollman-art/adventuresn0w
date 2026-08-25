import type { CiClass } from "@/lib/ciRegistry";
import type { ContainerSlot } from "@/lib/workshop/containerCf";

/**
 * Homebrew Campaign Builder zones — scannable drop targets on the Campaign
 * workplace canvas. Each zone maps to Tier-1 campaign id lists (and optional
 * `monsterIds`) via a ContainerSlot write path.
 */

export type CampaignBuilderZoneId =
  | "parties"
  | "adventures"
  | "locations"
  | "encounters"
  | "loot";

export type CampaignBuilderZone = {
  id: CampaignBuilderZoneId;
  label: string;
  hint: string;
  /** Write-path slot used by `dropIntoCampaignContainer`. */
  slot: ContainerSlot;
  accepts: CiClass[];
};

export const CAMPAIGN_BUILDER_ZONES: readonly CampaignBuilderZone[] = [
  {
    id: "parties",
    label: "Active Party",
    hint: "Drop heroes or a fellowship here",
    slot: "members",
    accepts: ["character.sheet", "party.roster"],
  },
  {
    id: "adventures",
    label: "Quests & Adventures",
    hint: "Drop adventure cards here",
    slot: "adventure",
    accepts: [
      "seed.adventure",
      "result.adventure",
      "seed.realm",
      "result.realm",
      "seed.characters",
      "result.characters",
    ],
  },
  {
    id: "locations",
    label: "Locations & Maps",
    hint: "Drop places and map cards here",
    slot: "locations",
    accepts: ["location.record", "seed.maps", "result.maps"],
  },
  {
    id: "encounters",
    label: "Encounters & Monsters",
    hint: "Drop NPCs, monsters, or encounter notes here",
    slot: "encounters",
    accepts: [
      "npc.record",
      "monster.srd-entry",
      "seed.props",
      "result.props",
      "rules.custom-entry",
    ],
  },
  {
    id: "loot",
    label: "Campaign Loot Chest",
    hint: "Drop treasure and gear here",
    slot: "loot",
    accepts: ["item.equipment", "item.magic", "item.srd-equipment", "item.srd-magic"],
  },
] as const;

/** Fantasy icons for the five Campaign Builder modules (paired with labels). */
export const CAMPAIGN_BUILDER_ZONE_ICON: Record<CampaignBuilderZoneId, string> = {
  parties: "\u{1F6E1}\uFE0F",
  adventures: "\u{1F4DC}",
  locations: "\u{1F5FA}\uFE0F",
  encounters: "\u{2694}\uFE0F",
  loot: "\u{1F48E}",
};

export function campaignBuilderZone(id: CampaignBuilderZoneId): CampaignBuilderZone {
  const zone = CAMPAIGN_BUILDER_ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown campaign builder zone: ${id}`);
  return zone;
}

/**
 * Pick the Campaign Builder zone for a CF class so drops (and Add to Campaign)
 * can auto-route even when the pointer lands on a neighboring box.
 */
export function resolveCampaignBuilderZoneForCiClass(
  ciClass: CiClass | string,
): CampaignBuilderZone | null {
  const exact = CAMPAIGN_BUILDER_ZONES.find((z) => z.accepts.includes(ciClass as CiClass));
  if (exact) return exact;

  if (ciClass === "character.sheet" || ciClass === "party.roster") {
    return campaignBuilderZone("parties");
  }
  if (
    ciClass === "seed.adventure" ||
    ciClass === "result.adventure" ||
    ciClass === "seed.realm" ||
    ciClass === "result.realm" ||
    ciClass === "seed.characters" ||
    ciClass === "result.characters"
  ) {
    return campaignBuilderZone("adventures");
  }
  if (ciClass === "location.record" || ciClass === "seed.maps" || ciClass === "result.maps") {
    return campaignBuilderZone("locations");
  }
  if (
    ciClass === "npc.record" ||
    ciClass === "monster.srd-entry" ||
    ciClass === "seed.props" ||
    ciClass === "result.props"
  ) {
    return campaignBuilderZone("encounters");
  }
  if (ciClass.startsWith("item.")) {
    return campaignBuilderZone("loot");
  }
  if (ciClass.startsWith("seed.") || ciClass.startsWith("result.")) {
    return campaignBuilderZone("adventures");
  }
  return null;
}

