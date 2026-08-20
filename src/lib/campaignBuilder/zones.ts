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
    label: "Parties & Players",
    hint: "Drop a party roster or hero sheets",
    slot: "members",
    accepts: ["character.sheet", "party.roster"],
  },
  {
    id: "adventures",
    label: "Adventures & Quests",
    hint: "Drop adventure CFs — nested children cascade in automatically",
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
    hint: "Drop locations and map CFs",
    slot: "locations",
    accepts: ["location.record", "seed.maps", "result.maps"],
  },
  {
    id: "encounters",
    label: "Monsters & Encounters",
    hint: "Drop NPCs, monsters, or encounter notes",
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
    label: "Loot & Vault",
    hint: "Drop items into the campaign vault / unassigned loot",
    slot: "loot",
    accepts: ["item.equipment", "item.magic", "item.srd-equipment", "item.srd-magic"],
  },
] as const;

export function campaignBuilderZone(id: CampaignBuilderZoneId): CampaignBuilderZone {
  const zone = CAMPAIGN_BUILDER_ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown campaign builder zone: ${id}`);
  return zone;
}
