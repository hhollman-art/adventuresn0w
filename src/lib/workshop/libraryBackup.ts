import type { LibraryItem } from "@/lib/generationLibrary";
import {
  importGenerationLibraryItems,
  loadGenerationLibraryItems,
} from "@/lib/generationLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import { importRealmSeeds, loadRealmSeeds } from "@/lib/realmSeeds";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import {
  importCharacterRosters,
  loadSavedCharacterRosters,
} from "@/lib/tabletop/characterRoster";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import {
  importSavedCharacters,
  loadSavedCharacters,
} from "@/lib/tabletop/characterLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import { importGameItems, loadSavedGameItems } from "@/lib/itemLibrary";
import type { SavedCampaign } from "@/lib/campaigns";
import { importCampaigns, loadCampaigns } from "@/lib/campaigns";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import {
  importSavedSessionRecords,
  loadSavedSessionRecords,
} from "@/lib/sessions/record";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import { importSavedNpcs, loadSavedNpcs } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import { importSavedLocations, loadSavedLocations } from "@/lib/worldAssets/location";
import type { CampaignRelationshipGraph } from "@/lib/ciRelationshipGraph";
import {
  importCampaignRelationshipGraphs,
  loadCampaignRelationshipGraphs,
} from "@/lib/campaignRelationships";
import type { SavedCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import {
  importCustomSrdEntries,
  loadSavedCustomSrdEntries,
} from "@/lib/srd/srdCustomLibrary";

/**
 * Library backup file — everything the DM owns, in one JSON document they can
 * save to any folder, cloud drive, or git repository they choose.
 *
 * Included rules (SRD) are deliberately NOT part of the backup: they ship with
 * the app and never need backing up. Everything here is local-only data.
 */
export type LibraryBackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  /** Standalone character sheets from the character library. */
  characters: SavedCharacter[];
  /** Equipment and magic items from the item library. */
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  /** Campaign records (id links only — table snapshots stay local). */
  campaigns: SavedCampaign[];
  /** Named NPC records (npc.record). */
  npcs?: SavedNpc[];
  /** Location records (location.record). */
  locations?: SavedLocation[];
  /** Play session logs (session.record). */
  sessionRecords?: SavedSessionRecord[];
  /** Optional Tier-2 relationship graphs (semantic edges per campaign). */
  relationshipGraphs?: CampaignRelationshipGraph[];
  /** User-owned editable clones of bundled SRD entries. */
  customSrd?: SavedCustomSrdEntry[];
};

export const BACKUP_FORMAT = "ddeasy-library-backup";
export const BACKUP_VERSION = 1;

export type LibraryBackupCounts = {
  seeds: number;
  results: number;
  characters: number;
  items: number;
  parties: number;
  campaigns: number;
  npcs: number;
  locations: number;
  sessionRecords: number;
  relationshipGraphs: number;
  customSrd: number;
};

/** Gather every locally stored library item into one serializable document. */
export async function buildLibraryBackup(): Promise<LibraryBackupFile> {
  const [seeds, results, characters, items, parties, campaigns, npcs, locations, sessionRecords, relationshipGraphs, customSrd] =
    await Promise.all([
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadSavedCharacterRosters(),
    loadCampaigns(),
    loadSavedNpcs(),
    loadSavedLocations(),
    loadSavedSessionRecords(),
    loadCampaignRelationshipGraphs(),
    loadSavedCustomSrdEntries(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    seeds,
    results,
    characters,
    items,
    parties,
    campaigns,
    npcs,
    locations,
    sessionRecords,
    relationshipGraphs,
    customSrd,
  };
}

export function serializeLibraryBackup(backup: LibraryBackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** e.g. "ddeasy-library-backup-2026-07-04.json" */
export function suggestedBackupFilename(date: Date = new Date()): string {
  return `${BACKUP_FORMAT}-${date.toISOString().slice(0, 10)}.json`;
}

export type ParsedBackup =
  | {
      ok: true;
      seeds: unknown[];
      results: unknown[];
      characters: unknown[];
      items: unknown[];
      parties: unknown[];
      campaigns: unknown[];
      npcs: unknown[];
      locations: unknown[];
      sessionRecords: unknown[];
      relationshipGraphs: unknown[];
      customSrd: unknown[];
    }
  | { ok: false; error: string };

/**
 * Parse a backup file's text without touching storage. Row-level validation
 * happens during restore, so this only checks the envelope.
 */
export function parseLibraryBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "That file is not a D&D Easy library backup." };
  }
  const o = raw as Record<string, unknown>;
  if (o.format !== BACKUP_FORMAT) {
    return { ok: false, error: "That file is not a D&D Easy library backup." };
  }
  return {
    ok: true,
    seeds: Array.isArray(o.seeds) ? o.seeds : [],
    results: Array.isArray(o.results) ? o.results : [],
    // Older backups predate characters/items/campaigns — treat as none.
    characters: Array.isArray(o.characters) ? o.characters : [],
    items: Array.isArray(o.items) ? o.items : [],
    parties: Array.isArray(o.parties) ? o.parties : [],
    campaigns: Array.isArray(o.campaigns) ? o.campaigns : [],
    npcs: Array.isArray(o.npcs) ? o.npcs : [],
    locations: Array.isArray(o.locations) ? o.locations : [],
    sessionRecords: Array.isArray(o.sessionRecords) ? o.sessionRecords : [],
    relationshipGraphs: Array.isArray(o.relationshipGraphs) ? o.relationshipGraphs : [],
    customSrd: Array.isArray(o.customSrd) ? o.customSrd : [],
  };
}

export type RestoreOutcome = {
  counts: LibraryBackupCounts;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  campaigns: SavedCampaign[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
  sessionRecords: SavedSessionRecord[];
  relationshipGraphs: CampaignRelationshipGraph[];
  customSrd: SavedCustomSrdEntry[];
};

/**
 * Restore a parsed backup into local storage. Non-destructive: rows whose ids
 * already exist are skipped, nothing is deleted. Returns how many rows were
 * added plus the refreshed lists for updating UI state.
 */
export async function restoreLibraryBackup(parsed: {
  seeds: unknown[];
  results: unknown[];
  characters: unknown[];
  items: unknown[];
  parties: unknown[];
  campaigns: unknown[];
  npcs?: unknown[];
  locations?: unknown[];
  sessionRecords?: unknown[];
  relationshipGraphs?: unknown[];
  customSrd?: unknown[];
}): Promise<RestoreOutcome> {
  const seedResult = await importRealmSeeds(parsed.seeds);
  const resultResult = await importGenerationLibraryItems(parsed.results);
  const characterResult = await importSavedCharacters(parsed.characters);
  const itemResult = await importGameItems(parsed.items);
  const partyResult = await importCharacterRosters(parsed.parties);
  const campaignResult = await importCampaigns(parsed.campaigns);
  const npcResult = await importSavedNpcs(parsed.npcs ?? []);
  const locationResult = await importSavedLocations(parsed.locations ?? []);
  const sessionResult = await importSavedSessionRecords(parsed.sessionRecords ?? []);
  const graphResult = await importCampaignRelationshipGraphs(parsed.relationshipGraphs ?? []);
  const beforeCustom = (await loadSavedCustomSrdEntries()).length;
  const customRows = (parsed.customSrd ?? []).filter(
    (row): row is SavedCustomSrdEntry => typeof row === "object" && row !== null,
  );
  const customList = await importCustomSrdEntries(customRows);
  const customAdded = Math.max(0, customList.length - beforeCustom);
  return {
    counts: {
      seeds: seedResult.added,
      results: resultResult.added,
      characters: characterResult.added,
      items: itemResult.added,
      parties: partyResult.added,
      campaigns: campaignResult.added,
      npcs: npcResult.added,
      locations: locationResult.added,
      sessionRecords: sessionResult.added,
      relationshipGraphs: graphResult.added,
      customSrd: customAdded,
    },
    seeds: seedResult.seeds,
    results: resultResult.items,
    characters: characterResult.characters,
    items: itemResult.items,
    parties: partyResult.rosters,
    campaigns: campaignResult.campaigns,
    npcs: npcResult.npcs,
    locations: locationResult.locations,
    sessionRecords: sessionResult.sessionRecords,
    relationshipGraphs: graphResult.graphs,
    customSrd: customList,
  };
}

export function describeRestoreCounts(counts: LibraryBackupCounts): string {
  const parts: string[] = [];
  if (counts.seeds > 0) {
    parts.push(
      counts.seeds === 1
        ? "1 CF"
        : `${counts.seeds} CFs`,
    );
  }
  if (counts.results > 0)
    parts.push(`${counts.results} result${counts.results === 1 ? "" : "s"}`);
  if (counts.characters > 0)
    parts.push(`${counts.characters} character${counts.characters === 1 ? "" : "s"}`);
  if (counts.items > 0)
    parts.push(`${counts.items} item${counts.items === 1 ? "" : "s"}`);
  if (counts.parties > 0)
    parts.push(`${counts.parties} part${counts.parties === 1 ? "y" : "ies"}`);
  if (counts.campaigns > 0)
    parts.push(`${counts.campaigns} campaign${counts.campaigns === 1 ? "" : "s"}`);
  if (counts.npcs > 0)
    parts.push(`${counts.npcs} NPC${counts.npcs === 1 ? "" : "s"}`);
  if (counts.locations > 0)
    parts.push(`${counts.locations} location${counts.locations === 1 ? "" : "s"}`);
  if (counts.sessionRecords > 0)
    parts.push(
      `${counts.sessionRecords} session log${counts.sessionRecords === 1 ? "" : "s"}`,
    );
  if (counts.relationshipGraphs > 0)
    parts.push(
      `${counts.relationshipGraphs} relationship graph${counts.relationshipGraphs === 1 ? "" : "s"}`,
    );
  if (counts.customSrd > 0)
    parts.push(`${counts.customSrd} custom SRD clone${counts.customSrd === 1 ? "" : "s"}`);
  if (parts.length === 0) {
    return "Backup read, but everything in it is already in your library.";
  }
  return `Restored ${parts.join(", ")} from backup.`;
}
