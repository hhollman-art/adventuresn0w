import type { CiClass } from "@/lib/ciRegistry";
import { readSrdEntityDragData, SRD_ENTITY_DRAG_MIME } from "@/lib/srd/srdDragDrop";
import { getSrdEntity, ciClassForSrdEntity, parseSrdEntityId } from "@/lib/srd/corpus";
import type {
  ContainerDragContext,
  ContainerRelationKind,
  ContainerSlot,
} from "@/lib/workshop/containerCf";

export const VAULT_CF_DRAG_MIME = "application/x-ddeasy-vault-cf";

/** Payload for draggable Creation Files in the Lore Vault drawer. */
export type VaultDragPayload = {
  vaultKind: "cf";
  id: string;
  ciClass: CiClass;
  title: string;
  detail: string;
  /** Optional container parent context for clean moves (no phantom duplicates). */
  container?: ContainerDragContext;
};

export function setVaultDragData(dataTransfer: DataTransfer, payload: VaultDragPayload): void {
  dataTransfer.setData(VAULT_CF_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.setData("text/plain", payload.title);
  dataTransfer.effectAllowed = "copyMove";
}

export function withContainerContext(
  payload: VaultDragPayload,
  ctx: Partial<ContainerDragContext> & {
    parentId?: string | null;
    slot?: ContainerSlot | null;
    holdKind?: ContainerRelationKind | null;
  },
): VaultDragPayload {
  return {
    ...payload,
    container: {
      parentId: ctx.parentId ?? null,
      parentCiClass: ctx.parentCiClass ?? null,
      relationshipId: ctx.relationshipId ?? null,
      slot: ctx.slot ?? null,
      holdKind: ctx.holdKind ?? null,
    },
  };
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

/**
 * Accept vault CF cards and SRD entity drags from the Library browser.
 * SRD payloads keep the static entity id here — hydration to InstantiatedCF
 * happens on drop via `instantiateSrdEntity` (never link the global id).
 */
export function readAnyVaultDragData(dataTransfer: DataTransfer): VaultDragPayload | null {
  const vault = readVaultDragData(dataTransfer);
  if (vault) return vault;

  const srd = readSrdEntityDragData(dataTransfer);
  if (!srd) return null;

  const entityId = parseSrdEntityId(srd.entityId) ?? srd.entityId;
  const entity = getSrdEntity(entityId as Parameters<typeof getSrdEntity>[0]);
  const ciClass: CiClass = entity
    ? ciClassForSrdEntity(entity.kind)
    : entityId.startsWith("monster:")
      ? "monster.srd-entry"
      : entityId.startsWith("spell:")
        ? "spell.srd-entry"
        : entityId.startsWith("magic-item:")
          ? "item.srd-magic"
          : entityId.startsWith("weapon:") ||
              entityId.startsWith("armor:") ||
              entityId.startsWith("equipment:")
            ? "item.srd-equipment"
            : "rules.srd-entry";

  return {
    vaultKind: "cf",
    id: entityId,
    ciClass,
    title: srd.name,
    detail: `static-srd:${entityId}`,
  };
}

/** True when a vault payload still points at a static SRD entity (needs hydration). */
export function vaultPayloadIsStaticSrd(payload: VaultDragPayload): boolean {
  return (
    payload.detail.startsWith("static-srd:") ||
    (parseSrdEntityId(payload.id) !== null && !payload.id.startsWith("instance_"))
  );
}

export function vaultDragHasPayload(dataTransfer: DataTransfer): boolean {
  return (
    dataTransfer.types.includes(VAULT_CF_DRAG_MIME) ||
    dataTransfer.types.includes(SRD_ENTITY_DRAG_MIME)
  );
}
