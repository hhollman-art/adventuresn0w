"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ScryingContentPanel from "@/features/workshop/ScryingContentPanel";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
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

const CLOSE_MS = 140;

export default function ScryingGlassPopup() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkshopPreviewSnapshot>(EMPTY_SNAPSHOT);

  const close = useCallback(() => {
    setClosing(true);
    setRevealed(false);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  }, []);

  const openPopup = useCallback(() => {
    const stored = readPreviewSnapshot();
    if (stored) setSnapshot(stored);
    setClosing(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    setMounted(true);
    return subscribeScryingGlassOpen(openPopup);
  }, [openPopup]);

  useEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPreviewAction = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "ddeasy-preview-action") close();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onPreviewAction);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onPreviewAction);
      channel?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  const motionClass = revealed && !closing ? "is-open" : closing ? "is-closing" : "";

  return createPortal(
    <div
      className={`scrying-glass-backdrop no-print ${motionClass}`.trim()}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className={`scrying-glass-popup-shell ${motionClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={PREVIEW_WINDOW}
      >
        <ScryingContentPanel snapshot={snapshot} variant="popup" onClose={close} />
      </div>
    </div>,
    document.body,
  );
}
