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
  accepts?: CiClass[];
  className?: string;
  compact?: boolean;
  children?: ReactNode;
  onDropPayload: (
    payload: VaultDragPayload,
  ) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;
};

/**
 * Highlighted HTML5 drop target for ContainerCF slots.
 * Outline/ring only (no layout shift). Registers with the global vault bus.
 *
 * Registration is keyed only by `zoneId` — accepts/label/handler live in refs
 * so parent re-renders (new array literals) cannot thrash the vault context.
 */
export default function ContainerDropZone({
  zoneId,
  label,
  hint,
  accepts,
  className = "",
  compact = false,
  children,
  onDropPayload,
}: ContainerDropZoneProps) {
  const { setDragging, registerDropZone, unregisterDropZone, dragging } = useVaultDrawer();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlerRef = useRef(onDropPayload);
  handlerRef.current = onDropPayload;
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;
  const labelRef = useRef(label);
  labelRef.current = label;

  useEffect(() => {
    registerDropZone({
      zoneId,
      label: labelRef.current,
      accepts: acceptsRef.current,
      handler: async (payload) => handlerRef.current(payload),
    });
    return () => unregisterDropZone(zoneId);
  }, [zoneId, registerDropZone, unregisterDropZone]);

  const showTarget = Boolean(dragging);
  const acceptsDrag =
    !accepts || !dragging ? true : accepts.includes(dragging.ciClass);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!vaultDragHasPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setActive(false);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActive(false);
    const payload = readAnyVaultDragData(event.dataTransfer);
    setDragging(null);
    if (!payload) return;
    if (accepts && !accepts.includes(payload.ciClass)) {
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
          ? `Dropped ${payload.title}.`
          : "Drop failed.",
    );
    window.setTimeout(() => setMessage(null), 3200);
  };

  return (
    <div
      className={`container-drop-zone relative rounded-lg border-2 border-dashed transition ${
        compact ? "p-2" : "p-3"
      } ${active ? "ring-2 ring-[var(--accent)]" : ""} ${className}`}
      style={{
        borderColor: active
          ? "var(--accent)"
          : showTarget && acceptsDrag
            ? "var(--accent-dim)"
            : "var(--border)",
        background: active ? "var(--accent-dim)" : "transparent",
      }}
      data-zone-id={zoneId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">{label}</p>
        {hint ? <p className="text-[10px] text-[var(--text-soft)]">{hint}</p> : null}
      </div>
      {children}
      {message ? (
        <p className="mt-2 text-[11px] text-[var(--accent)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
