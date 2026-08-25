"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import OutputMarkdownCarousel from "@/features/workshop/OutputMarkdownCarousel";
import HeroScrySelection from "@/features/workshop/HeroScrySelection";
import CharacterSheetLayout from "@/features/characters/CharacterSheetLayout";
import ScryingExportMenu, {
  type ScryingExportAction,
} from "@/features/workshop/ScryingExportMenu";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import type { LibraryImage } from "@/lib/generationLibrary";
import {
  copyMarkdownText,
  downloadMapImage,
  fileBaseName,
  previewMarkdownToHtml,
  type PreviewExportMode,
} from "@/lib/workshop/previewExport";
import {
  postPreviewAction,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";
import {
  instantiateAiHeroesFromMarkdown,
  previewAiHeroesFromMarkdown,
} from "@/lib/tabletop/instantiateAiHeroes";
import { useVaultDrawerOptional } from "@/contexts/VaultDrawerContext";

type WorkshopPreviewPanelProps = {
  snapshot: WorkshopPreviewSnapshot;
  /** When true, edit/save actions postMessage to the opener instead of using callbacks. */
  popupMode?: boolean;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: (
    selectedIndices: number[],
    options?: { linkCampaign?: boolean },
  ) => void;
  onLoadPartyVtt?: () => void;
  onSaveToLibrary?: () => void;
};

function MapImageBlock({
  mapImages,
  exportBaseName,
}: {
  mapImages: LibraryImage[];
  exportBaseName: string;
}) {
  if (mapImages.length === 0) return null;
  return (
    <div className="mt-6 grid gap-4">
      {mapImages.map((img, idx) => {
        const heading =
          img.label ??
          (img.kind === "locale" || img.kind === "battle"
            ? `${img.kind} map`
            : img.kind === "realm"
              ? "Realm map"
              : `${img.kind} image`);
        const downloadSlug = img.label ?? img.kind;
        return (
          <div
            key={`${idx}-${img.kind}-${downloadSlug}`}
            className="rounded-lg border p-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">{heading}</p>
              <button
                type="button"
                onClick={() =>
                  downloadMapImage(img.imageDataUrl, downloadSlug, exportBaseName)
                }
                className="no-print shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                Download PNG
              </button>
            </div>
            <Image
              src={img.imageDataUrl}
              alt={heading}
              width={1536}
              height={1024}
              unoptimized
              className="h-auto w-full rounded-md"
            />
          </div>
        );
      })}
    </div>
  );
}

function workspaceEmptyHint(workspace: string): string {
  if (workspace === "realm") {
    return "Pick a realm size, describe what you want, and your setting pages will appear here — ready to read, print, or edit.";
  }
  if (workspace === "adventure") {
    return "Fill in the form and your quest will appear here, sized to the length you picked.";
  }
  if (workspace === "characters") {
    return "Fill in the form and your ready-to-play heroes will appear here — copy them to your notes or load them at the Virtual Table.";
  }
  if (workspace === "props") {
    return "Choose an item type, write a description, and your handout image will appear here.";
  }
  return "Submit to generate full-color locale / overland maps and grid-free battle maps for the VTT.";
}

export default function WorkshopPreviewPanel({
  snapshot,
  popupMode = false,
  onEdit,
  onEditSeed,
  onEditResult,
  onSavePartyVtt: _onSavePartyVtt,
  onLoadPartyVtt,
  onSaveToLibrary,
}: WorkshopPreviewPanelProps) {
  const {
    markdown: previewMarkdown,
    images: previewImages,
    textModel: previewTextModel,
    imageModel: previewImageModel,
    outputLayoutKind,
    workspace,
    isLibraryView,
    viewingLabel,
    viewingSubline,
    ciClass,
    loading,
    imageLoading,
    error,
    imageError,
    partySaveMessage,
    srdLoading,
    isSrdPreview,
    canEdit,
    editKind,
    showSavePartyVtt,
    showLoadPartyVtt,
    showPrimaryCommit,
    primaryCommitLabel,
  } = snapshot;

  const vault = useVaultDrawerOptional();
  const exportMode = (outputLayoutKind || workspace || "adventure") as PreviewExportMode;
  const exportBaseName = fileBaseName(previewMarkdown, exportMode);
  const hasContent = Boolean(previewMarkdown.trim() || previewImages.length > 0);
  const ciVisual = ciClass ? ciClassVisual(ciClass) : null;
  const sheetCharacters = useMemo(() => {
    if (
      !previewMarkdown.trim() ||
      (workspace !== "characters" && ciClass !== "character.sheet")
    ) {
      return [];
    }
    return previewAiHeroesFromMarkdown(previewMarkdown).heroes.map((h) => h.player);
  }, [ciClass, previewMarkdown, workspace]);
  const [recruitBusy, setRecruitBusy] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (partySaveMessage) {
      setRecruitBusy(false);
      setCommitBusy(false);
    }
  }, [partySaveMessage]);

  function handleEdit() {
    if (popupMode) {
      if (editKind === "seed") postPreviewAction("edit-seed");
      else if (editKind === "library-result") postPreviewAction("edit-result");
      else if (editKind === "custom-srd") postPreviewAction("edit-custom-srd");
      else postPreviewAction("edit");
      return;
    }
    if (editKind === "seed") onEditSeed?.();
    else if (editKind === "library-result") onEditResult?.();
    else if (editKind === "custom-srd") onEdit?.();
    else onEdit?.();
  }

  async function handleAcceptHeroes(
    selectedIndices: number[],
    options: { linkCampaign: boolean },
  ) {
    setRecruitBusy(true);
    setExportNotice(null);
    try {
      if (popupMode) {
        postPreviewAction("save-party-vtt", {
          selectedIndices,
          linkCampaign: options.linkCampaign,
        });
        return;
      }

      // Persist from the markdown currently shown in Scry (not a parent closure).
      const result = await instantiateAiHeroesFromMarkdown(previewMarkdown, {
        saveRoster: true,
        source: "workshop",
        selectedIndices,
        linkActiveCampaign: options.linkCampaign,
      });
      if (!result.ok) {
        setExportNotice(result.error);
        return;
      }
      setExportNotice(result.message);
      void vault?.refreshEntries();
    } finally {
      window.setTimeout(() => setRecruitBusy(false), 2500);
    }
  }

  function handleLoadParty() {
    if (popupMode) postPreviewAction("load-party-vtt");
    else onLoadPartyVtt?.();
  }

  function handlePrimaryCommit() {
    setCommitBusy(true);
    setExportNotice(null);
    if (popupMode) {
      postPreviewAction("save-to-library");
      return;
    }
    onSaveToLibrary?.();
  }

  function handleExportAction(action: ScryingExportAction) {
    setExportNotice(null);
    if (action === "copy-text") {
      if (!previewMarkdown.trim()) {
        setExportNotice("Nothing to copy yet.");
        return;
      }
      copyMarkdownText(previewMarkdown);
      setExportNotice("Copied text to your clipboard.");
      return;
    }
    window.print();
  }

  return (
    <section
      className="preview-window-panel fantasy-panel print-generation-root panel-scroll panel-scroll--scrying-glass flex min-h-0 flex-1 flex-col rounded-xl border p-6"
      data-ci-class={ciClass ?? undefined}
    >
      <header className="scrying-glass-inspection-header no-print flex shrink-0 flex-col gap-3 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {(ciClass && ciVisual) || viewingLabel ? (
            <div className="scrying-glass-file-meta min-w-0 flex-1">
              {ciClass && ciVisual ? (
                <span
                  className="scrying-glass-ci-class"
                  style={{ borderColor: ciVisual.accent }}
                  title={ciClass}
                >
                  <span className="scrying-glass-ci-class-icon" aria-hidden="true">
                    {ciVisual.icon}
                  </span>
                  <span className="scrying-glass-ci-class-label">{fantasyCiLabel(ciClass)}</span>
                </span>
              ) : null}
              {viewingLabel ? (
                <p className="scrying-glass-file-label text-xs text-[var(--muted)]">
                  {viewingLabel}
                  {viewingSubline ? (
                    <>
                      {" "}
                      <strong className="text-[var(--text)]">({viewingSubline})</strong>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {hasContent ? (
            <div className="scrying-glass-toolbar flex flex-wrap items-center justify-end gap-2">
              {previewMarkdown.trim() && canEdit ? (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {editKind === "seed"
                    ? "Edit CF"
                    : editKind === "library-result"
                      ? "Edit result"
                      : editKind === "custom-srd"
                        ? "Edit workspace copy"
                        : "Edit"}
                </button>
              ) : null}
              <ScryingExportMenu
                disabled={!hasContent || loading}
                onAction={handleExportAction}
              />
              {showSavePartyVtt ? (
                <>
                  <Link
                    href="/tavern"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    The Tavern
                  </Link>
                  <Link
                    href="/table"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--accent-dim)" }}
                  >
                    Virtual Table
                  </Link>
                </>
              ) : null}
              {showLoadPartyVtt ? (
                <>
                  <Link
                    href="/tavern"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Manage party
                  </Link>
                  <button
                    type="button"
                    onClick={handleLoadParty}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                    style={{ background: "var(--accent)" }}
                  >
                    Load to VTT
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {showPrimaryCommit ? (
          <div className="scrying-glass-save-action flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <button
              type="button"
              disabled={commitBusy || loading || !hasContent}
              onClick={handlePrimaryCommit}
              className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {commitBusy ? "Saving…" : primaryCommitLabel}
            </button>
            <p className="text-[11px] leading-relaxed text-[var(--muted)] sm:text-right">
              Saves into your local Library — no file download.
            </p>
          </div>
        ) : null}
      </header>

      {previewTextModel || previewImageModel ? (
        <p className="no-print mt-1 text-xs text-[var(--muted)]">
          {previewTextModel ? `Text model: ${previewTextModel}` : null}
          {previewTextModel && previewImageModel ? " · " : null}
          {previewImageModel ? `Image model: ${previewImageModel}` : null}
        </p>
      ) : null}

      {partySaveMessage ? (
        <p className="scrying-glass-status no-print mt-2 rounded-lg border px-3 py-2 text-xs" role="status">
          {partySaveMessage}
        </p>
      ) : null}
      {exportNotice ? (
        <p className="scrying-glass-status no-print mt-2 rounded-lg border px-3 py-2 text-xs" role="status">
          {exportNotice}
        </p>
      ) : null}

      {showSavePartyVtt && previewMarkdown.trim() && !loading ? (
        <HeroScrySelection
          markdown={previewMarkdown}
          busy={recruitBusy}
          onAccept={handleAcceptHeroes}
        />
      ) : null}

      {previewMarkdown.trim() && !showSavePartyVtt ? (
        <p className="no-print mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
          Your Library auto-saves this Creation File. Use{" "}
          <strong className="text-[var(--text)]/80">Share</strong> only to copy text or print
          for the table.
        </p>
      ) : null}

      {error ? (
        <p className="scrying-glass-alert no-print mt-4 rounded-lg border px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {imageError ? (
        <p className="scrying-glass-alert no-print mt-3 rounded-lg border px-3 py-2 text-sm" role="alert">
          {imageError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        {previewMarkdown.trim() ? (
          sheetCharacters.length > 0 ? (
            <div className="grid gap-5">
              {sheetCharacters.map((character) => (
                <CharacterSheetLayout key={character.id} characterData={character} />
              ))}
            </div>
          ) : (
            <OutputMarkdownCarousel
              html={previewMarkdownToHtml(previewMarkdown, isSrdPreview)}
              enableSpellLinks={
                isSrdPreview || ciClass === "npc.record" || ciClass === "rules.custom-entry"
              }
            />
          )
        ) : null}

        {isSrdPreview && srdLoading ? (
          <p className="no-print mt-4 text-sm text-[var(--muted)]">Loading SRD entry…</p>
        ) : null}

        <MapImageBlock mapImages={previewImages} exportBaseName={exportBaseName} />

        {isLibraryView && !isSrdPreview && !previewMarkdown.trim() && previewImages.length === 0 ? (
          <div className="library-preview-empty no-print mt-6">
            <p className="text-sm text-[var(--muted)]">
              Choose any entry in{" "}
              <strong className="text-[var(--text)]">Search the stacks</strong> on the main window to
              read it here — then save it to a campaign or export if you need a shareable copy.
            </p>
          </div>
        ) : isSrdPreview && !previewMarkdown.trim() && !srdLoading ? (
          <p className="no-print mt-6 text-sm text-[var(--muted)]">
            Could not load this SRD entry. Close the {PREVIEW_WINDOW}, pick the entry again, or check
            your connection.
          </p>
        ) : null}

        {!loading && !error && !previewMarkdown.trim() && previewImages.length === 0 && !isLibraryView ? (
          <p className="no-print mt-8 text-sm text-[var(--muted)]">{workspaceEmptyHint(workspace)}</p>
        ) : null}

        {loading ? (
          <p className="no-print mt-8 animate-pulse text-sm text-[var(--muted)]">
            {workspace === "adventure" || workspace === "characters" || workspace === "realm"
              ? "Calling Claude…"
              : "Working on images… this can take a minute."}
          </p>
        ) : null}
        {imageLoading ? (
          <p className="no-print mt-2 animate-pulse text-sm text-[var(--muted)]">
            {workspace === "props"
              ? "Rendering item image…"
              : workspace === "realm"
                ? "Draw Realm…"
                : "Rendering maps and handouts (batched API calls)…"}
          </p>
        ) : null}
      </div>

    </section>
  );
}
