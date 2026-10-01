"use client";

import type { DragEvent } from "react";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import {
  setVaultDragData,
  withContainerContext,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import type { VaultCardEntry } from "@/lib/vault/loadVaultEntries";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { unlinkFromVaultParking } from "@/lib/workshop/containerMoveWritePath";
import { cloneLibraryItemAsHomebrew } from "@/lib/workshop/cfCloneWritePath";
import { openVaultCardPreview } from "@/lib/vault/openVaultCardPreview";
import { removeFileFromVault } from "@/lib/vault/removeFileFromVault";
import {
  LORE_VAULT_CI_CLASS,
  LORE_VAULT_CONTAINER_ID,
  LORE_VAULT_SLOT,
} from "@/lib/vault/loreVaultContainer";
import CfContextMenu from "@/features/ui/CfContextMenu";
import { emitAppToast } from "@/lib/ui/appToast";

type VaultMiniCardProps = {
  entry: VaultCardEntry;
  parked?: boolean;
  /** Vault relationship row id for a parked card. */
  relationshipId?: string | null;
  onParkedChange?: () => void;
  /** Purge handler owned by the drawer (immediate, with undo). */
  onPurge?: (entry: VaultCardEntry) => void;
};

/**
 * Draggable Lore Vault chess piece with the shared CF context menu.
 */
export default function VaultMiniCard({
  entry,
  parked = false,
  relationshipId = null,
  onParkedChange,
  onPurge,
}: VaultMiniCardProps) {
  const { setDragging, refreshEntries } = useVaultDrawer();
  const visual = ciClassVisual(entry.ciClass);

  const payload: VaultDragPayload = withContainerContext(
    {
      vaultKind: "cf",
      id: entry.id,
      ciClass: entry.ciClass,
      title: entry.title,
      detail: entry.detail,
    },
    parked
      ? {
          parentId: LORE_VAULT_CONTAINER_ID,
          parentCiClass: LORE_VAULT_CI_CLASS,
          slot: LORE_VAULT_SLOT,
          holdKind: "park",
          relationshipId: relationshipId ?? entry.id,
        }
      : { parentId: null, parentCiClass: null, slot: null, holdKind: null },
  );

  const onCopy = async () => {
    if (entry.ciClass === "item.equipment" || entry.ciClass === "item.magic") {
      const result = await cloneLibraryItemAsHomebrew(entry.id);
      emitAppToast(result.ok ? `Copied ${entry.title}.` : result.error, result.ok ? "success" : "warn");
      if (result.ok) void refreshEntries();
      return;
    }
    emitAppToast("Copy duplicates Library items — use Create New for other CF types.", "info");
  };

  const onUnlink = async () => {
    if (!parked) {
      emitAppToast("Not parked — Library originals stay in The Library.", "info");
      return;
    }
    const result = await unlinkFromVaultParking(entry.id);
    emitAppToast(result.ok ? result.message : result.error, result.ok ? "success" : "warn");
    onParkedChange?.();
  };

  const purge = async () => {
    if (onPurge) {
      onPurge(entry);
      return;
    }
    const result = await removeFileFromVault(entry.id, true, {
      title: entry.title,
      sourceSrdEntityId: entry.sourceSrdEntityId,
    });
    if (!result.ok) {
      emitAppToast(result.error, "warn");
      return;
    }
    onParkedChange?.();
    void refreshEntries();
  };

  return (
    <CfContextMenu
      target={{
        id: entry.id,
        title: entry.title,
        ciClass: entry.ciClass,
        category: entry.category,
        provenance: entry.provenance,
        detail: entry.detail,
        srdEntityId: entry.sourceSrdEntityId ?? undefined,
      }}
      alreadyParked={parked}
      onInspect={() => openVaultCardPreview(entry)}
      extraItems={[
        {
          id: "copy",
          label: "Copy (homebrew duplicate)",
          onSelect: () => void onCopy(),
        },
        {
          id: "unlink",
          label: parked ? "Unlink from vault parking" : "Unlink (not parked)",
          disabled: !parked,
          onSelect: () => void onUnlink(),
        },
        {
          id: "purge-vault",
          label: "Purge from Vault",
          danger: true,
          hidden: !parked,
          onSelect: () => void purge(),
        },
      ]}
    >
      {(bind) => (
        <li
          className="vault-mini-card"
          draggable
          data-parked={parked ? "true" : undefined}
          {...bind}
          onDragStart={(event: DragEvent<HTMLLIElement>) => {
            setVaultDragData(event.dataTransfer, payload);
            setDragging(payload);
            // copy → park, move → trash, link → container drop zones.
            event.dataTransfer.effectAllowed = "all";
          }}
          onDragEnd={() => setDragging(null)}
        >
          <span className="vault-mini-card-icon" style={{ color: visual.accent }} aria-hidden="true">
            {visual.icon}
          </span>
          <button
            type="button"
            className="vault-mini-card-copy min-w-0 text-left"
            onClick={() => openVaultCardPreview(entry)}
            title="Inspect in Scrying Glass"
          >
            <p className="vault-mini-card-title">
              {entry.title}
              {parked ? (
                <span className="ml-1 text-[10px] font-normal text-[var(--dmms-accent,var(--accent))]">parked</span>
              ) : null}
            </p>
            <p className="vault-mini-card-meta">
              {fantasyCiLabel(entry.ciClass)} · {(entry.detail || "").slice(0, 48)}
            </p>
          </button>
          {parked ? (
            <button
              type="button"
              className="vault-mini-card-purge"
              onClick={(event) => {
                event.stopPropagation();
                void purge();
              }}
              aria-label={`Purge ${entry.title} from Vault`}
              title="Purge from Vault — your Library copy is kept"
            >
              🗑
            </button>
          ) : (
            <span className="vault-mini-card-grip" aria-hidden="true">
              ⠿
            </span>
          )}
        </li>
      )}
    </CfContextMenu>
  );
}

export function vaultPayloadFromCard(entry: VaultCardEntry): VaultDragPayload {
  return {
    vaultKind: "cf",
    id: entry.id,
    ciClass: entry.ciClass,
    title: entry.title,
    detail: entry.detail,
  };
}
