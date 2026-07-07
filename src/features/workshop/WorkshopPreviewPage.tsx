"use client";

import { useEffect, useState } from "react";
import WorkshopPreviewPanel from "@/features/workshop/WorkshopPreviewPanel";
import ScryingGlassIcon from "@/features/ui/ScryingGlassIcon";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import {
  isPreviewSnapshotMessage,
  notifyPreviewWindowReady,
  PREVIEW_SYNC_CHANNEL,
  readPreviewSnapshot,
  PREVIEW_STORAGE_KEY,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";

const EMPTY_SNAPSHOT: WorkshopPreviewSnapshot = {
  markdown: "",
  images: [],
  textModel: null,
  imageModel: null,
  outputLayoutKind: "adventure",
  workspace: "adventure",
  isLibraryView: false,
  viewingLabel: null,
  viewingSubline: null,
  ciClass: null,
  progressStage: "idle",
  loading: false,
  imageLoading: false,
  error: null,
  imageError: null,
  partySaveMessage: null,
  srdLoading: false,
  autoMapEnabled: false,
  autoPropsEnabled: false,
  isSrdPreview: false,
  canEdit: false,
  editKind: "none",
  showSavePartyVtt: false,
  showLoadPartyVtt: false,
  viewingPartyId: null,
  updatedAt: new Date(0).toISOString(),
};

export default function WorkshopPreviewPage() {
  const [snapshot, setSnapshot] = useState<WorkshopPreviewSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    document.documentElement.dataset.previewWindow = "standalone";
    return () => {
      delete document.documentElement.dataset.previewWindow;
    };
  }, []);

  useEffect(() => {
    const next = readPreviewSnapshot();
    if (next) setSnapshot(next);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREVIEW_STORAGE_KEY) return;
      const stored = readPreviewSnapshot();
      if (stored) setSnapshot(stored);
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (isPreviewSnapshotMessage(event.data)) setSnapshot(event.data);
      };
    } catch {
      /* ignore */
    }

    notifyPreviewWindowReady();

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, []);

  return (
    <div className="preview-window-frame scrying-glass-frame is-open">
      <header className="preview-window-titlebar scrying-glass-titlebar no-print" aria-label={`${PREVIEW_WINDOW} title bar`}>
        <ScryingGlassIcon size={24} className="scrying-glass-titlebar-icon" />
        <p className="preview-window-titlebar-label">
          D&amp;D EASY — {PREVIEW_WINDOW}
        </p>
      </header>
      <div className="preview-window-body scrying-glass-body flex min-h-0 flex-1 flex-col">
        <p className="scrying-glass-hint no-print shrink-0">
          Review output here. Edit and save actions run in the main Fantasy Forge tab.
        </p>
        <div className="scrying-glass-content-wrap flex min-h-0 flex-1 flex-col">
          <WorkshopPreviewPanel snapshot={snapshot} popupMode />
        </div>
      </div>
    </div>
  );
}

