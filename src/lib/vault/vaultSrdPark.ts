/**
 * Lore Vault SRD parking — never stage a raw global SRD entity id.
 *
 * Parking a static SRD drag hydrates (or reuses) a user Library CF, then parks
 * that Library id. Orphan parked stubs (`magic-item:dancing-sword`) are
 * reconciled on vault open so duplicates / broken cards disappear.
 */

import type { CiClass } from "@/lib/ciRegistry";
import { ciClassForGameItem } from "@/lib/ciRegistry";
import {
  gameItemSourceSrdEntityId,
  loadSavedGameItems,
  saveGameItem,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import {
  loadSavedCustomSrdEntries,
  saveCustomSrdEntry,
} from "@/lib/srd/srdCustomLibrary";
import { getSrdEntity, parseSrdEntityId } from "@/lib/srd/corpus";
import { instantiateSrdEntity } from "@/lib/srd/instantiateSrdEntity";
import {
  loadVaultParkingLot,
  replaceVaultParkingLot,
  type VaultParkedEntry,
} from "@/lib/vault/vaultParking";
import { loadVaultExcludedIds } from "@/lib/vault/vaultExclusion";
import { gameItemToLibraryEntry, customSrdToLibraryEntry } from "@/lib/workshop/libraryCatalog";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

export type VaultLibraryCfRef = {
  id: string;
  ciClass: CiClass;
  title: string;
  detail: string;
  sourceSrdEntityId: string;
  instanceId?: string;
};

/** Extract a bundled SRD entity id from a parked row or drag detail. */
export function extractStaticSrdEntityId(row: {
  id: string;
  detail?: string;
}): string | null {
  const fromDetail =
    typeof row.detail === "string" && row.detail.startsWith("static-srd:")
      ? row.detail.slice("static-srd:".length).trim()
      : null;
  const candidate = fromDetail || row.id;
  if (candidate.startsWith("instance_")) return null;
  return parseSrdEntityId(candidate);
}

export function sourceSrdEntityIdFromGameItem(item: SavedGameItem): string | null {
  // Typed provenance first (survives description edits), legacy text tag second.
  const raw = gameItemSourceSrdEntityId(item);
  return raw ? parseSrdEntityId(raw) : null;
}

/** Find an existing user Library CF cloned from this SRD entity. */
export async function findLibraryCfForSrdEntity(
  entityId: string,
): Promise<VaultLibraryCfRef | null> {
  const parsed = parseSrdEntityId(entityId);
  if (!parsed) return null;

  const [items, custom] = await Promise.all([
    loadSavedGameItems(),
    loadSavedCustomSrdEntries(),
  ]);

  const item = items.find((row) => sourceSrdEntityIdFromGameItem(row) === parsed);
  if (item) {
    const entry = gameItemToLibraryEntry(item);
    return {
      id: item.id,
      ciClass: entry.ciClass,
      title: entry.title,
      detail: entry.detail,
      sourceSrdEntityId: parsed,
    };
  }

  const srd = custom.find((row) => row.sourceSrdEntityId === parsed);
  if (srd) {
    const entry = customSrdToLibraryEntry(srd);
    return {
      id: srd.id,
      ciClass: entry.ciClass,
      title: entry.title,
      detail: entry.detail,
      sourceSrdEntityId: parsed,
    };
  }

  return null;
}

/** Hydrate a static SRD entity into a user Library CF (item or custom SRD). */
export async function hydrateSrdEntityToLibrary(
  entityId: string,
  preferredName?: string,
): Promise<VaultLibraryCfRef | null> {
  const existing = await findLibraryCfForSrdEntity(entityId);
  if (existing) return existing;

  const parsed = parseSrdEntityId(entityId);
  if (!parsed) return null;

  const entity = getSrdEntity(parsed);
  const itemKinds = new Set(["equipment", "weapon", "armor", "magic-item"]);
  const target = entity && itemKinds.has(entity.kind) ? "campaign-item" : "auto";
  const inst = instantiateSrdEntity(parsed, target, {
    name: preferredName ?? entity?.name,
  });
  if (!inst) return null;

  if (inst.payload.target === "campaign-item") {
    const list = await saveGameItem(inst.payload.draft);
    const created =
      list.find((row) => row.instanceId === inst.instanceId) ??
      list.find((row) => row.description.includes(inst.sourceSrdEntityId)) ??
      list[0];
    if (!created) return null;
    scheduleLibrarySnapshot();
    const entry = gameItemToLibraryEntry(created);
    return {
      id: created.id,
      ciClass: ciClassForGameItem(created.kind),
      title: entry.title,
      detail: entry.detail,
      sourceSrdEntityId: inst.sourceSrdEntityId,
      instanceId: inst.instanceId,
    };
  }

  // Spells / rules / effects → custom SRD workspace clone.
  const kind = entity?.kind ?? "feat";
  const markdown =
    inst.payload.target === "spell" ||
    inst.payload.target === "effect" ||
    inst.payload.target === "rules"
      ? inst.payload.markdown
      : `# ${inst.name}`;

  const list = await saveCustomSrdEntry({
    sourceSrdEntityId: inst.sourceSrdEntityId,
    kind,
    name: preferredName?.trim() || inst.name,
    subtitle: entity?.subtitle ?? null,
    markdown,
  });
  const created =
    list.find((row) => row.sourceSrdEntityId === inst.sourceSrdEntityId) ?? list[0];
  if (!created) return null;
  scheduleLibrarySnapshot();
  const entry = customSrdToLibraryEntry(created);
  return {
    id: created.id,
    ciClass: entry.ciClass,
    title: entry.title,
    detail: entry.detail,
    sourceSrdEntityId: inst.sourceSrdEntityId,
    instanceId: inst.instanceId,
  };
}

/**
 * Resolve a static-SRD vault drag to a parkable Library CF id.
 * Reuses an existing clone when present.
 */
export async function resolveSrdDragForVaultPark(options: {
  id: string;
  title: string;
  detail?: string;
}): Promise<VaultLibraryCfRef | null> {
  const entityId = extractStaticSrdEntityId({
    id: options.id,
    detail: options.detail,
  });
  if (!entityId) return null;
  return hydrateSrdEntityToLibrary(entityId, options.title);
}

function isStaticParkStub(row: VaultParkedEntry): string | null {
  const staticId = extractStaticSrdEntityId(row);
  if (!staticId) return null;
  if (row.id === staticId || (row.detail ?? "").startsWith("static-srd:")) {
    return staticId;
  }
  return null;
}

/**
 * Migrate orphan parked static-SRD stubs → Library CF ids.
 * Collapses duplicates (e.g. parked `magic-item:dancing-sword` + Library clone).
 */
export async function reconcileVaultParkingLot(): Promise<{
  list: VaultParkedEntry[];
  migrated: number;
  dropped: number;
}> {
  const [list, excludedIds] = await Promise.all([
    loadVaultParkingLot(),
    loadVaultExcludedIds(),
  ]);
  let migrated = 0;
  let dropped = 0;
  const next: VaultParkedEntry[] = [];
  const seenIds = new Set<string>();

  for (const row of list) {
    // Trashed / purged CFs stay out of the parking lot.
    if (excludedIds.has(row.id)) {
      dropped += 1;
      continue;
    }

    const staticId = isStaticParkStub(row);

    if (staticId) {
      if (excludedIds.has(staticId)) {
        dropped += 1;
        continue;
      }
      const lib = await hydrateSrdEntityToLibrary(staticId, row.title);
      if (!lib) {
        if (!seenIds.has(row.id)) {
          next.push(row);
          seenIds.add(row.id);
        } else {
          dropped += 1;
        }
        continue;
      }

      if (excludedIds.has(lib.id) || excludedIds.has(lib.sourceSrdEntityId)) {
        dropped += 1;
        continue;
      }

      if (seenIds.has(lib.id)) {
        dropped += 1;
        continue;
      }

      if (row.id !== lib.id) migrated += 1;
      next.push({
        id: lib.id,
        ciClass: lib.ciClass,
        title: lib.title,
        detail: lib.detail,
        parkedAt: row.parkedAt,
        libraryId: lib.id,
      });
      seenIds.add(lib.id);
      continue;
    }

    if (seenIds.has(row.id)) {
      dropped += 1;
      continue;
    }
    seenIds.add(row.id);
    next.push(row);
  }

  const changed =
    migrated > 0 ||
    dropped > 0 ||
    next.length !== list.length ||
    next.some((row, i) => row.id !== list[i]?.id || row.detail !== list[i]?.detail);

  if (changed) {
    await replaceVaultParkingLot(next);
  }

  return { list: await loadVaultParkingLot(), migrated, dropped };
}
