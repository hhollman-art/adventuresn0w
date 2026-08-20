import type { SavedCampaign } from "@/lib/campaigns";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import type { CiClass } from "@/lib/ciRegistry";

/** Snapshot of Library rows used to resolve adventure `childIds` into campaign links. */
export type CampaignBuilderCatalog = {
  characters: SavedCharacter[];
  items: SavedGameItem[];
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  parties: SavedCharacterRoster[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
};

/** One Tier-1 campaign membership patch (same shape as `linkToCampaign`). */
export type CampaignLinkPatch = {
  seedId?: string;
  resultId?: string;
  partyId?: string;
  characterId?: string;
  itemId?: string;
  npcId?: string;
  locationId?: string;
  sessionRecordId?: string;
  monsterId?: string;
};

export type ResolvedAdventureChild = {
  id: string;
  ciClass: CiClass;
  title: string;
  link: CampaignLinkPatch;
};

/** Read optional nested CF ids from an adventure seed or result. */
export function readAdventureChildIds(
  row: { childIds?: string[] } | SavedRealmSeed | LibraryItem,
): string[] {
  const raw = "childIds" in row && Array.isArray(row.childIds) ? row.childIds : [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
}

/**
 * Classify a Library / SRD id into a campaign link patch using the local catalog.
 * Unknown ids that look like bundled monsters (`monster:…`) become monster links.
 */
export function classifyCampaignChildId(
  id: string,
  catalog: CampaignBuilderCatalog,
): ResolvedAdventureChild | null {
  const character = catalog.characters.find((c) => c.id === id);
  if (character) {
    return {
      id,
      ciClass: "character.sheet",
      title: character.player.name,
      link: { characterId: id },
    };
  }
  const item = catalog.items.find((i) => i.id === id);
  if (item) {
    return {
      id,
      ciClass: item.kind === "magic" ? "item.magic" : "item.equipment",
      title: item.name,
      link: { itemId: id },
    };
  }
  const seed = catalog.seeds.find((s) => s.id === id);
  if (seed) {
    return {
      id,
      ciClass: `seed.${seed.kind}` as CiClass,
      title: seed.seedName?.trim() || seed.titleHint || seed.briefDescription.slice(0, 40) || id,
      link: { seedId: id },
    };
  }
  const result = catalog.results.find((r) => r.id === id);
  if (result) {
    return {
      id,
      ciClass: `result.${result.kind}` as CiClass,
      title: result.title,
      link: { resultId: id },
    };
  }
  const party = catalog.parties.find((p) => p.id === id);
  if (party) {
    return {
      id,
      ciClass: "party.roster",
      title: party.name,
      link: { partyId: id },
    };
  }
  const npc = catalog.npcs.find((n) => n.id === id);
  if (npc) {
    return {
      id,
      ciClass: "npc.record",
      title: npc.name,
      link: { npcId: id },
    };
  }
  const location = catalog.locations.find((l) => l.id === id);
  if (location) {
    return {
      id,
      ciClass: "location.record",
      title: location.name,
      link: { locationId: id },
    };
  }
  if (id.startsWith("monster:") || id.startsWith("spell:")) {
    return {
      id,
      ciClass: id.startsWith("monster:") ? "monster.srd-entry" : "spell.srd-entry",
      title: id.split(":")[1]?.replace(/-/g, " ") ?? id,
      link: { monsterId: id },
    };
  }
  return null;
}

export function resolveAdventureChildren(
  childIds: string[],
  catalog: CampaignBuilderCatalog,
): ResolvedAdventureChild[] {
  const out: ResolvedAdventureChild[] = [];
  for (const id of childIds) {
    const resolved = classifyCampaignChildId(id, catalog);
    if (resolved) out.push(resolved);
  }
  return out;
}

/** Merge many link patches into a single campaign update (deduped). */
export function mergeCampaignLinks(
  campaign: SavedCampaign,
  links: CampaignLinkPatch[],
): Partial<SavedCampaign> {
  let partyId = campaign.partyId;
  const seedIds = new Set(campaign.seedIds);
  const resultIds = new Set(campaign.resultIds);
  const characterIds = new Set(campaign.characterIds);
  const itemIds = new Set(campaign.itemIds);
  const npcIds = new Set(campaign.npcIds);
  const locationIds = new Set(campaign.locationIds);
  const sessionRecordIds = new Set(campaign.sessionRecordIds);
  const monsterIds = new Set(campaign.monsterIds ?? []);

  for (const link of links) {
    if (link.partyId) partyId = link.partyId;
    if (link.seedId) seedIds.add(link.seedId);
    if (link.resultId) resultIds.add(link.resultId);
    if (link.characterId) characterIds.add(link.characterId);
    if (link.itemId) itemIds.add(link.itemId);
    if (link.npcId) npcIds.add(link.npcId);
    if (link.locationId) locationIds.add(link.locationId);
    if (link.sessionRecordId) sessionRecordIds.add(link.sessionRecordId);
    if (link.monsterId) monsterIds.add(link.monsterId);
  }

  return {
    partyId,
    seedIds: [...seedIds],
    resultIds: [...resultIds],
    characterIds: [...characterIds],
    itemIds: [...itemIds],
    npcIds: [...npcIds],
    locationIds: [...locationIds],
    sessionRecordIds: [...sessionRecordIds],
    monsterIds: [...monsterIds],
  };
}

/**
 * Build the detach (unlink) patch for one CF. Does not delete Library rows.
 * Adventure detach leaves cascaded children linked — they are independent Tier-1 refs.
 */
export function detachLinkForCi(
  ciClass: CiClass | string,
  id: string,
): Parameters<typeof import("@/lib/campaigns").unlinkFromCampaign>[1] {
  if (ciClass === "party.roster") return { partyId: true };
  if (typeof ciClass === "string" && ciClass.startsWith("seed.")) return { seedId: id };
  if (typeof ciClass === "string" && ciClass.startsWith("result.")) return { resultId: id };
  if (ciClass === "character.sheet") return { characterId: id };
  if (ciClass === "item.equipment" || ciClass === "item.magic") return { itemId: id };
  if (ciClass === "npc.record") return { npcId: id };
  if (ciClass === "location.record") return { locationId: id };
  if (ciClass === "session.record") return { sessionRecordId: id };
  if (ciClass === "monster.srd-entry" || id.startsWith("monster:")) return { monsterId: id };
  return { itemId: id };
}
