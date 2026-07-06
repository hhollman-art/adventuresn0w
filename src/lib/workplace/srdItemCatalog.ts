import type { Dnd5eListItem } from "@/lib/srd/dnd5eApi";
import { fetchDnd5eList } from "@/lib/srd/dnd5eApi";
import {
  ciClassForSrdItem,
  srdItemRefFromApi,
  type SrdItemRef,
  type SrdItemResource,
} from "@/lib/srd/srdItemRef";
import { SRD_CATALOGUE } from "@/lib/srd";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import { ciClassLabel } from "@/lib/ciRegistry";

/** SRD item resources exposed as item Creation Files (CFs) in the Items workplace and Library. */
export const SRD_ITEM_RESOURCES: SrdItemResource[] = ["equipment", "magic-items"];

export type SrdItemCatalog = {
  equipment: Dnd5eListItem[];
  magicItems: Dnd5eListItem[];
};

let cachedCatalog: SrdItemCatalog | null = null;
let loadPromise: Promise<SrdItemCatalog> | null = null;

/** Stable id for an SRD item row in Library / workplace lists (not user storage). */
export function srdItemEntryId(ref: SrdItemRef): string {
  return `srd-item:${ref.resource}:${ref.index}`;
}

export function parseSrdItemEntryId(id: string): SrdItemRef | null {
  const m = /^srd-item:(equipment|magic-items):(.+)$/.exec(id.trim());
  if (!m) return null;
  return srdItemRefFromApi(m[1] as SrdItemResource, m[2], m[2]);
}

export function srdListItemToRef(
  resource: SrdItemResource,
  item: Dnd5eListItem,
): SrdItemRef {
  return srdItemRefFromApi(resource, item.index, item.name);
}

/** Map one SRD list row to a Library CMDB entry (read-only, always in Items category). */
export function srdItemToLibraryEntry(ref: SrdItemRef): LibraryListEntry {
  const resourceLabel = ref.resource === "magic-items" ? "SRD magic item" : "SRD equipment";
  return {
    id: srdItemEntryId(ref),
    ciClass: ciClassForSrdItem(ref.resource),
    category: "items",
    provenance: "srd",
    kindLabel: resourceLabel,
    title: ref.name,
    detail: ciClassLabel(ciClassForSrdItem(ref.resource)),
    createdAt: `${SRD_CATALOGUE.version}-01-01T00:00:00.000Z`,
    srdItemRef: ref,
  };
}

export function srdItemCatalogToLibraryEntries(catalog: SrdItemCatalog): LibraryListEntry[] {
  return [
    ...catalog.equipment.map((item) =>
      srdItemToLibraryEntry(srdListItemToRef("equipment", item)),
    ),
    ...catalog.magicItems.map((item) =>
      srdItemToLibraryEntry(srdListItemToRef("magic-items", item)),
    ),
  ];
}

/** Load bundled SRD equipment + magic item catalogues (cached for the session). */
export async function loadSrdItemCatalog(): Promise<SrdItemCatalog> {
  if (cachedCatalog) return cachedCatalog;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const [equipment, magicItems] = await Promise.all([
      fetchDnd5eList("equipment"),
      fetchDnd5eList("magic-items"),
    ]);
    cachedCatalog = { equipment, magicItems };
    return cachedCatalog;
  })();
  return loadPromise;
}

/** Test helper — reset in-memory cache. */
export function resetSrdItemCatalogCache(): void {
  cachedCatalog = null;
  loadPromise = null;
}

export function filterSrdItemEntries(
  entries: LibraryListEntry[],
  query: string,
): LibraryListEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q) ||
      e.kindLabel.toLowerCase().includes(q),
  );
}
