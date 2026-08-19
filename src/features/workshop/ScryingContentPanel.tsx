"use client";

import ScryingGlassIcon from "@/features/ui/ScryingGlassIcon";
import WorkshopPreviewPanel from "@/features/workshop/WorkshopPreviewPanel";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import type { WorkshopPreviewSnapshot } from "@/lib/workshop/previewSnapshot";

export type ScryingContentPanelProps = {
  snapshot: WorkshopPreviewSnapshot;
  /** Popup routes edit/save through postMessage; inline uses callbacks. */
  variant: "inline" | "popup";
  onClose?: () => void;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: (selectedIndices: number[]) => void;
  onLoadPartyVtt?: () => void;
  onSaveToLibrary?: () => void;
};

/** Shared Scrying Glass body — popup modal or Library inline panel. */
export default function ScryingContentPanel({
  snapshot,
  variant,
  onClose,
  onEdit,
  onEditSeed,
  onEditResult,
  onSavePartyVtt,
  onLoadPartyVtt,
  onSaveToLibrary,
}: ScryingContentPanelProps) {
  const popupMode = variant === "popup";
  const frameClass =
    variant === "inline"
      ? "library-inline-scrying-frame scrying-glass-frame"
      : "preview-window-frame scrying-glass-frame scrying-glass-popup-frame";

  return (
    <div className={`${frameClass} flex min-h-0 flex-1 flex-col`}>
      <header
        className="preview-window-titlebar scrying-glass-titlebar shrink-0"
        aria-label={`${PREVIEW_WINDOW} title bar`}
      >
        <ScryingGlassIcon size={variant === "inline" ? 20 : 24} className="scrying-glass-titlebar-icon" />
        <p className="preview-window-titlebar-label min-w-0 truncate">
          D&amp;D EASY — {PREVIEW_WINDOW}
        </p>
        {variant === "popup" ? (
          <button
            type="button"
            className="scrying-glass-dismiss-btn"
            aria-label={`Close ${PREVIEW_WINDOW}`}
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : onClose ? (
          <button
            type="button"
            className="scrying-glass-dismiss-btn"
            aria-label="Close scrying panel"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
      </header>
      <div className="preview-window-body scrying-glass-body flex min-h-0 flex-1 flex-col">
        {popupMode ? (
          <p className="scrying-glass-hint no-print shrink-0">
            Review output here. Edit and save still apply in the Fantasy Forge workspace.
          </p>
        ) : null}
        <div className="scrying-glass-content-wrap flex min-h-0 flex-1 flex-col">
          <WorkshopPreviewPanel
            snapshot={snapshot}
            popupMode={popupMode}
            onEdit={onEdit}
            onEditSeed={onEditSeed}
            onEditResult={onEditResult}
            onSavePartyVtt={onSavePartyVtt}
            onLoadPartyVtt={onLoadPartyVtt}
            onSaveToLibrary={onSaveToLibrary}
          />
        </div>
      </div>
    </div>
  );
}
