import type { SavedCampaign } from "@/lib/campaigns";
import type { CiClass } from "@/lib/ciRegistry";
import { CI_REGISTRY } from "@/lib/ciRegistry";
import type { LibraryItem, LibraryKind } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SeedKind, SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SrdItemRef } from "@/lib/srd/srdItemRef";

/**
 * CI relationship model — campaigns are the structural root.
 *
 * Every stored row is a Configuration Item (one class, one category). Links are
 * **id references owned by the container** — never copies. Creating a CI saves
 * exactly one row in its storage module; linking it to a campaign only appends
 * its id to the campaign record.
 *
 * Logical tree (campaign at root; links are many-to-many and navigable both ways):
 *
 *   campaign.record
 *   ├── seed.* / result.*  (adventures = adventure kind; realms, maps, etc. too)
 *   ├── party.roster  (one primary party per campaign today)
 *   ├── character.sheet  (direct links, in addition to characters via party)
 *   └── item.equipment | item.magic  (user items)
 *
 *   party.roster → embeds character.sheet snapshots (same id, copied stats)
 *   character.sheet → embeds item copies on the gear list
 *
 * SRD equipment/magic (`item.srd-*`) are read-only catalogue CIs — referenced by
 * `{ resource, index }`, not stored as user rows.
 */

/** Fields on SavedCampaign that hold id links to other CIs. */
export type CampaignLinkField =
  | "partyId"
  | "seedIds"
  | "resultIds"
  | "characterIds"
  | "itemIds";

export const CAMPAIGN_LINK_FIELDS: CampaignLinkField[] = [
  "partyId",
  "seedIds",
  "resultIds",
  "characterIds",
  "itemIds",
];

/** Adventure content within a campaign = linked seeds/results whose kind is adventure. */
export function campaignAdventureSeeds(
  campaign: SavedCampaign,
  seeds: SavedRealmSeed[],
): SavedRealmSeed[] {
  const known = new Set(campaign.seedIds);
  return seeds.filter((s) => known.has(s.id) && s.kind === "adventure");
}

export function campaignAdventureResults(
  campaign: SavedCampaign,
  results: LibraryItem[],
): LibraryItem[] {
  const known = new Set(campaign.resultIds);
  return results.filter((r) => known.has(r.id) && r.kind === "adventure");
}

/** Campaigns that reference a given CI id (reverse lookup for two-way navigation). */
export function campaignsLinkingCi(
  campaigns: SavedCampaign[],
  ciId: string,
  options?: { field?: CampaignLinkField },
): SavedCampaign[] {
  return campaigns.filter((c) => {
    if (options?.field) {
      const f = options.field;
      if (f === "partyId") return c.partyId === ciId;
      return c[f].includes(ciId);
    }
    return (
      c.partyId === ciId ||
      c.seedIds.includes(ciId) ||
      c.resultIds.includes(ciId) ||
      c.characterIds.includes(ciId) ||
      c.itemIds.includes(ciId)
    );
  });
}

export type CampaignTreeNode = {
  ciClass: CiClass;
  id: string;
  label: string;
  children?: CampaignTreeNode[];
};

/** Build a display tree for one campaign (root = the campaign itself). */
export function buildCampaignTree(
  campaign: SavedCampaign,
  data: {
    seeds: SavedRealmSeed[];
    results: LibraryItem[];
    parties: SavedCharacterRoster[];
    characters: SavedCharacter[];
    items: SavedGameItem[];
  },
): CampaignTreeNode {
  const seedById = new Map(data.seeds.map((s) => [s.id, s]));
  const resultById = new Map(data.results.map((r) => [r.id, r]));
  const party = campaign.partyId
    ? data.parties.find((p) => p.id === campaign.partyId)
    : undefined;
  const linkedChars = data.characters.filter((c) => campaign.characterIds.includes(c.id));
  const linkedItems = data.items.filter((i) => campaign.itemIds.includes(i.id));

  const adventureNodes: CampaignTreeNode[] = [
    ...campaign.seedIds
      .map((id) => seedById.get(id))
      .filter((s): s is SavedRealmSeed => s !== undefined && s.kind === "adventure")
      .map((s) => ({
        ciClass: `seed.${s.kind}` as CiClass,
        id: s.id,
        label: s.seedName || s.titleHint || "Adventure seed",
      })),
    ...campaign.resultIds
      .map((id) => resultById.get(id))
      .filter((r): r is LibraryItem => r !== undefined && r.kind === "adventure")
      .map((r) => ({
        ciClass: `result.${r.kind}` as CiClass,
        id: r.id,
        label: r.title,
      })),
  ];

  const otherSeedNodes: CampaignTreeNode[] = campaign.seedIds
    .map((id) => seedById.get(id))
    .filter((s): s is SavedRealmSeed => s !== undefined && s.kind !== "adventure")
    .map((s) => ({
      ciClass: `seed.${s.kind}` as CiClass,
      id: s.id,
      label: s.seedName || s.titleHint || CI_REGISTRY[`seed.${s.kind}`].label,
    }));

  const otherResultNodes: CampaignTreeNode[] = campaign.resultIds
    .map((id) => resultById.get(id))
    .filter((r): r is LibraryItem => r !== undefined && r.kind !== "adventure")
    .map((r) => ({
      ciClass: `result.${r.kind}` as CiClass,
      id: r.id,
      label: r.title,
    }));

  const partyNode: CampaignTreeNode | undefined = party
    ? {
        ciClass: "party.roster",
        id: party.id,
        label: party.name,
        children: party.players.map((p) => ({
          ciClass: "character.sheet",
          id: p.id,
          label: p.name,
        })),
      }
    : undefined;

  const directCharNodes: CampaignTreeNode[] = linkedChars
    .filter((c) => !party?.players.some((p) => p.id === c.id))
    .map((c) => ({
      ciClass: "character.sheet",
      id: c.id,
      label: c.player.name,
    }));

  const itemNodes: CampaignTreeNode[] = linkedItems.map((i) => ({
    ciClass: i.kind === "magic" ? "item.magic" : "item.equipment",
    id: i.id,
    label: i.name,
  }));

  const children: CampaignTreeNode[] = [
    ...(adventureNodes.length
      ? [{ ciClass: "seed.adventure" as CiClass, id: `${campaign.id}-adventures`, label: "Adventures", children: adventureNodes }]
      : []),
    ...(partyNode ? [partyNode] : []),
    ...directCharNodes,
    ...(itemNodes.length
      ? [{ ciClass: "item.equipment" as CiClass, id: `${campaign.id}-items`, label: "Items", children: itemNodes }]
      : []),
    ...(otherSeedNodes.length
      ? [{ ciClass: "seed.realm" as CiClass, id: `${campaign.id}-seeds`, label: "Other seeds", children: otherSeedNodes }]
      : []),
    ...(otherResultNodes.length
      ? [{ ciClass: "result.realm" as CiClass, id: `${campaign.id}-results`, label: "Other results", children: otherResultNodes }]
      : []),
  ];

  return {
    ciClass: "campaign.record",
    id: campaign.id,
    label: campaign.name,
    children,
  };
}

/** True when a library seed/result kind represents adventure prep. */
export function isAdventureKind(kind: SeedKind | LibraryKind): boolean {
  return kind === "adventure";
}

/** Format an SRD item ref as a stable id string for gear notes. */
export function srdItemRefKey(ref: SrdItemRef): string {
  return `${ref.resource}:${ref.index}`;
}
