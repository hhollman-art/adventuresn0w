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
  onSaveToLibrary?: () => void;
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
  onSaveToLibrary,
}: LibraryInlineScryingPanelProps) {
  if (!hasSelection || !snapshot) {
    return (
      <div
        className="library-inline-scrying-empty flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center"
      >
        <ScryingGlassIcon size={40} className="opacity-90" />
        <div className="space-y-1">
          <p className="font-display text-sm font-semibold text-slate-100">{PREVIEW_WINDOW}</p>
          <p className="max-w-[16rem] text-xs leading-relaxed text-slate-400">
            Select a creation file or included rule from the stacks to open it in the Scrying Glass.
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
      onSaveToLibrary={onSaveToLibrary}
    />
  );
}
