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

export const PREVIEW_READY_MESSAGE = "ddeasy-preview-ready";

function writePreviewStorage(snapshot: WorkshopPreviewSnapshot): void {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}

export function publishPreviewSnapshot(snapshot: WorkshopPreviewSnapshot): void {
  if (typeof window === "undefined") return;
  writePreviewStorage(snapshot);
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
    const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkshopPreviewSnapshot;
  } catch {
    return null;
  }
}

/** Ask the main Fantasy Forge tab to republish the current preview snapshot. */
export function notifyPreviewWindowReady(): void {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
    channel.postMessage({ type: PREVIEW_READY_MESSAGE });
    channel.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
  }
}

export function isPreviewReadyMessage(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as { type?: string }).type === PREVIEW_READY_MESSAGE
  );
}

export function isPreviewSnapshotMessage(data: unknown): data is WorkshopPreviewSnapshot {
  return typeof data === "object" && data !== null && "markdown" in data;
}

let previewWindowRef: Window | null = null;

export function openOrFocusPreviewWindow(): Window | null {
  if (typeof window === "undefined") return null;
  if (previewWindowRef && !previewWindowRef.closed) {
    previewWindowRef.focus();
    return previewWindowRef;
  }
  // Omit noopener so the preview tab can request resync and post edit actions.
  previewWindowRef = window.open("/preview", PREVIEW_WINDOW_NAME);
  return previewWindowRef;
}

export function postPreviewAction(action: PreviewAction, payload?: unknown): void {
  if (typeof window === "undefined" || !window.opener) return;
  window.opener.postMessage({ type: "ddeasy-preview-action", action, payload }, window.location.origin);
}
