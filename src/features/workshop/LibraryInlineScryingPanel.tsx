"use client";

import ScryingContentPanel from "@/features/workshop/ScryingContentPanel";
import ScryingGlassIcon from "@/features/ui/ScryingGlassIcon";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import type { WorkshopPreviewSnapshot } from "@/lib/workshop/previewSnapshot";

export type LibraryInlineScryingPanelProps = {
  snapshot: WorkshopPreviewSnapshot | null;
  hasSelection: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: (selectedIndices: number[]) => void;
  onLoadPartyVtt?: () => void;
};

export default function LibraryInlineScryingPanel({
  snapshot,
  hasSelection,
  onClose,
  onEdit,
  onEditSeed,
  onEditResult,
  onSavePartyVtt,
  onLoadPartyVtt,
}: LibraryInlineScryingPanelProps) {
  if (!hasSelection || !snapshot) {
    return (
      <div
        className="library-inline-scrying-empty flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.04)" }}
      >
        <ScryingGlassIcon size={40} className="opacity-80" />
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-[var(--text)]">{PREVIEW_WINDOW}</p>
          <p className="max-w-[16rem] text-xs leading-relaxed text-[var(--muted)]">
            Select a creation file or SRD entry from the stacks to scry its details here — no popup
            required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScryingContentPanel
      snapshot={snapshot}
      variant="inline"
      onClose={onClose}
      onEdit={onEdit}
      onEditSeed={onEditSeed}
      onEditResult={onEditResult}
      onSavePartyVtt={onSavePartyVtt}
      onLoadPartyVtt={onLoadPartyVtt}
    />
  );
}
