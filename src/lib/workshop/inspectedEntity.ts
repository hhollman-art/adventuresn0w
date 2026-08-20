import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { CiClass } from "@/lib/ciRegistry";
import type { SrdEntityId } from "@/lib/srd/types";

export const INSPECT_ENTITY_EVENT = "ddeasy:inspect-entity";

export type InspectMeta = {
  key: string;
  label: string;
  ciClass: CiClass | null;
  /** User-owned Creation File id when the row lives in a storage module. */
  cfId: string | null;
  srdEntityId?: SrdEntityId | null;
  selection: LibraryViewSelection;
};

export function inspectSelectionKey(selection: LibraryViewSelection): string | null {
  if (!selection) return null;
  switch (selection.kind) {
    case "srd":
      return `srd:${selection.resource}:${selection.index}`;
    case "srd-entity":
      return `srd-entity:${selection.entityId}`;
    case "srd-bundle":
      return `srd-bundle:${selection.bundleId}`;
    default:
      return `${selection.kind}:${selection.id}`;
  }
}

export function inspectMetaFromSelection(
  selection: LibraryViewSelection,
  extras: { label: string; ciClass: CiClass | null },
): InspectMeta | null {
  if (!selection) return null;
  const key = inspectSelectionKey(selection);
  if (!key) return null;
  const cfId = "id" in selection ? selection.id : null;
  const srdEntityId = selection.kind === "srd-entity" ? selection.entityId : null;
  return {
    key,
    label: extras.label,
    ciClass: extras.ciClass,
    cfId,
    srdEntityId,
    selection,
  };
}

/** Set the Scrying inspector target from anywhere (cards, chips, palette, vault). */
export function inspectEntity(meta: InspectMeta): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<InspectMeta>(INSPECT_ENTITY_EVENT, { detail: meta }));
}

export function isInspectMeta(value: unknown): value is InspectMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    typeof (value as InspectMeta).key === "string" &&
    "selection" in value
  );
}
