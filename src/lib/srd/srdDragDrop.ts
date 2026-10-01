import type { SrdEntityId } from "@/lib/srd/types";

export const SRD_ENTITY_DRAG_MIME = "application/x-ddeasy-srd-entity";

export type SrdEntityDragPayload = {
  entityId: SrdEntityId;
  name: string;
};

export function setSrdEntityDragData(
  dataTransfer: DataTransfer,
  payload: SrdEntityDragPayload,
): void {
  dataTransfer.setData(SRD_ENTITY_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.setData("text/plain", payload.name);
  // copy → rich-text fields; link → Campaign / Live Session containers.
  dataTransfer.effectAllowed = "copyLink";
}

export function readSrdEntityDragData(
  dataTransfer: DataTransfer,
): SrdEntityDragPayload | null {
  const raw = dataTransfer.getData(SRD_ENTITY_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SrdEntityDragPayload;
    if (!parsed?.entityId || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}
