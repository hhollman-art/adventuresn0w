"use client";

import Image from "next/image";
import Link from "next/link";
import OutputMarkdownCarousel from "@/features/workshop/OutputMarkdownCarousel";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import { ciClassVisual } from "@/lib/ui/ciClassVisuals";
import { fantasyCiLabel } from "@/lib/workshop/libraryBrowseFilters";
import type { LibraryImage } from "@/lib/generationLibrary";
import {
  copyMarkdownText,
  downloadHtmlFile,
  downloadMapImage,
  downloadMarkdownFile,
  fileBaseName,
  previewMarkdownToHtml,
  type PreviewExportMode,
} from "@/lib/workshop/previewExport";
import {
  postPreviewAction,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";

type WorkshopPreviewPanelProps = {
  snapshot: WorkshopPreviewSnapshot;
  /** When true, edit/save actions postMessage to the opener instead of using callbacks. */
  popupMode?: boolean;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: () => void;
  onLoadPartyVtt?: () => void;
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
  onSavePartyVtt,
  onLoadPartyVtt,
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
  } = snapshot;

  const exportMode = (outputLayoutKind || workspace || "adventure") as PreviewExportMode;
  const exportBaseName = fileBaseName(previewMarkdown, exportMode);
  const hasContent = previewMarkdown.trim() || previewImages.length > 0;
  const ciVisual = ciClass ? ciClassVisual(ciClass) : null;

  function handleEdit() {
    if (popupMode) {
      if (editKind === "seed") postPreviewAction("edit-seed");
      else if (editKind === "library-result") postPreviewAction("edit-result");
      else postPreviewAction("edit");
      return;
    }
    if (editKind === "seed") onEditSeed?.();
    else if (editKind === "library-result") onEditResult?.();
    else onEdit?.();
  }

  function handleSaveParty() {
    if (popupMode) postPreviewAction("save-party-vtt");
    else onSavePartyVtt?.();
  }

  function handleLoadParty() {
    if (popupMode) postPreviewAction("load-party-vtt");
    else onLoadPartyVtt?.();
  }

  return (
    <section
      className="preview-window-panel fantasy-panel print-generation-root panel-scroll panel-scroll--scrying-glass min-h-0 flex-1 rounded-xl border p-6"
      data-ci-class={ciClass ?? undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {(ciClass && ciVisual) || viewingLabel ? (
          <div className="scrying-glass-file-meta no-print min-w-0 flex-1">
            {ciClass && ciVisual ? (
              <span
                className="scrying-glass-ci-class"
                style={{ borderColor: ciVisual.accent, color: ciVisual.accent }}
                title={ciClass}
              >
                <span aria-hidden="true">{ciVisual.icon}</span>
                <span>{fantasyCiLabel(ciClass)}</span>
                <span className="scrying-glass-ci-class-key">{ciClass}</span>
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
          <div className="no-print flex flex-wrap gap-2">
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
                    : "Edit"}
              </button>
            ) : null}
            {previewMarkdown.trim() ? (
              <>
                <button
                  type="button"
                  onClick={() => copyMarkdownText(previewMarkdown)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Copy Markdown
                </button>
                <button
                  type="button"
                  onClick={() => downloadMarkdownFile(previewMarkdown, exportMode)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Download .md
                </button>
                <button
                  type="button"
                  onClick={() => downloadHtmlFile(previewMarkdown, exportMode)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Download .html
                </button>
                {showSavePartyVtt ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveParty}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                      style={{ background: "var(--accent)" }}
                      title="Parse this roster and save it for the Virtual Table party panel"
                    >
                      Save party for VTT
                    </button>
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
              </>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              Print
            </button>
          </div>
        ) : null}
      </div>

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

      {previewMarkdown.trim() ? (
        <p className="no-print mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
          Tip: use <strong className="text-[var(--text)]/80">Print</strong> above to get text and
          map images together (choose &ldquo;Save as PDF&rdquo; in the print window). You can also
          export as <strong className="text-[var(--text)]/80">.md</strong> or{" "}
          <strong className="text-[var(--text)]/80">.html</strong> files for notes apps.
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

      {previewMarkdown.trim() ? (
        <OutputMarkdownCarousel
          html={previewMarkdownToHtml(previewMarkdown, isSrdPreview)}
        />
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
            read it here — then copy, export, or print.
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
    </section>
  );
}
