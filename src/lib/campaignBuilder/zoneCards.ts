import type { CiClass } from "@/lib/ciRegistry";
import { ciClassForGameItem, CI_CLASS_FOR_CHARACTER, CI_CLASS_FOR_PARTY } from "@/lib/ciRegistry";
import type { SavedCampaign } from "@/lib/campaigns";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedGameItem } from "@/lib/itemLibrary";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import { seedDisplayName } from "@/lib/realmSeeds";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import { characterSummary } from "@/lib/tabletop/character";
import type { CfRelationship, ContainerSlot } from "@/lib/workshop/containerCf";
import type { CampaignBuilderZoneId } from "@/lib/campaignBuilder/zones";

/** One card shown inside a campaign / live-session container column. */
export type CampaignZoneCard = {
  id: string;
  title: string;
  subtitle: string;
  ciClass: CiClass | string;
  zone: CampaignBuilderZoneId;
  /** Set for SRD instance cards — membership lives in the relationship index. */
  relationship?: CfRelationship;
};

export type CampaignZoneCatalog = {
  characters: readonly SavedCharacter[];
  parties: readonly SavedCharacterRoster[];
  items: readonly SavedGameItem[];
  seeds: readonly SavedRealmSeed[];
  results: readonly LibraryItem[];
  npcs: readonly SavedNpc[];
  locations: readonly SavedLocation[];
};

/** Bucket that displays relationship rows recorded under each container slot. */
const ZONE_FOR_SLOT: Partial<Record<ContainerSlot, CampaignBuilderZoneId>> = {
  members: "parties",
  party: "parties",
  adventure: "adventures",
  general: "adventures",
  locations: "locations",
  encounters: "encounters",
  scene: "encounters",
  loot: "loot",
};

const SRD_KIND_LABEL: Record<string, string> = {
  "spell.srd-entry": "Spell",
  "monster.srd-entry": "Monster",
  "rules.srd-entry": "Rule",
  "item.srd-equipment": "Equipment",
  "item.srd-magic": "Magic item",
};

export function emptyZoneCards(): Record<CampaignBuilderZoneId, CampaignZoneCard[]> {
  return { parties: [], adventures: [], locations: [], encounters: [], loot: [] };
}

/** SRD instance rows this campaign owns, in display order. */
export function campaignInstanceRelationships(
  campaignId: string,
  relationships: readonly CfRelationship[],
): CfRelationship[] {
  return relationships
    .filter(
      (rel) =>
        rel.parentId === campaignId &&
        rel._source === "SRD" &&
        Boolean(rel.instanceId) &&
        // SRD loot is saved as a Library item and already listed by id.
        !(rel.slot === "loot" && rel.sourceLibraryId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function instanceCard(rel: CfRelationship): CampaignZoneCard | null {
  const zone = ZONE_FOR_SLOT[rel.slot];
  if (!zone) return null;
  const kind = SRD_KIND_LABEL[rel.childCiClass] ?? "Rule";
  return {
    id: rel.instanceId ?? rel.childId,
    title: rel.label,
    subtitle: `${kind} · your copy (SRD)`,
    ciClass: rel.childCiClass,
    zone,
    relationship: rel,
  };
}

/**
 * Project a campaign's Tier-1 id lists plus its SRD instance rows into the five
 * builder buckets. Pure — callers supply already-loaded Library rows.
 */
export function buildCampaignZoneCards(
  campaign: SavedCampaign,
  catalog: CampaignZoneCatalog,
  relationships: readonly CfRelationship[] = [],
): Record<CampaignBuilderZoneId, CampaignZoneCard[]> {
  const map = emptyZoneCards();

  if (campaign.partyId) {
    const party = catalog.parties.find((p) => p.id === campaign.partyId);
    if (party) {
      map.parties.push({
        id: party.id,
        title: party.name,
        subtitle: `${party.players.length} hero${party.players.length === 1 ? "" : "es"}`,
        ciClass: CI_CLASS_FOR_PARTY,
        zone: "parties",
      });
    }
  }
  for (const c of catalog.characters.filter((ch) => campaign.characterIds.includes(ch.id))) {
    map.parties.push({
      id: c.id,
      title: c.player.name,
      subtitle: characterSummary(c.player),
      ciClass: CI_CLASS_FOR_CHARACTER,
      zone: "parties",
    });
  }

  const storyKinds = new Set(["adventure", "realm", "characters"]);
  for (const s of catalog.seeds.filter(
    (row) => campaign.seedIds.includes(row.id) && storyKinds.has(row.kind),
  )) {
    map.adventures.push({
      id: s.id,
      title: seedDisplayName(s),
      subtitle: s.briefDescription.trim() || "Adventure",
      ciClass: `seed.${s.kind}`,
      zone: "adventures",
    });
  }
  for (const r of catalog.results.filter(
    (row) => campaign.resultIds.includes(row.id) && storyKinds.has(row.kind),
  )) {
    map.adventures.push({
      id: r.id,
      title: r.title,
      subtitle: "Adventure",
      ciClass: `result.${r.kind}`,
      zone: "adventures",
    });
  }

  for (const loc of catalog.locations.filter((l) => campaign.locationIds.includes(l.id))) {
    map.locations.push({
      id: loc.id,
      title: loc.name,
      subtitle: loc.locationKind,
      ciClass: "location.record",
      zone: "locations",
    });
  }
  for (const s of catalog.seeds.filter((row) => campaign.seedIds.includes(row.id) && row.kind === "maps")) {
    map.locations.push({
      id: s.id,
      title: seedDisplayName(s),
      subtitle: "Map",
      ciClass: "seed.maps",
      zone: "locations",
    });
  }
  for (const r of catalog.results.filter(
    (row) => campaign.resultIds.includes(row.id) && row.kind === "maps",
  )) {
    map.locations.push({
      id: r.id,
      title: r.title,
      subtitle: "Map",
      ciClass: "result.maps",
      zone: "locations",
    });
  }

  for (const npc of catalog.npcs.filter((n) => campaign.npcIds.includes(n.id))) {
    map.encounters.push({
      id: npc.id,
      title: npc.name,
      subtitle: npc.briefDescription.trim() || "NPC",
      ciClass: "npc.record",
      zone: "encounters",
    });
  }

  const instances = campaignInstanceRelationships(campaign.id, relationships);
  const instancedMonsters = new Set(
    instances.map((rel) => rel.sourceSrdEntityId).filter((id): id is string => Boolean(id)),
  );
  // Legacy catalogue refs only when no instance card already represents them.
  for (const monsterId of campaign.monsterIds ?? []) {
    if (instancedMonsters.has(monsterId)) continue;
    map.encounters.push({
      id: monsterId,
      title: monsterId.replace(/^monster:/, "").replace(/-/g, " "),
      subtitle: "Monster",
      ciClass: "monster.srd-entry",
      zone: "encounters",
    });
  }
  for (const s of catalog.seeds.filter((row) => campaign.seedIds.includes(row.id) && row.kind === "props")) {
    map.encounters.push({
      id: s.id,
      title: seedDisplayName(s),
      subtitle: "Encounter notes",
      ciClass: "seed.props",
      zone: "encounters",
    });
  }

  const lootIds = new Set([...(campaign.unassignedLootIds ?? []), ...campaign.itemIds]);
  for (const item of catalog.items.filter((i) => lootIds.has(i.id))) {
    const inPool = (campaign.unassignedLootIds ?? []).includes(item.id);
    map.loot.push({
      id: item.id,
      title: item.name,
      subtitle: inPool
        ? `Unassigned · ${GAME_ITEM_KIND_LABEL[item.kind]}`
        : GAME_ITEM_KIND_LABEL[item.kind],
      ciClass: ciClassForGameItem(item.kind),
      zone: "loot",
    });
  }

  for (const rel of instances) {
    const card = instanceCard(rel);
    if (card) map[card.zone].push(card);
  }

  return map;
}

/** Optimistic merge of freshly written rows (drop result) into a loaded list. */
export function mergeRelationshipRows(
  current: readonly CfRelationship[],
  incoming: readonly CfRelationship[],
): CfRelationship[] {
  const byId = new Map(current.map((rel) => [rel.id, rel]));
  for (const rel of incoming) byId.set(rel.id, rel);
  return [...byId.values()];
}
