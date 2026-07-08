"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloneSrdCategoryToWorkspace,
  cloneSrdEntityToWorkspace,
  type CloneSrdResult,
} from "@/lib/srd/cloneSrdEntity";
import type { SrdEntityId, SrdEntityKind } from "@/lib/srd/types";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

type SrdCloneButtonProps = {
  entityId: SrdEntityId;
  entityName: string;
  /** Compact icon-style button for dense grids. */
  compact?: boolean;
  className?: string;
  onCloned?: (result: CloneSrdResult) => void;
  onError?: (message: string) => void;
};

export default function SrdCloneButton({
  entityId,
  entityName,
  compact = false,
  className = "",
  onCloned,
  onError,
}: SrdCloneButtonProps) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleClone = useCallback(async () => {
    setBusy(true);
    try {
      const result = await cloneSrdEntityToWorkspace(entityId, {
        userId: session?.dm.id ?? null,
      });
      onCloned?.(result);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not clone SRD entry.");
    } finally {
      setBusy(false);
    }
  }, [entityId, onCloned, onError, session?.dm.id]);

  const label = compact ? "Clone" : "Copy & Edit";

  return (
    <FantasyTooltipWrap
      label="Copy & Edit"
      hint={`Clone "${entityName}" into your editable workspace`}
    >
      <button
        type="button"
        className={
          className ||
          `btn btn-sm btn-accent${compact ? "" : ""}`
        }
        disabled={busy}
        onClick={() => void handleClone()}
      >
        {busy ? "Cloning…" : label}
      </button>
    </FantasyTooltipWrap>
  );
}

type SrdCloneCategoryButtonProps = {
  kind: SrdEntityKind;
  categoryLabel: string;
  entryCount: number;
  className?: string;
  onCloned?: (results: CloneSrdResult[]) => void;
  onError?: (message: string) => void;
};

export function SrdCloneCategoryButton({
  kind,
  categoryLabel,
  entryCount,
  className = "",
  onCloned,
  onError,
}: SrdCloneCategoryButtonProps) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleBulkClone = useCallback(async () => {
    if (entryCount === 0) return;
    setBusy(true);
    try {
      const results = await cloneSrdCategoryToWorkspace(kind, {
        userId: session?.dm.id ?? null,
      });
      onCloned?.(results);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Bulk clone failed.");
    } finally {
      setBusy(false);
    }
  }, [entryCount, kind, onCloned, onError, session?.dm.id]);

  return (
    <FantasyTooltipWrap
      label="Clone category"
      hint={`Copy all ${entryCount} ${categoryLabel.toLowerCase()} entries to your workspace`}
    >
      <button
        type="button"
        className={className || "btn btn-sm"}
        disabled={busy || entryCount === 0}
        onClick={() => void handleBulkClone()}
      >
        {busy ? "Cloning…" : `Clone all ${categoryLabel}`}
      </button>
    </FantasyTooltipWrap>
  );
}
