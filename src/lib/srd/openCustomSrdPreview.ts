"use client";

import type { SavedCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import {
  openOrFocusPreviewWindow,
  publishPreviewSnapshot,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";

function customSrdPreviewSnapshot(entry: SavedCustomSrdEntry): WorkshopPreviewSnapshot {
  return {
    markdown: entry.markdown,
    images: [],
    textModel: null,
    imageModel: null,
    outputLayoutKind: "adventure",
    workspace: "library",
    isLibraryView: true,
    viewingLabel: `Editing: ${entry.name}`,
    viewingSubline: "Your workspace copy — editable",
    ciClass: "rules.custom-entry",
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
    canEdit: true,
    editKind: "custom-srd",
    customSrdId: entry.id,
    showSavePartyVtt: false,
    showLoadPartyVtt: false,
    viewingPartyId: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Open the Scrying Glass on a user-owned SRD clone with editing enabled. */
export function openCustomSrdPreview(entry: SavedCustomSrdEntry): void {
  if (typeof window === "undefined") return;
  openOrFocusPreviewWindow();
  publishPreviewSnapshot(customSrdPreviewSnapshot(entry));
}

export { customSrdPreviewSnapshot };
