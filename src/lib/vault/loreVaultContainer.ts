/**
 * Lore Vault — global parking lot container (`campaign.lore-vault`).
 *
 * Membership is a set of container relationship rows owned by the singleton
 * parent `LORE_VAULT_CONTAINER` (`kind: "park"`, `slot: "vault"`). The vault is
 * a container like a campaign or a sheet, so moving a card out is a re-parent
 * of its row, and purging is a relationship delete:
 *
 * - SRD entities are parked as local `instance_*` copies (`instantiateSrdEntity`)
 *   so the vault never holds a global SRD id.
 * - Library CFs (characters, NPCs, items, custom CFs) are parked by id.
 * - Neither path writes to the SRD corpus or the master Library stores.
 */

import type { CiClass } from "@/lib/ciRegistry";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { vaultPayloadIsStaticSrd } from "@/lib/vault/cfDragDrop";
import type { CfRelationship, ContainerRelationKind, ContainerSlot } from "@/lib/workshop/containerCf";
import {
  containersHoldingChild,
  loadContainerRelationshipsFor,
  recordContainerRelationship,
  removeContainerRelationship,
  removeContainerRelationshipsForChild,
  reparentContainerRelationship,
  replaceContainerRelationshipsForParent,
} from "@/lib/workshop/containerRelationships";
import {
  instanceRelationshipId,
  instantiateSrdEntity,
  isStaticSrdDragId,
  relationshipForInstance,
} from "@/lib/srd/instantiateSrdEntity";
import { legacyKvDatabase, legacyLocalStorage } from "@/lib/library/legacySources";

export const LORE_VAULT_CONTAINER_ID = "LORE_VAULT_CONTAINER";
export const LORE_VAULT_CI_CLASS: CiClass = "campaign.lore-vault";
export const LORE_VAULT_PARENT = { id: LORE_VAULT_CONTAINER_ID, ciClass: LORE_VAULT_CI_CLASS } as const;
export const LORE_VAULT_SLOT: ContainerSlot = "vault";

/** Parent id older vault drag payloads carried before the container existed. */
const LEGACY_VAULT_PARENT_ID = "lore-vault";

export const VAULT_PARKING_CHANGED_EVENT = "ddeasy-vault-parking-changed";

export const MAX_PARKED_IN_VAULT = 256;

const LEGACY_PARKING_SOURCES = [
  legacyKvDatabase("ddeasy-vault-parking-v1", "kv", "parked"),
  legacyLocalStorage("ddeasy-vault-parking-v1"),
];
const LEGACY_MIGRATED_KEY = "ddeasy-vault-parking-migrated-v1";

export type LoreVaultResult =
  | { ok: true; message: string; instanceId?: string; relationship?: CfRelationship }
  | { ok: false; error: string };

/** Legacy parking row shape — still the public projection used by vault callers. */
export type LegacyParkedRow = {
  id: string;
  ciClass: string;
  title: string;
  detail: string;
  parkedAt: string;
  libraryId: string;
};

function notifyParkingChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VAULT_PARKING_CHANGED_EVENT));
}

export function isInstanceId(id: string): boolean {
  return id.startsWith("instance_");
}

/** Deterministic vault row id — one parking membership per child. */
export function loreVaultRowId(childId: string): string {
  return instanceRelationshipId(LORE_VAULT_CONTAINER_ID, LORE_VAULT_SLOT, childId);
}

/** True when the drag started on a parked Lore Vault card. */
export function isLoreVaultDragPayload(payload: VaultDragPayload | null | undefined): boolean {
  const parentId = payload?.container?.parentId;
  return parentId === LORE_VAULT_CONTAINER_ID || parentId === LEGACY_VAULT_PARENT_ID;
}

/** Build a parking row for a Library CF (or a legacy stub) — pure. */
export function loreVaultRowForLibraryCf(entry: {
  id: string;
  ciClass: string;
  title: string;
  detail?: string;
  parkedAt?: string;
  libraryId?: string;
}): CfRelationship {
  return {
    id: loreVaultRowId(entry.id),
    parentId: LORE_VAULT_CONTAINER_ID,
    parentCiClass: LORE_VAULT_CI_CLASS,
    childId: entry.id,
    childCiClass: entry.ciClass as CiClass,
    kind: "park",
    slot: LORE_VAULT_SLOT,
    label: entry.title,
    active: true,
    createdAt: entry.parkedAt ?? new Date().toISOString(),
    sourceLibraryId: entry.libraryId ?? entry.id,
    notes: entry.detail ?? "",
  };
}

function isMigrated(): boolean {
  try {
    return window.localStorage.getItem(LEGACY_MIGRATED_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * One-time, non-destructive copy of the pre-container parking lot into vault
 * relationship rows. The legacy store is read, never modified.
 */
async function migrateLegacyParking(): Promise<void> {
  if (typeof window === "undefined" || isMigrated()) return;
  let legacy: unknown[] | undefined;
  for (const source of LEGACY_PARKING_SOURCES) {
    legacy = await source();
    if (legacy && legacy.length > 0) break;
  }
  const rows = (legacy ?? [])
    .filter(
      (row): row is LegacyParkedRow =>
        !!row &&
        typeof row === "object" &&
        typeof (row as LegacyParkedRow).id === "string" &&
        typeof (row as LegacyParkedRow).title === "string",
    )
    .map((row) =>
      loreVaultRowForLibraryCf({
        id: row.id,
        ciClass: typeof row.ciClass === "string" ? row.ciClass : "rules.custom-entry",
        title: row.title,
        detail: typeof row.detail === "string" ? row.detail : "",
        parkedAt: typeof row.parkedAt === "string" ? row.parkedAt : undefined,
        libraryId: typeof row.libraryId === "string" ? row.libraryId : row.id,
      }),
    );
  if (rows.length > 0) await recordContainerRelationship(rows);
  try {
    window.localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
  } catch {
    /* retried next load — upserts are idempotent */
  }
}

/** Every parked row, newest first. */
export async function loadLoreVaultRows(): Promise<CfRelationship[]> {
  if (typeof window === "undefined") return [];
  await migrateLegacyParking();
  const rows = await loadContainerRelationshipsFor(LORE_VAULT_CONTAINER_ID);
  return rows
    .filter((r) => r.slot === LORE_VAULT_SLOT)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The vault row for a parked child (Library id or instance id), if any. */
export async function findLoreVaultRow(childId: string): Promise<CfRelationship | null> {
  const rows = await loadLoreVaultRows();
  return rows.find((r) => r.childId === childId || r.instanceId === childId) ?? null;
}

/** Parked SRD instance behind a drag payload, when the card is a vault instance. */
export async function findParkedLoreVaultInstance(
  payload: VaultDragPayload,
): Promise<(CfRelationship & { instanceId: string; sourceSrdEntityId: string }) | null> {
  if (!isInstanceId(payload.id)) return null;
  const row = await findLoreVaultRow(payload.id);
  if (!row?.instanceId || !row.sourceSrdEntityId) return null;
  return row as CfRelationship & { instanceId: string; sourceSrdEntityId: string };
}

/** Static SRD payload for a parked instance, so SRD-aware write paths can embed it. */
export function staticPayloadForParkedInstance(
  payload: VaultDragPayload,
  sourceSrdEntityId: string,
): VaultDragPayload {
  return { ...payload, id: sourceSrdEntityId, detail: `static-srd:${sourceSrdEntityId}` };
}

async function enforceCap(): Promise<void> {
  const rows = await loadContainerRelationshipsFor(LORE_VAULT_CONTAINER_ID);
  if (rows.length <= MAX_PARKED_IN_VAULT) return;
  const keep = [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_PARKED_IN_VAULT);
  await replaceContainerRelationshipsForParent(LORE_VAULT_CONTAINER_ID, keep);
}

/** Park rows (upsert by child — re-parking an existing card is a no-op). */
export async function recordLoreVaultRows(rows: readonly CfRelationship[]): Promise<void> {
  if (rows.length === 0) return;
  await migrateLegacyParking();
  const existing = new Set((await loadLoreVaultRows()).map((r) => r.childId));
  const fresh = rows.filter((r) => !existing.has(r.childId));
  if (fresh.length > 0) {
    await recordContainerRelationship(fresh);
    await enforceCap();
  }
  notifyParkingChanged();
}

/** Replace the whole parking lot in one write (SRD stub reconciliation). */
export async function replaceLoreVaultRows(rows: readonly CfRelationship[]): Promise<void> {
  await migrateLegacyParking();
  await replaceContainerRelationshipsForParent(
    LORE_VAULT_CONTAINER_ID,
    rows.slice(0, MAX_PARKED_IN_VAULT),
  );
  notifyParkingChanged();
}

async function clearExclusion(id: string): Promise<void> {
  try {
    const { clearVaultExclusion } = await import("@/lib/vault/vaultExclusion");
    await clearVaultExclusion(id);
  } catch {
    /* exclusion store optional during early boot / tests */
  }
}

/** Park a Library CF by id. A deliberate re-park clears any prior purge exclusion. */
export async function parkLibraryCfInLoreVault(entry: {
  id: string;
  ciClass: string;
  title: string;
  detail?: string;
}): Promise<CfRelationship> {
  await clearExclusion(entry.id);
  const row = loreVaultRowForLibraryCf(entry);
  await recordLoreVaultRows([row]);
  return row;
}

/**
 * Park a bundled SRD entity as a local instance. Re-parking an entity that
 * already has a parked copy returns that copy instead of stacking duplicates.
 */
export async function parkSrdEntityInLoreVault(
  entityId: string,
  name?: string,
): Promise<LoreVaultResult> {
  const inst = instantiateSrdEntity(entityId, "rules", { name });
  if (!inst) return { ok: false, error: `Could not stage “${name ?? entityId}” from the SRD.` };

  const existing = (await loadLoreVaultRows()).find(
    (r) => r._source === "SRD" && r.sourceSrdEntityId === inst.sourceSrdEntityId,
  );
  if (existing) {
    return {
      ok: true,
      message: `${existing.label} is already parked in the Lore Vault.`,
      instanceId: existing.instanceId,
      relationship: existing,
    };
  }

  const relationship: CfRelationship = {
    ...relationshipForInstance(inst, LORE_VAULT_PARENT, LORE_VAULT_SLOT, { kind: "park" }),
    notes: `Your copy of the SRD entry ${inst.sourceSrdEntityId}`,
  };
  try {
    await recordLoreVaultRows([relationship]);
  } catch {
    return { ok: false, error: `Could not park “${inst.name}” — storage is full or blocked.` };
  }
  return {
    ok: true,
    message: `${inst.name} parked in the Lore Vault as its own SRD copy.`,
    instanceId: inst.instanceId,
    relationship,
  };
}

/** SRD entity behind a non-vault instance card (e.g. a campaign encounter instance). */
async function sourceEntityForInstance(instanceId: string): Promise<string | null> {
  const rows = await containersHoldingChild(instanceId);
  return rows.find((r) => r.sourceSrdEntityId)?.sourceSrdEntityId ?? null;
}

/**
 * Drag-in handler: park any card (Library CF, SRD entity, SRD instance from
 * another container) in the vault.
 */
export async function parkInLoreVault(payload: VaultDragPayload): Promise<LoreVaultResult> {
  if (isLoreVaultDragPayload(payload)) {
    return { ok: false, error: `${payload.title} is already parked here.` };
  }
  if (vaultPayloadIsStaticSrd(payload) || isStaticSrdDragId(payload.id)) {
    const entityId = payload.detail.startsWith("static-srd:")
      ? payload.detail.slice("static-srd:".length).trim()
      : payload.id;
    return parkSrdEntityInLoreVault(entityId, payload.title);
  }
  if (isInstanceId(payload.id)) {
    const entityId = await sourceEntityForInstance(payload.id);
    if (entityId) return parkSrdEntityInLoreVault(entityId, payload.title);
  }
  const relationship = await parkLibraryCfInLoreVault({
    id: payload.id,
    ciClass: payload.ciClass,
    title: payload.title,
    detail: payload.detail,
  });
  return { ok: true, message: `${payload.title} parked in the Lore Vault.`, relationship };
}

/**
 * Drag-out handler: move a parked SRD instance onto another container by
 * re-parenting its relationship row (same `instanceId`, new parent + slot).
 */
export async function reassignLoreVaultInstance(options: {
  row: CfRelationship & { instanceId: string };
  parent: { id: string; ciClass: CiClass };
  slot: ContainerSlot;
  kind?: ContainerRelationKind;
}): Promise<CfRelationship> {
  const { row, parent, slot } = options;
  const next: CfRelationship = {
    ...row,
    id: instanceRelationshipId(parent.id, slot, row.instanceId),
    parentId: parent.id,
    parentCiClass: parent.ciClass,
    slot,
    kind: options.kind ?? "link",
    active: true,
    createdAt: new Date().toISOString(),
  };
  delete next.notes;
  await reparentContainerRelationship(row.id, next);
  notifyParkingChanged();
  return next;
}

/** Drop the vault's membership row for a child (soft eviction — no exclusion). */
export async function evictFromLoreVault(childId: string): Promise<CfRelationship[]> {
  const before = (await loadLoreVaultRows()).filter(
    (r) => r.childId === childId || r.instanceId === childId,
  );
  if (before.length === 0) return [];
  await removeContainerRelationshipsForChild(LORE_VAULT_CONTAINER_ID, childId);
  notifyParkingChanged();
  return before;
}

/** Remove one vault row by id (after a successful embed elsewhere). */
export async function removeLoreVaultRow(rowId: string): Promise<void> {
  await removeContainerRelationship(rowId);
  notifyParkingChanged();
}

/**
 * Hard purge. A parked SRD instance exists only as relationship rows, so every
 * row for it is removed (`removeContainerRelationshipsForChild(instanceId)`).
 * A Library CF only loses its vault membership — its campaign / sheet links
 * and the Library row itself are untouched. Returns the removed rows (undo).
 */
export async function purgeFromLoreVault(childId: string): Promise<CfRelationship[]> {
  if (isInstanceId(childId)) {
    const removed = await containersHoldingChild(childId);
    if (removed.length > 0) await removeContainerRelationshipsForChild(childId);
    notifyParkingChanged();
    return removed;
  }
  return evictFromLoreVault(childId);
}

/** Undo a purge: put the removed rows back and lift any exclusion. */
export async function restoreLoreVaultRows(rows: readonly CfRelationship[]): Promise<void> {
  if (rows.length === 0) return;
  await Promise.all([...new Set(rows.map((r) => r.childId))].map((id) => clearExclusion(id)));
  await recordContainerRelationship(rows);
  notifyParkingChanged();
}
