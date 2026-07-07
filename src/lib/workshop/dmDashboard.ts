import type { CiClass } from "@/lib/ciRegistry";
import {
  ciClassForGameItem,
  ciClassForResult,
  ciClassForSeed,
  CI_CLASS_FOR_CHARACTER,
} from "@/lib/ciRegistry";
import {
  getActiveCampaignId,
  loadCampaigns,
  type SavedCampaign,
} from "@/lib/campaigns";
import {
  LIBRARY_KIND_LABEL,
  loadGenerationLibraryItems,
  type LibraryItem,
} from "@/lib/generationLibrary";
import {
  GAME_ITEM_KIND_LABEL,
  loadSavedGameItems,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import {
  loadSavedCharacterRosters,
} from "@/lib/tabletop/characterRoster";
import {
  loadSavedCharacters,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import {
  loadRealmSeeds,
  seedDisplayName,
  SEED_KIND_LABEL,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import { listShelvedTableSummaries, loadTabletopSession } from "@/lib/tabletop/store";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";

export type RecentCreationFile = {
  id: string;
  title: string;
  kindLabel: string;
  ciClass: CiClass;
  createdAt: string;
  href: string;
};

export type RecentTableSession = {
  id: string;
  label: string;
  updatedAt: string;
  mapName: string;
  logPreview: string;
  href: string;
};

export type DmDashboardSnapshot = {
  activeCampaign: SavedCampaign | null;
  partyName: string | null;
  recentSessions: RecentTableSession[];
  recentCreations: RecentCreationFile[];
};

export type QuickCreateAction = "npc" | "item" | "location" | "quest";

function seedRow(seed: SavedRealmSeed): RecentCreationFile {
  return {
    id: seed.id,
    title: seedDisplayName(seed),
    kindLabel: SEED_KIND_LABEL[seed.kind],
    ciClass: ciClassForSeed(seed.kind),
    createdAt: seed.createdAt,
    href: "/library",
  };
}

function resultRow(item: LibraryItem): RecentCreationFile {
  return {
    id: item.id,
    title: item.title.trim() || LIBRARY_KIND_LABEL[item.kind],
    kindLabel: LIBRARY_KIND_LABEL[item.kind],
    ciClass: ciClassForResult(item.kind),
    createdAt: item.createdAt,
    href: "/library",
  };
}

function characterRow(character: SavedCharacter): RecentCreationFile {
  return {
    id: character.id,
    title: character.player.name.trim() || "Unnamed hero",
    kindLabel: "Hero sheet",
    ciClass: CI_CLASS_FOR_CHARACTER,
    createdAt: character.updatedAt,
    href: "/tavern",
  };
}

function itemRow(item: SavedGameItem): RecentCreationFile {
  return {
    id: item.id,
    title: item.name,
    kindLabel: GAME_ITEM_KIND_LABEL[item.kind],
    ciClass: ciClassForGameItem(item.kind),
    createdAt: item.updatedAt,
    href: "/items",
  };
}

/** Merge user-owned rows and return the most recently touched entries. */
export function pickRecentCreations(
  seeds: SavedRealmSeed[],
  results: LibraryItem[],
  characters: SavedCharacter[],
  items: SavedGameItem[],
  limit = 6,
): RecentCreationFile[] {
  const rows = [
    ...seeds.map(seedRow),
    ...results.map(resultRow),
    ...characters.map(characterRow),
    ...items.map(itemRow),
  ];
  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function buildRecentSessions(
  campaigns: SavedCampaign[],
  activeCampaignId: string | null,
  liveUpdatedAt: string | null,
  liveMapName: string | null,
  liveLogPreview: string,
  shelved: Awaited<ReturnType<typeof listShelvedTableSummaries>>,
  limit = 5,
): RecentTableSession[] {
  const byCampaign = new Map<string, RecentTableSession>();

  if (liveUpdatedAt && liveMapName) {
    const active = activeCampaignId
      ? campaigns.find((c) => c.id === activeCampaignId)
      : null;
    byCampaign.set(activeCampaignId ?? "__live__", {
      id: activeCampaignId ?? "live",
      label: active ? active.name : "Open game table",
      updatedAt: liveUpdatedAt,
      mapName: liveMapName,
      logPreview: liveLogPreview,
      href: "/table",
    });
  }

  for (const row of shelved) {
    const campaign = row.campaignId
      ? campaigns.find((c) => c.id === row.campaignId)
      : null;
    const key = row.campaignId ?? "__none__";
    const existing = byCampaign.get(key);
    if (existing && new Date(existing.updatedAt) >= new Date(row.updatedAt)) continue;
    byCampaign.set(key, {
      id: row.campaignId ?? key,
      label: campaign?.name ?? "Shelved game table",
      updatedAt: row.updatedAt,
      mapName: row.mapName,
      logPreview: row.logPreview,
      href: "/table",
    });
  }

  return [...byCampaign.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export async function loadDmDashboardSnapshot(): Promise<DmDashboardSnapshot> {
  const [
    campaigns,
    seeds,
    results,
    characters,
    items,
    parties,
    activeCampaignId,
    liveSession,
    shelved,
  ] = await Promise.all([
    loadCampaigns(),
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadSavedCharacterRosters(),
    Promise.resolve(getActiveCampaignId()),
    loadTabletopSession(),
    listShelvedTableSummaries(),
  ]);

  const activeCampaign = activeCampaignId
    ? campaigns.find((c) => c.id === activeCampaignId) ?? null
    : null;
  const partyName =
    activeCampaign?.partyId != null
      ? parties.find((p) => p.id === activeCampaign.partyId)?.name ?? null
      : null;

  return {
    activeCampaign,
    partyName,
    recentSessions: buildRecentSessions(
      campaigns,
      activeCampaignId,
      liveSession?.updatedAt ?? null,
      liveSession?.mapName ?? null,
      liveSession?.log[0]?.detail ?? liveSession?.log[0]?.expression ?? "",
      shelved,
    ),
    recentCreations: pickRecentCreations(seeds, results, characters, items),
  };
}

export function formatDashboardKindLabel(ciClass: CiClass): string {
  return fantasyCiLabel(ciClass);
}

export function formatDashboardPartyLine(partyName: string | null): string {
  return partyName ? `Fellowship: ${partyName}` : "No fellowship linked yet";
}

export function campaignRowHref(campaignId: string): string {
  return `/campaigns#${campaignId}`;
}
