import type { LibraryImage } from "@/lib/generationLibrary";

export const PREVIEW_SYNC_CHANNEL = "ddeasy-preview-sync";
export const PREVIEW_STORAGE_KEY = "ddeasy-preview-snapshot";
export const PREVIEW_WINDOW_NAME = "ddeasy-preview";

export type WorkshopPreviewSnapshot = {
  markdown: string;
  images: LibraryImage[];
  textModel: string | null;
  imageModel: string | null;
  outputLayoutKind: string;
  workspace: string;
  isLibraryView: boolean;
  viewingLabel: string | null;
  viewingSubline: string | null;
  progressStage: string;
  loading: boolean;
  imageLoading: boolean;
  error: string | null;
  imageError: string | null;
  partySaveMessage: string | null;
  srdLoading: boolean;
  autoMapEnabled: boolean;
  autoPropsEnabled: boolean;
  isSrdPreview: boolean;
  canEdit: boolean;
  editKind: "none" | "result" | "seed" | "library-result";
  showSavePartyVtt: boolean;
  showLoadPartyVtt: boolean;
  viewingPartyId: string | null;
  updatedAt: string;
};

export type PreviewAction =
  | "edit"
  | "edit-seed"
  | "edit-result"
  | "save-party-vtt"
  | "load-party-vtt";

export function publishPreviewSnapshot(snapshot: WorkshopPreviewSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
  try {
    const channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
    channel.postMessage(snapshot);
    channel.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
}

export function readPreviewSnapshot(): WorkshopPreviewSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkshopPreviewSnapshot;
  } catch {
    return null;
  }
}

let previewWindowRef: Window | null = null;

export function openOrFocusPreviewWindow(): Window | null {
  if (typeof window === "undefined") return null;
  if (previewWindowRef && !previewWindowRef.closed) {
    previewWindowRef.focus();
    return previewWindowRef;
  }
  // Omit width/height so the browser opens a normal tab (not a blocked popup).
  previewWindowRef = window.open(
    "/preview",
    PREVIEW_WINDOW_NAME,
    "noopener,noreferrer",
  );
  return previewWindowRef;
}

export function postPreviewAction(action: PreviewAction, payload?: unknown): void {
  if (typeof window === "undefined" || !window.opener) return;
  window.opener.postMessage({ type: "ddeasy-preview-action", action, payload }, window.location.origin);
}
