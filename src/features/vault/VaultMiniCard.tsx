"use client";

import type { DragEvent } from "react";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import {
  readAnyVaultDragData,
  setVaultDragData,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import type { VaultCardEntry } from "@/lib/vault/loadVaultEntries";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";

type VaultMiniCardProps = {
  entry: VaultCardEntry;
};

export default function VaultMiniCard({ entry }: VaultMiniCardProps) {
  const { setDragging } = useVaultDrawer();
  const visual = ciClassVisual(entry.ciClass);

  const payload: VaultDragPayload = {
    vaultKind: "cf",
    id: entry.id,
    ciClass: entry.ciClass,
    title: entry.title,
    detail: entry.detail,
  };

  return (
    <li
      className="vault-mini-card"
      draggable
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
      <div className="vault-mini-card-copy min-w-0">
        <p className="vault-mini-card-title">{entry.title}</p>
        <p className="vault-mini-card-meta">
          {fantasyCiLabel(entry.ciClass)} · {entry.detail.slice(0, 48)}
        </p>
      </div>
      <span className="vault-mini-card-grip" aria-hidden="true">
        ⠿
      </span>
    </li>
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

export { readAnyVaultDragData };
