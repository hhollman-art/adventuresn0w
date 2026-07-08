import type { CiClass } from "@/lib/ciRegistry";
import { readSrdEntityDragData, SRD_ENTITY_DRAG_MIME } from "@/lib/srd/srdDragDrop";

export const VAULT_CF_DRAG_MIME = "application/x-ddeasy-vault-cf";

/** Payload for draggable Creation Files in the Lore Vault drawer. */
export type VaultDragPayload = {
  vaultKind: "cf";
  id: string;
  ciClass: CiClass;
  title: string;
  detail: string;
};

export function setVaultDragData(dataTransfer: DataTransfer, payload: VaultDragPayload): void {
  dataTransfer.setData(VAULT_CF_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.setData("text/plain", payload.title);
  dataTransfer.effectAllowed = "copyMove";
}

export function readVaultDragData(dataTransfer: DataTransfer): VaultDragPayload | null {
  const raw = dataTransfer.getData(VAULT_CF_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VaultDragPayload;
    if (parsed?.vaultKind !== "cf" || !parsed.id || !parsed.ciClass || !parsed.title) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Accept vault CF cards and legacy SRD entity drags from the Library browser. */
export function readAnyVaultDragData(dataTransfer: DataTransfer): VaultDragPayload | null {
  const vault = readVaultDragData(dataTransfer);
  if (vault) return vault;

  const srd = readSrdEntityDragData(dataTransfer);
  if (!srd) return null;

  return {
    vaultKind: "cf",
    id: srd.entityId,
    ciClass: srd.entityId.startsWith("monster:") ? "monster.srd-entry" : "rules.srd-entry",
    title: srd.name,
    detail: srd.entityId,
  };
}

export function vaultDragHasPayload(dataTransfer: DataTransfer): boolean {
  return (
    dataTransfer.types.includes(VAULT_CF_DRAG_MIME) ||
    dataTransfer.types.includes(SRD_ENTITY_DRAG_MIME)
  );
}
