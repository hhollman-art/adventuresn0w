"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { CiClass } from "@/lib/ciRegistry";
import {
  linkDropEffectFor,
  readAnyVaultDragData,
  vaultDragHasPayload,
  type VaultDragPayload,
} from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { evictFromVaultAfterSuccessfulDrop } from "@/lib/vault/removeFileFromVault";
import { isLoreVaultDragPayload } from "@/lib/vault/loreVaultContainer";

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
  const [saving, setSaving] = useState(false);
  const hoverPayloadRef = useRef<VaultDragPayload | null>(null);
  const messageTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    },
    [],
  );

  const flash = (text: string, ms = 3200) => {
    setMessage(text);
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(null), ms);
  };

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
    setActive(false);
    setDropHoverZoneId(null);
  };

  const markHover = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = linkDropEffectFor(event.dataTransfer.effectAllowed);
    hoverPayloadRef.current = dragging ?? peekDragging();
    if (!active) setActive(true);
    if (dropHoverZoneId !== zoneId) setDropHoverZoneId(zoneId);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!canAcceptEvent(event.dataTransfer)) return;
    markHover(event);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canAcceptEvent(event.dataTransfer)) return;
    markHover(event);
  };

  // Moving between child cards fires leave/enter pairs; only a leave whose next
  // target is outside the zone (or unknown) clears the highlight. dragover re-arms it.
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    clearHover();
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
      flash("Could not read that Creation File card.", 2800);
      return;
    }
    if (!softAccept && accepts && !accepts.includes(payload.ciClass)) {
      flash("This zone does not accept that card type.", 2800);
      return;
    }
    setSaving(true);
    setMessage(`Saving ${payload.title}…`);
    try {
      const result = await handlerRef.current(payload);
      const ok = !result || result.ok !== false;
      if (ok && isLoreVaultDragPayload(payload)) {
        await evictFromVaultAfterSuccessfulDrop(payload.id, true);
      }
      flash(
        result && typeof result === "object" && "message" in result && result.message
          ? String(result.message)
          : ok
            ? `Linked ${payload.title}.`
            : "Drop failed.",
      );
    } catch {
      flash(`Could not save ${payload.title} — try the drop again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={[
        "container-drop-zone relative rounded-lg border-2 border-dashed transition-colors",
        compact ? "p-2" : "p-3",
        className,
        isHovered
          ? "border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/30"
          : showTarget && acceptsDrag
            ? "border-sky-400/50 bg-sky-500/5"
            : panelClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      data-zone-id={zoneId}
      data-drop-active={isHovered ? "true" : "false"}
      aria-busy={saving || undefined}
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
