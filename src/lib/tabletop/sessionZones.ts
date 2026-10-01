import type { ContainerSlot } from "@/lib/workshop/containerCf";
import type { CampaignBuilderZoneId } from "@/lib/campaignBuilder/zones";
import type { CampaignZoneCard } from "@/lib/campaignBuilder/zoneCards";

/**
 * Live Session containers — a play-time view over the active campaign. Every
 * drop writes through the same campaign write path as the Campaign builder, so
 * a card linked at the table shows up in the campaign buckets too.
 */
export type SessionZoneId = "party" | "quests" | "loot" | "npcs";

export type SessionZone = {
  id: SessionZoneId;
  label: string;
  hint: string;
  icon: string;
  /** Preferred campaign slot; mismatched card types auto-route by class. */
  slot: ContainerSlot;
};

export const SESSION_ZONES: readonly SessionZone[] = [
  {
    id: "party",
    label: "Active Party",
    hint: "Heroes and fellowships at the table",
    icon: "\u{1F6E1}\uFE0F",
    slot: "members",
  },
  {
    id: "quests",
    label: "Quests & Encounters",
    hint: "Adventures, monsters, spells, and rules in play",
    icon: "\u{2694}\uFE0F",
    slot: "encounters",
  },
  {
    id: "loot",
    label: "Scene Loot",
    hint: "Treasure the party can find this scene",
    icon: "\u{1F48E}",
    slot: "loot",
  },
  {
    id: "npcs",
    label: "NPC Parking Lot",
    hint: "NPCs and effects waiting in the wings",
    icon: "\u{1F3AD}",
    slot: "scene",
  },
];

function isNpcLotCard(card: CampaignZoneCard): boolean {
  return card.ciClass === "npc.record" || card.relationship?.slot === "scene";
}

/** Regroup campaign bucket cards into the four Live Session containers. Pure. */
export function sessionZoneCards(
  byZone: Record<CampaignBuilderZoneId, CampaignZoneCard[]>,
): Record<SessionZoneId, CampaignZoneCard[]> {
  return {
    party: byZone.parties,
    quests: [...byZone.adventures, ...byZone.encounters.filter((card) => !isNpcLotCard(card))],
    loot: byZone.loot,
    npcs: byZone.encounters.filter(isNpcLotCard),
  };
}
