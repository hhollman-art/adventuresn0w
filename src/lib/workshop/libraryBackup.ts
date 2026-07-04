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
  parties: SavedCharacterRoster[];
};

export const BACKUP_FORMAT = "ddeasy-library-backup";
export const BACKUP_VERSION = 1;

export type LibraryBackupCounts = {
  seeds: number;
  results: number;
  parties: number;
};

/** Gather every locally stored library item into one serializable document. */
export async function buildLibraryBackup(): Promise<LibraryBackupFile> {
  const [seeds, results, parties] = await Promise.all([
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacterRosters(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    seeds,
    results,
    parties,
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
  | { ok: true; seeds: unknown[]; results: unknown[]; parties: unknown[] }
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
    parties: Array.isArray(o.parties) ? o.parties : [],
  };
}

export type RestoreOutcome = {
  counts: LibraryBackupCounts;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  parties: SavedCharacterRoster[];
};

/**
 * Restore a parsed backup into local storage. Non-destructive: rows whose ids
 * already exist are skipped, nothing is deleted. Returns how many rows were
 * added plus the refreshed lists for updating UI state.
 */
export async function restoreLibraryBackup(parsed: {
  seeds: unknown[];
  results: unknown[];
  parties: unknown[];
}): Promise<RestoreOutcome> {
  const seedResult = await importRealmSeeds(parsed.seeds);
  const resultResult = await importGenerationLibraryItems(parsed.results);
  const partyResult = await importCharacterRosters(parsed.parties);
  return {
    counts: {
      seeds: seedResult.added,
      results: resultResult.added,
      parties: partyResult.added,
    },
    seeds: seedResult.seeds,
    results: resultResult.items,
    parties: partyResult.rosters,
  };
}

export function describeRestoreCounts(counts: LibraryBackupCounts): string {
  const parts: string[] = [];
  if (counts.seeds > 0) parts.push(`${counts.seeds} seed${counts.seeds === 1 ? "" : "s"}`);
  if (counts.results > 0)
    parts.push(`${counts.results} result${counts.results === 1 ? "" : "s"}`);
  if (counts.parties > 0)
    parts.push(`${counts.parties} part${counts.parties === 1 ? "y" : "ies"}`);
  if (parts.length === 0) {
    return "Backup read, but everything in it is already in your library.";
  }
  return `Restored ${parts.join(", ")} from backup.`;
}
