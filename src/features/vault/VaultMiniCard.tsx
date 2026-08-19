"use client";

import { useState, type DragEvent } from "react";
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
import CfContextMenu from "@/features/ui/CfContextMenu";
import { emitAppToast } from "@/lib/ui/appToast";

type VaultMiniCardProps = {
  entry: VaultCardEntry;
  parked?: boolean;
  onParkedChange?: () => void;
};

/**
 * Draggable Lore Vault chess piece with the shared CF context menu.
 */
export default function VaultMiniCard({
  entry,
  parked = false,
  onParkedChange,
}: VaultMiniCardProps) {
  const { setDragging, refreshEntries } = useVaultDrawer();
  const visual = ciClassVisual(entry.ciClass);
  const [confirmPurge, setConfirmPurge] = useState(false);

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
          parentId: "lore-vault",
          parentCiClass: null,
          slot: "vault",
          holdKind: "park",
          relationshipId: entry.id,
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

  const onConfirmPurge = async () => {
    setConfirmPurge(false);
    const result = await removeFileFromVault(entry.id, true, {
      title: entry.title,
      sourceSrdEntityId: entry.sourceSrdEntityId,
    });
    if (!result.ok) {
      emitAppToast(result.error, "warn");
    } else {
      emitAppToast(result.message, "success");
      onParkedChange?.();
      void refreshEntries();
    }
  };

  return (
    <>
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
        onDelete={parked ? () => setConfirmPurge(true) : undefined}
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
        ]}
      >
        {(bind) => (
          <li
            className="vault-mini-card"
            draggable
            {...bind}
            onDragStart={(event: DragEvent<HTMLLIElement>) => {
              setVaultDragData(event.dataTransfer, payload);
              setDragging(payload);
              event.dataTransfer.effectAllowed = "copyMove";
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
                  <span className="ml-1 text-[10px] font-normal text-[var(--accent)]">parked</span>
                ) : null}
              </p>
              <p className="vault-mini-card-meta">
                {fantasyCiLabel(entry.ciClass)} · {(entry.detail || "").slice(0, 48)}
              </p>
            </button>
            <span className="vault-mini-card-grip" aria-hidden="true">
              ⠿
            </span>
          </li>
        )}
      </CfContextMenu>

      {confirmPurge ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`purge-vault-${entry.id}`}
          onClick={() => setConfirmPurge(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border p-4 shadow-xl"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={`purge-vault-${entry.id}`}
              className="text-sm font-bold text-[var(--text)]"
            >
              Purge from Vault?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-soft)]">
              Remove <span className="text-[var(--text)]">{entry.title}</span> from the Lore
              Vault? It will no longer appear here. The Library original (if any) is not
              deleted — drop it into “Park” again if you want it back in the vault.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setConfirmPurge(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: "#7a2828", color: "#fff", borderColor: "#7a2828" }}
                onClick={() => void onConfirmPurge()}
              >
                Purge from Vault
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
