/**
 * Lore Vault parking lot — operational staging for CFs.
 *
 * The vault remains a live index of Library CFs, plus an explicit "parked"
 * membership list so DMs can drag *into* the vault (stage) and *out* to
 * campaigns / character sheets. Parking never deletes Library originals.
 *
 * Membership is stored as container relationship rows on the
 * `LORE_VAULT_CONTAINER` parent (`loreVaultContainer.ts`); this module keeps
 * the original list-shaped API as a projection of those rows.
 */

import type { CfRelationship } from "@/lib/workshop/containerCf";
import {
  loadLoreVaultRows,
  loreVaultRowForLibraryCf,
  MAX_PARKED_IN_VAULT,
  parkLibraryCfInLoreVault,
  evictFromLoreVault,
  replaceLoreVaultRows,
  VAULT_PARKING_CHANGED_EVENT,
} from "@/lib/vault/loreVaultContainer";

export { VAULT_PARKING_CHANGED_EVENT };

export type VaultParkedEntry = {
  id: string;
  ciClass: string;
  title: string;
  detail: string;
  parkedAt: string;
  /** Library CF id (same as id for most rows). */
  libraryId: string;
  /** Vault relationship row id. */
  relationshipId?: string;
  /** Present when the parked card is a local SRD instance. */
  instanceId?: string;
  sourceSrdEntityId?: string | null;
};

/** Project one vault relationship row into the parking-lot entry shape. */
export function vaultEntryFromRow(row: CfRelationship): VaultParkedEntry {
  const entry: VaultParkedEntry = {
    id: row.childId,
    ciClass: row.childCiClass,
    title: row.label,
    detail: row.notes ?? "",
    parkedAt: row.createdAt,
    libraryId: row.sourceLibraryId ?? row.childId,
    relationshipId: row.id,
  };
  if (row._source === "SRD" && row.instanceId) {
    entry.instanceId = row.instanceId;
    entry.sourceSrdEntityId = row.sourceSrdEntityId ?? null;
  }
  return entry;
}

function entryToRow(entry: VaultParkedEntry, existing: CfRelationship | undefined): CfRelationship {
  if (existing) {
    return {
      ...existing,
      label: entry.title,
      notes: entry.detail,
      createdAt: entry.parkedAt || existing.createdAt,
    };
  }
  const row = loreVaultRowForLibraryCf(entry);
  if (entry.instanceId) {
    row.instanceId = entry.instanceId;
    row._source = "SRD";
    row.sourceSrdEntityId = entry.sourceSrdEntityId ?? null;
    row.sourceLibraryId = null;
  }
  return row;
}

export async function loadVaultParkingLot(): Promise<VaultParkedEntry[]> {
  return (await loadLoreVaultRows()).map(vaultEntryFromRow);
}

export async function parkCfInVault(entry: {
  id: string;
  ciClass: string;
  title: string;
  detail?: string;
}): Promise<VaultParkedEntry[]> {
  await parkLibraryCfInLoreVault(entry);
  return loadVaultParkingLot();
}

export async function unparkCfFromVault(id: string): Promise<VaultParkedEntry[]> {
  await evictFromLoreVault(id);
  return loadVaultParkingLot();
}

/** Replace the entire parking lot (used by SRD stub reconciliation). */
export async function replaceVaultParkingLot(
  list: VaultParkedEntry[],
): Promise<VaultParkedEntry[]> {
  const current = await loadLoreVaultRows();
  const byChild = new Map(current.map((row) => [row.childId, row]));
  const rows = list
    .slice(0, MAX_PARKED_IN_VAULT)
    .map((entry) => entryToRow(entry, byChild.get(entry.id)));
  await replaceLoreVaultRows(rows);
  return loadVaultParkingLot();
}

export async function isParkedInVault(id: string): Promise<boolean> {
  const list = await loadLoreVaultRows();
  return list.some((row) => row.childId === id || row.instanceId === id);
}
