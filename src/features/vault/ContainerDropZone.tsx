"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { CiClass } from "@/lib/ciRegistry";
import {
  readAnyVaultDragData,
  vaultDragHasPayload,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { evictFromVaultAfterSuccessfulDrop } from "@/lib/vault/removeFileFromVault";

export type ContainerDropZoneProps = {
  zoneId: string;
  label: string;
  hint?: string;
  /** Optional emoji/icon shown beside the label. */
  icon?: string;
  accepts?: CiClass[];
  /**
   * When true (Campaign Builder default), any vault CF drag may hover/drop —
   * the parent write path auto-routes by `ciClass` if this zone is a mismatch.
   */
  softAccept?: boolean;
  className?: string;
  /** Idle (non-hover) surface — Campaign Builder uses high-contrast slate panels. */
  panelClassName?: string;
  compact?: boolean;
  /** Hide the built-in label row when the parent renders its own header. */
  hideHeader?: boolean;
  children?: ReactNode;
  onDropPayload: (
    payload: VaultDragPayload,
  ) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;
};

/**
 * Reusable HTML5 drop target for Campaign Builder zones, Lore Vault slots,
 * and other ContainerCF surfaces.
 *
 * Uses `VaultDrawerContext.dragging` / `peekDragging` when present (cross-panel)
 * and falls back to `dataTransfer` so Library → Campaign drops still call
 * preventDefault on dragover even when custom MIME types are partially hidden.
 */
export default function ContainerDropZone({
  zoneId,
  label,
  hint,
  icon,
  accepts,
  softAccept = false,
  className = "",
  panelClassName = "border-[var(--border)] bg-transparent",
  compact = false,
  hideHeader = false,
  children,
  onDropPayload,
}: ContainerDropZoneProps) {
  const {
    setDragging,
    peekDragging,
    registerDropZone,
    unregisterDropZone,
    dragging,
    dropHoverZoneId,
    setDropHoverZoneId,
  } = useVaultDrawer();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dragDepthRef = useRef(0);
  const hoverPayloadRef = useRef<VaultDragPayload | null>(null);

  const handlerRef = useRef(onDropPayload);
  handlerRef.current = onDropPayload;
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;
  const labelRef = useRef(label);
  labelRef.current = label;
  const softAcceptRef = useRef(softAccept);
  softAcceptRef.current = softAccept;

  useEffect(() => {
    registerDropZone({
      zoneId,
      label: labelRef.current,
      accepts: softAcceptRef.current ? undefined : acceptsRef.current,
      handler: async (payload) => handlerRef.current(payload),
    });
    return () => unregisterDropZone(zoneId);
  }, [zoneId, registerDropZone, unregisterDropZone]);

  const showTarget = Boolean(dragging);
  const acceptsDrag =
    softAccept || !accepts || !dragging ? true : accepts.includes(dragging.ciClass);
  const isHovered = active || dropHoverZoneId === zoneId;

  const canAcceptEvent = (dataTransfer: DataTransfer): boolean => {
    const live = dragging ?? peekDragging();
    if (live) {
      if (!softAccept && accepts && !accepts.includes(live.ciClass)) return false;
      return true;
    }
    return vaultDragHasPayload(dataTransfer);
  };

  const clearHover = () => {
    dragDepthRef.current = 0;
    setActive(false);
    setDropHoverZoneId(null);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!canAcceptEvent(event.dataTransfer)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setActive(true);
    setDropHoverZoneId(zoneId);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canAcceptEvent(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "link";
    hoverPayloadRef.current = dragging ?? peekDragging();
    if (!active) setActive(true);
    if (dropHoverZoneId !== zoneId) setDropHoverZoneId(zoneId);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) clearHover();
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    clearHover();
    const fromTransfer = readAnyVaultDragData(event.dataTransfer);
    const payload = fromTransfer ?? hoverPayloadRef.current ?? peekDragging();
    hoverPayloadRef.current = null;
    setDragging(null);
    if (!payload?.id || !payload.ciClass || !payload.title) {
      setMessage("Could not read that Creation File card.");
      window.setTimeout(() => setMessage(null), 2800);
      return;
    }
    if (!softAccept && accepts && !accepts.includes(payload.ciClass)) {
      setMessage("This zone does not accept that card type.");
      window.setTimeout(() => setMessage(null), 2800);
      return;
    }
    const result = await handlerRef.current(payload);
    const ok = !result || result.ok !== false;
    if (ok && payload.container?.holdKind === "park") {
      await evictFromVaultAfterSuccessfulDrop(payload.id, true);
    }
    setMessage(
      result && typeof result === "object" && "message" in result && result.message
        ? String(result.message)
        : ok
          ? `Linked ${payload.title}.`
          : "Drop failed.",
    );
    window.setTimeout(() => setMessage(null), 3200);
  };

  return (
    <div
      className={[
        "container-drop-zone relative rounded-lg border-2 border-dashed transition-colors",
        compact ? "p-2" : "p-3",
        className,
        isHovered
          ? "border-amber-400 bg-amber-500/10"
          : showTarget && acceptsDrag
            ? "border-amber-400/40 bg-amber-500/5"
            : panelClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      data-zone-id={zoneId}
      data-drop-active={isHovered ? "true" : "false"}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      {!hideHeader ? (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#F0F6FC]">
            {icon ? (
              <span className="mr-1.5 inline-block" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            {label}
          </p>
          {hint ? <p className="text-[10px] text-slate-400">{hint}</p> : null}
        </div>
      ) : null}
      {children}
      {message ? (
        <p className="mt-2 text-[11px] text-[var(--dmms-accent,#e3b341)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
