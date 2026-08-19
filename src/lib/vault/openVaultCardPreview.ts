import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import {
  openOrFocusPreviewWindow,
  publishPreviewSnapshot,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";
import type { VaultCardEntry } from "@/lib/vault/loadVaultEntries";

function vaultCardSnapshot(entry: VaultCardEntry): WorkshopPreviewSnapshot {
  const kind = fantasyCiLabel(entry.ciClass);
  const markdown = [
    `# ${entry.title}`,
    ``,
    `*${kind}*`,
    ``,
    entry.detail?.trim() || "Parked in the Lore Vault. Open The Library for the full Creation File.",
  ].join("\n");

  return {
    markdown,
    images: [],
    textModel: null,
    imageModel: null,
    outputLayoutKind: "adventure",
    workspace: "welcome",
    isLibraryView: true,
    viewingLabel: entry.title,
    viewingSubline: `${kind} · Lore Vault`,
    ciClass: entry.ciClass,
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
    updatedAt: new Date().toISOString(),
  };
}

/** Show a vault card in the docked Scrying inspector — no blocking modal. */
export function openVaultCardPreview(entry: VaultCardEntry): void {
  if (typeof window === "undefined") return;
  publishPreviewSnapshot(vaultCardSnapshot(entry));
  openOrFocusPreviewWindow();
}
