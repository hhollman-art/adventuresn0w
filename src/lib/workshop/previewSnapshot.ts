import type { CiClass } from "@/lib/ciRegistry";
import type { LibraryImage } from "@/lib/generationLibrary";
import type { InspectMeta } from "@/lib/workshop/inspectedEntity";

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
  /** CMDB Creation File class for the document being read (e.g. rules.srd-entry). */
  ciClass: CiClass | null;
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
  editKind: "none" | "result" | "seed" | "library-result" | "custom-srd";
  /** When editing a custom SRD clone, the workspace row id. */
  customSrdId?: string | null;
  showSavePartyVtt: boolean;
  showLoadPartyVtt: boolean;
  viewingPartyId: string | null;
  /** Primary footer commit into local Library / campaign (not a file download). */
  showPrimaryCommit: boolean;
  primaryCommitLabel: string;
  updatedAt: string;
  /** Identity of the CF / SRD row currently shown in the Scrying inspector. */
  inspect?: InspectMeta | null;
};

export type PreviewAction =
  | "edit"
  | "edit-seed"
  | "edit-result"
  | "edit-custom-srd"
  | "save-party-vtt"
  | "load-party-vtt"
  | "save-to-library";

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

type ScryingGlassOpenListener = () => void;
const scryingGlassOpenListeners = new Set<ScryingGlassOpenListener>();

/** Subscribe to Scrying Glass open requests (in-app popup). */
export function subscribeScryingGlassOpen(listener: ScryingGlassOpenListener): () => void {
  scryingGlassOpenListeners.add(listener);
  return () => {
    scryingGlassOpenListeners.delete(listener);
  };
}

function requestScryingGlassRepublish(): void {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
    channel.postMessage({ type: PREVIEW_READY_MESSAGE });
    channel.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
  window.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
}

/** Open or focus the in-app Scrying Glass popup. */
export function openOrFocusPreviewWindow(): null {
  if (typeof window === "undefined") return null;
  requestScryingGlassRepublish();
  scryingGlassOpenListeners.forEach((listener) => listener());
  return null;
}

export function postPreviewAction(action: PreviewAction, payload?: unknown): void {
  if (typeof window === "undefined") return;
  const msg = { type: "ddeasy-preview-action", action, payload };
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(msg, window.location.origin);
    return;
  }
  // In-app Scrying Glass popup — route actions to the main Fantasy Forge tab.
  window.postMessage(msg, window.location.origin);
}
