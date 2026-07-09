"use client";

import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
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
import { removeFileFromVault } from "@/lib/vault/removeFileFromVault";

type VaultMiniCardProps = {
  entry: VaultCardEntry;
  parked?: boolean;
  onParkedChange?: () => void;
};

/**
 * Draggable Lore Vault chess piece with context menu:
 * Copy / Move / Unlink / Purge from Vault.
 */
export default function VaultMiniCard({
  entry,
  parked = false,
  onParkedChange,
}: VaultMiniCardProps) {
  const { setDragging, refreshEntries } = useVaultDrawer();
  const visual = ciClassVisual(entry.ciClass);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
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

  const closeMenu = () => setMenu(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const onContextMenu = (event: MouseEvent<HTMLLIElement>) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const onCopy = async () => {
    closeMenu();
    if (entry.ciClass === "item.equipment" || entry.ciClass === "item.magic") {
      const result = await cloneLibraryItemAsHomebrew(entry.id);
      setStatus(result.ok ? `Copied ${entry.title}.` : result.error);
      if (result.ok) void refreshEntries();
    } else {
      setStatus("Copy duplicates Library items — use Create New for other CF types.");
    }
    window.setTimeout(() => setStatus(null), 2800);
  };

  const onUnlink = async () => {
    closeMenu();
    if (!parked) {
      setStatus("Not parked — Library originals stay in The Library.");
      window.setTimeout(() => setStatus(null), 2800);
      return;
    }
    const result = await unlinkFromVaultParking(entry.id);
    setStatus(result.ok ? result.message : result.error);
    onParkedChange?.();
    window.setTimeout(() => setStatus(null), 2800);
  };

  const onRequestPurge = () => {
    closeMenu();
    setConfirmPurge(true);
  };

  const onConfirmPurge = async () => {
    setConfirmPurge(false);
    const result = await removeFileFromVault(entry.id, true, {
      title: entry.title,
      sourceSrdEntityId: entry.sourceSrdEntityId,
    });
    if (!result.ok) {
      setStatus(result.error);
    } else {
      setStatus(result.message);
      onParkedChange?.();
      void refreshEntries();
    }
    window.setTimeout(() => setStatus(null), 3200);
  };

  return (
    <>
      <li
        className="vault-mini-card"
        draggable
        onDragStart={(event: DragEvent<HTMLLIElement>) => {
          setVaultDragData(event.dataTransfer, payload);
          setDragging(payload);
          event.dataTransfer.effectAllowed = "copyMove";
        }}
        onDragEnd={() => setDragging(null)}
        onContextMenu={onContextMenu}
      >
        <span className="vault-mini-card-icon" style={{ color: visual.accent }} aria-hidden="true">
          {visual.icon}
        </span>
        <div className="vault-mini-card-copy min-w-0">
          <p className="vault-mini-card-title">
            {entry.title}
            {parked ? (
              <span className="ml-1 text-[10px] font-normal text-[var(--accent)]">parked</span>
            ) : null}
          </p>
          <p className="vault-mini-card-meta">
            {fantasyCiLabel(entry.ciClass)} · {(entry.detail || "").slice(0, 48)}
          </p>
          {status ? <p className="text-[10px] text-[var(--accent)]">{status}</p> : null}
        </div>
        <span className="vault-mini-card-grip" aria-hidden="true">
          ⠿
        </span>
      </li>

      {menu ? (
        <div
          className="fixed z-[100] min-w-[11rem] rounded-md border py-1 shadow-xl"
          style={{
            left: menu.x,
            top: menu.y,
            background: "var(--panel)",
            borderColor: "var(--border)",
          }}
          role="menu"
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--accent-dim)]"
            role="menuitem"
            onClick={() => void onCopy()}
          >
            Copy (homebrew duplicate)
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--accent-dim)]"
            role="menuitem"
            onClick={() => {
              closeMenu();
              setStatus("Drag this card onto a Campaign, Character sheet, or Virtual Table.");
              window.setTimeout(() => setStatus(null), 3200);
            }}
          >
            Move (drag to container)
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--accent-dim)]"
            role="menuitem"
            onClick={() => void onUnlink()}
          >
            {parked ? "Unlink from vault parking" : "Unlink (not parked)"}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-red-300 hover:bg-[var(--accent-dim)]"
            role="menuitem"
            onClick={onRequestPurge}
          >
            Purge from Vault
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text-soft)] hover:bg-[var(--accent-dim)]"
            role="menuitem"
            onClick={closeMenu}
          >
            Cancel
          </button>
        </div>
      ) : null}

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
