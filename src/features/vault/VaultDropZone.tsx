"use client";

import type { DragEvent, ReactNode } from "react";
import { useState } from "react";
import type { CiClass } from "@/lib/ciRegistry";
import { readAnyVaultDragData, vaultDragHasPayload } from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import { evictFromVaultAfterSuccessfulDrop } from "@/lib/vault/removeFileFromVault";

type VaultDropZoneProps = {
  zoneId: string;
  label: string;
  hint?: string;
  accepts?: CiClass[];
  className?: string;
  compact?: boolean;
  children?: ReactNode;
};

/**
 * Visual drop target for vault cards — chess-piece style deployment into a workspace.
 */
export default function VaultDropZone({
  zoneId,
  label,
  hint,
  accepts,
  className = "",
  compact = false,
  children,
}: VaultDropZoneProps) {
  const { dragging, handleDrop, setDragging } = useVaultDrawer();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const showTarget = Boolean(dragging);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!vaultDragHasPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setActive(true);
  };

  const onDragLeave = () => setActive(false);

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActive(false);
    const payload = readAnyVaultDragData(event.dataTransfer);
    setDragging(null);
    if (!payload) return;
    if (accepts && !accepts.includes(payload.ciClass)) {
      setMessage("This zone does not accept that card type.");
      return;
    }
    const result = await handleDrop(zoneId, payload);
    if (result.ok && payload.container?.holdKind === "park") {
      await evictFromVaultAfterSuccessfulDrop(payload.id, true);
    }
    setMessage(result.ok ? `Deployed ${payload.title}.` : result.message ?? "Could not deploy.");
    window.setTimeout(() => setMessage(null), 3200);
  };

  return (
    <div
      className={`vault-drop-zone ${compact ? "vault-drop-zone--compact" : ""} ${showTarget ? "vault-drop-zone--armed" : ""} ${active ? "vault-drop-zone--active" : ""} ${className}`.trim()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => void onDrop(event)}
    >
      {children}
      {showTarget ? (
        <div className="vault-drop-zone-overlay" aria-hidden={!showTarget}>
          <p className="vault-drop-zone-label">{label}</p>
          {hint ? <p className="vault-drop-zone-hint">{hint}</p> : null}
        </div>
      ) : null}
      {message ? (
        <p className="vault-drop-zone-toast" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
