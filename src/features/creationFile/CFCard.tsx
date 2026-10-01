"use client";

import type { DragEvent, ReactNode } from "react";
import type { CreationFile } from "@/lib/creationFile/types";
import type { CiClass } from "@/lib/ciRegistry";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import {
  setVaultDragData,
  withContainerContext,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import { useVaultDrawerOptional } from "@/contexts/VaultDrawerContext";

export type CFCardProps = {
  card: CreationFile;
  /** When false, the card is not a drag source (default true). */
  draggable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  /** Extra actions (edit, download, delete) rendered below the title block. */
  actions?: ReactNode;
  /** Parent container id stamped onto drag payloads (e.g. "tavern"). */
  dragParentId?: string | null;
  className?: string;
};

/**
 * Standardized, draggable Creation File card — Tavern / Vault / Campaign slots.
 * Persistence stays in storage modules; this is the shared view shell.
 */
export default function CFCard({
  card,
  draggable: canDrag = true,
  selected = false,
  onSelect,
  onOpen,
  actions,
  dragParentId = null,
  className = "",
}: CFCardProps) {
  const vault = useVaultDrawerOptional();
  const visual = ciClassVisual(card.ciClass);
  const ciClass = card.ciClass as CiClass;

  const startDrag = (event: DragEvent) => {
    if (!canDrag) return;
    const payload: VaultDragPayload = withContainerContext(
      {
        vaultKind: "cf",
        id: card.id,
        ciClass,
        title: card.title,
        detail: card.subtitle ?? "",
      },
      {
        parentId: dragParentId,
        parentCiClass: null,
        slot: null,
        holdKind: null,
      },
    );
    setVaultDragData(event.dataTransfer, payload);
    vault?.setDragging(payload);
    event.dataTransfer.effectAllowed = "all";
  };

  return (
    <article
      draggable={canDrag}
      onDragStart={startDrag}
      onDragEnd={() => vault?.setDragging(null)}
      onDoubleClick={onOpen}
      className={`cf-card workshop-campaign-card rounded-xl border p-3 text-sm ${className}`}
      style={{
        borderColor: selected ? "var(--accent)" : visual.accent,
        borderLeftWidth: 3,
      }}
      data-ci-class={card.ciClass}
      data-cf-id={card.id}
      title={canDrag ? "Drag into a campaign slot or the Lore Vault" : undefined}
    >
      <div className="flex items-start gap-2">
        {onSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1"
            aria-label={`Select ${card.title}`}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ borderColor: visual.accent, color: visual.accent }}
            >
              <span aria-hidden="true">{visual.icon}</span>
              {fantasyCiLabel(ciClass)}
            </span>
            {canDrag ? (
              <span className="text-[10px] text-[var(--text-soft)]">⠿ drag</span>
            ) : null}
          </div>
          <p className="mt-1 font-bold text-[var(--text)]">{card.title}</p>
          {card.subtitle ? (
            <p className="text-xs text-[var(--text-soft)]">{card.subtitle}</p>
          ) : null}
          {card.tags.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-1">
              {card.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded border px-1.5 py-0.5 text-[10px] text-[var(--text-soft)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {tag}
                </span>
              ))}
            </p>
          ) : null}
          {actions ? <div className="mt-2 flex flex-wrap gap-1.5">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}
