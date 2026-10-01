"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import WorkshopPreviewPanel from "@/features/workshop/WorkshopPreviewPanel";
import CreateNewHubForm from "@/features/workshop/CreateNewHubForm";
import ScryingGlassIcon from "@/features/ui/ScryingGlassIcon";
import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";
import { usePowerWorkspaceOptional } from "@/features/workshop/PowerWorkspaceProvider";
import {
  useCommandCenterActionsOptional,
  useCommandCenterLayout,
  useInspectorFocus,
  useLibraryInspectorOptional,
  type InspectorTabId,
} from "@/contexts/CommandCenterContext";
import {
  isPreviewSnapshotMessage,
  PREVIEW_SYNC_CHANNEL,
  readPreviewSnapshot,
  PREVIEW_STORAGE_KEY,
  subscribeScryingGlassOpen,
  type WorkshopPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";
import { inspectEntity, type InspectMeta } from "@/lib/workshop/inspectedEntity";
import { loadInspectRelatedLinks, type InspectRelatedLink } from "@/lib/workshop/inspectRelatedLinks";
import {
  inspectEditMode,
  inspectWorkplaceHref,
  saveInspectedMarkdown,
} from "@/lib/workshop/inspectMarkdownSave";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

const TABS: { id: InspectorTabId; label: string }[] = [
  { id: "details", label: "View Details" },
  { id: "edit", label: "Edit" },
  { id: "related", label: "Related Links" },
];

const CLOSE_MS = 140;

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

function ScryingEditPane({
  snapshot,
  meta,
  onSaveMarkdown,
}: {
  snapshot: WorkshopPreviewSnapshot | null;
  meta: InspectMeta | null;
  onSaveMarkdown?: (markdown: string) => void | Promise<void>;
}) {
  const selection = meta?.selection ?? snapshot?.inspect?.selection ?? null;
  const mode = inspectEditMode(selection);
  const workplaceHref = inspectWorkplaceHref(selection);
  const [draft, setDraft] = useState(snapshot?.markdown ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(snapshot?.markdown ?? "");
    setStatus(null);
  }, [snapshot?.markdown, meta?.key]);

  if (mode === "readonly") {
    return (
      <div className="scrying-inspector-pane">
        <p className="text-sm text-slate-100">This included rule is read-only.</p>
        <p className="mt-2 text-xs text-slate-300">
          Clone it to The Library if you want a copy you can rewrite in your own words.
        </p>
      </div>
    );
  }

  if (mode === "workplace") {
    return (
      <div className="scrying-inspector-pane">
        <p className="text-sm text-slate-100">
          This Creation File uses a dedicated workplace (character sheet, party, or campaign
          builder) rather than a single notes field.
        </p>
        {workplaceHref ? (
          <Link href={workplaceHref} className="btn btn-sm btn-accent mt-3 inline-flex">
            Open workplace
          </Link>
        ) : null}
      </div>
    );
  }

  const save = async () => {
    if (!selection) return;
    setSaving(true);
    setStatus(null);
    try {
      if (onSaveMarkdown) await onSaveMarkdown(draft);
      else await saveInspectedMarkdown(selection, draft);
      setStatus("Saved to The Library.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scrying-inspector-pane flex min-h-0 flex-1 flex-col">
      <p className="mb-2 shrink-0 text-xs text-slate-300">
        Edit the notes for this Creation File. Changes save to this device’s Library.
      </p>
      <SrdMarkdownTextarea
        value={draft}
        onChange={setDraft}
        rows={16}
        className="min-h-[12rem] flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-2 font-mono text-xs text-slate-100"
      />
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm btn-accent" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </button>
        {status ? <span className="text-xs text-slate-300">{status}</span> : null}
      </div>
    </div>
  );
}

function ScryingRelatedPane({ meta }: { meta: InspectMeta | null }) {
  const [links, setLinks] = useState<InspectRelatedLink[] | null>(null);

  useEffect(() => {
    if (!meta) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    void loadInspectRelatedLinks(meta).then((next) => {
      if (!cancelled) setLinks(next);
    });
    return () => {
      cancelled = true;
    };
  }, [meta]);

  if (!meta) {
    return (
      <p className="scrying-inspector-pane text-sm text-slate-300">
        Select a Creation File or included rule to see campaign and world links.
      </p>
    );
  }

  if (links === null) {
    return <p className="scrying-inspector-pane text-sm text-slate-300">Looking up links…</p>;
  }

  if (links.length === 0) {
    return (
      <p className="scrying-inspector-pane text-sm text-slate-300">
        No campaign or location links yet. Send this file to a campaign from the context menu when
        you want it at the table.
      </p>
    );
  }

  return (
    <ul className="scrying-inspector-pane m-0 flex list-none flex-col gap-2 p-0">
      {links.map((link) => (
        <li key={link.id}>
          <button
            type="button"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left hover:bg-[var(--dmms-panel-hover,#1f242c)]"
            onClick={() => inspectEntity(link.inspect)}
          >
            <span className="block text-sm font-semibold text-slate-100">{link.label}</span>
            <span className="block text-xs text-slate-300">{link.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ScryingEmptyState() {
  return (
    <div className="library-inline-scrying-empty flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <ScryingGlassIcon size={40} className="opacity-90" />
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold text-slate-100">{PREVIEW_WINDOW}</p>
        <p className="max-w-[18rem] text-xs leading-relaxed text-slate-300">
          Select a creation file or included rule from the stacks to scry its details here.
        </p>
      </div>
    </div>
  );
}

/**
 * Scrying Glass — floating pop-out window rendered into a body portal.
 * Never reserves layout width; open via the header Scry button, Alt+2, or
 * openOrFocusPreviewWindow(). Backdrop click, ✕, or Escape closes it.
 */
export default function ScryingInspector() {
  const titleId = useId();
  const actions = useCommandCenterActionsOptional();
  const layout = useCommandCenterLayout();
  const library = useLibraryInspectorOptional();
  const { inspectedEntity, inspectorTab } = useInspectorFocus();
  const power = usePowerWorkspaceOptional();
  const setScryingGlassOpen = actions?.setScryingGlassOpen;
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busSnapshot, setBusSnapshot] = useState<WorkshopPreviewSnapshot | null>(null);

  const open = layout.scryingGlassOpen || closing;

  const collapse = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setRevealed(false);
    window.setTimeout(() => {
      setScryingGlassOpen?.(false);
      setClosing(false);
    }, CLOSE_MS);
  }, [closing, setScryingGlassOpen]);

  const reveal = useCallback(() => {
    const stored = readPreviewSnapshot();
    if (stored) setBusSnapshot(stored);
    if (stored?.inspect) actions?.applyInspectedEntity(stored.inspect);
    setClosing(false);
    setScryingGlassOpen?.(true);
  }, [actions, setScryingGlassOpen]);

  useEffect(() => {
    setMounted(true);
    const stored = readPreviewSnapshot();
    if (stored) setBusSnapshot(stored);
    return subscribeScryingGlassOpen(reveal);
  }, [reveal]);

  useEffect(() => {
    if (!layout.scryingGlassOpen) {
      setRevealed(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [layout.scryingGlassOpen]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREVIEW_STORAGE_KEY) return;
      const stored = readPreviewSnapshot();
      if (stored) setBusSnapshot(stored);
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (isPreviewSnapshotMessage(event.data)) {
          setBusSnapshot(event.data);
          if (event.data.inspect) actions?.applyInspectedEntity(event.data.inspect);
        }
      };
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [actions]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (layout.inspectorView === "create") {
          layout.closeCreateInspector();
          power?.closeCreateHub();
        }
        collapse();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, collapse, layout, power]);

  if (!mounted || !open) return null;

  const snapshot = library?.snapshot ?? busSnapshot;
  const hasSelection = Boolean(library?.hasSelection || snapshotHasContent(snapshot));
  const meta = inspectedEntity ?? snapshot?.inspect ?? null;
  const motionClass = revealed && !closing ? "is-open" : closing ? "is-closing" : "";

  return createPortal(
    <div
      className={`scrying-glass-backdrop no-print ${motionClass}`.trim()}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) collapse();
      }}
    >
      <div
        className={`scrying-glass-popup-shell scrying-glass-frame ${motionClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="scrying-glass-titlebar shrink-0" aria-label={`${PREVIEW_WINDOW} title bar`}>
          <ScryingGlassIcon size={24} className="scrying-glass-titlebar-icon" />
          <p id={titleId} className="preview-window-titlebar-label">
            D&amp;D EASY — {PREVIEW_WINDOW}
          </p>
          <button
            type="button"
            className="scrying-glass-dismiss-btn"
            aria-label={`Close ${PREVIEW_WINDOW}`}
            title="Close (Esc)"
            onClick={collapse}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        {layout.inspectorView === "create" ? (
          <div className="scrying-glass-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <div className="p-3 sm:p-4">
              <CreateNewHubForm
                initialKind={power?.state.createHubKind}
                homebrewPreferred={power?.state.homebrewPreferred ?? true}
                onClose={() => {
                  layout.closeCreateInspector();
                  power?.closeCreateHub();
                  collapse();
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="scrying-inspector-header shrink-0">
              <div className="scrying-inspector-tabs" role="tablist" aria-label={`${PREVIEW_WINDOW} actions`}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={inspectorTab === tab.id}
                    className={`scrying-inspector-tab${inspectorTab === tab.id ? " is-active" : ""}`}
                    onClick={() => actions?.setInspectorTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="scrying-glass-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto"
              role="tabpanel"
            >
              {inspectorTab === "details" ? (
                hasSelection && snapshot ? (
                  <div className="scrying-glass-content-wrap">
                    <p className="scrying-glass-hint no-print shrink-0">
                      Review output here. Edit and save still apply in the Fantasy Forge workspace.
                    </p>
                    <WorkshopPreviewPanel
                      snapshot={snapshot}
                      popupMode
                      onEdit={library?.onEdit}
                      onEditSeed={library?.onEditSeed}
                      onEditResult={library?.onEditResult}
                      onSavePartyVtt={library?.onSavePartyVtt}
                      onLoadPartyVtt={library?.onLoadPartyVtt}
                      onSaveToLibrary={library?.onSaveToLibrary}
                    />
                  </div>
                ) : (
                  <ScryingEmptyState />
                )
              ) : null}
              {inspectorTab === "edit" ? (
                <ScryingEditPane
                  snapshot={snapshot}
                  meta={meta}
                  onSaveMarkdown={library?.onSaveInspectedMarkdown}
                />
              ) : null}
              {inspectorTab === "related" ? <ScryingRelatedPane meta={meta} /> : null}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
