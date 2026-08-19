"use client";

import { useCallback, useEffect, useState } from "react";
import ScryingContentPanel from "@/features/workshop/ScryingContentPanel";
import LibraryInlineScryingPanel from "@/features/workshop/LibraryInlineScryingPanel";
import {
  useCommandCenterActionsOptional,
  useLibraryInspectorOptional,
} from "@/contexts/CommandCenterContext";
import {
  isPreviewSnapshotMessage,
  PREVIEW_SYNC_CHANNEL,
  readPreviewSnapshot,
  PREVIEW_STORAGE_KEY,
  subscribeScryingGlassOpen,
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
  showPrimaryCommit: false,
  primaryCommitLabel: "Save to Library",
  updatedAt: new Date(0).toISOString(),
};

function snapshotHasContent(snapshot: WorkshopPreviewSnapshot | null): boolean {
  if (!snapshot) return false;
  return Boolean(
    snapshot.markdown.trim() ||
      snapshot.images.length ||
      snapshot.loading ||
      snapshot.srdLoading ||
      snapshot.viewingLabel,
  );
}

/** Persistent right-rail Scrying inspector — not a blocking modal. */
export default function ScryingGlassPopup() {
  const actions = useCommandCenterActionsOptional();
  const library = useLibraryInspectorOptional();
  const setInspectorOpen = actions?.setInspectorOpen;
  const [snapshot, setSnapshot] = useState<WorkshopPreviewSnapshot>(EMPTY_SNAPSHOT);

  const collapse = useCallback(() => {
    setInspectorOpen?.(false);
  }, [setInspectorOpen]);

  const reveal = useCallback(() => {
    const stored = readPreviewSnapshot();
    if (stored) setSnapshot(stored);
    setInspectorOpen?.(true);
  }, [setInspectorOpen]);

  useEffect(() => {
    const stored = readPreviewSnapshot();
    if (stored) setSnapshot(stored);
    return subscribeScryingGlassOpen(reveal);
  }, [reveal]);

  useEffect(() => {
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

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, []);

  if (library) {
    return (
      <LibraryInlineScryingPanel
        snapshot={library.snapshot}
        hasSelection={library.hasSelection}
        onClose={collapse}
        onEdit={library.onEdit}
        onEditSeed={library.onEditSeed}
        onEditResult={library.onEditResult}
        onSavePartyVtt={library.onSavePartyVtt}
        onLoadPartyVtt={library.onLoadPartyVtt}
        onSaveToLibrary={library.onSaveToLibrary}
      />
    );
  }

  if (!snapshotHasContent(snapshot)) {
    return (
      <LibraryInlineScryingPanel snapshot={null} hasSelection={false} onClose={collapse} />
    );
  }

  return (
    <ScryingContentPanel
      snapshot={snapshot}
      variant="popup"
      onClose={collapse}
    />
  );
}
