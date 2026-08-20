"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ScryingContentPanel from "@/features/workshop/ScryingContentPanel";
import LibraryInlineScryingPanel from "@/features/workshop/LibraryInlineScryingPanel";
import CreateNewHubForm from "@/features/workshop/CreateNewHubForm";
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
        <p className="text-sm text-[var(--text)]">This included rule is read-only.</p>
        <p className="mt-2 text-xs text-[var(--text-soft)]">
          Clone it to The Library if you want a copy you can rewrite in your own words.
        </p>
      </div>
    );
  }

  if (mode === "workplace") {
    return (
      <div className="scrying-inspector-pane">
        <p className="text-sm text-[var(--text)]">
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
      <p className="mb-2 text-xs text-[var(--text-soft)]">
        Edit the notes for this Creation File. Changes save to this device’s Library.
      </p>
      <SrdMarkdownTextarea
        value={draft}
        onChange={setDraft}
        rows={16}
        className="min-h-0 flex-1 rounded-md border bg-[var(--bg)] px-2 py-2 font-mono text-xs text-[var(--text)]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm btn-accent" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </button>
        {status ? <span className="text-xs text-[var(--text-soft)]">{status}</span> : null}
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
      <p className="scrying-inspector-pane text-sm text-[var(--text-soft)]">
        Select a Creation File or included rule to see campaign and world links.
      </p>
    );
  }

  if (links === null) {
    return <p className="scrying-inspector-pane text-sm text-[var(--text-soft)]">Looking up links…</p>;
  }

  if (links.length === 0) {
    return (
      <p className="scrying-inspector-pane text-sm text-[var(--text-soft)]">
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
            className="w-full rounded-md border px-3 py-2 text-left"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            onClick={() => inspectEntity(link.inspect)}
          >
            <span className="block text-sm font-semibold text-[var(--text)]">{link.label}</span>
            <span className="block text-xs text-[var(--text-soft)]">{link.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Persistent right-rail document viewer — not a modal. */
export default function ScryingInspector() {
  const actions = useCommandCenterActionsOptional();
  const layout = useCommandCenterLayout();
  const library = useLibraryInspectorOptional();
  const { inspectedEntity, inspectorTab } = useInspectorFocus();
  const power = usePowerWorkspaceOptional();
  const setInspectorOpen = actions?.setInspectorOpen;
  const [busSnapshot, setBusSnapshot] = useState<WorkshopPreviewSnapshot | null>(null);

  const collapse = useCallback(() => {
    setInspectorOpen?.(false);
  }, [setInspectorOpen]);

  const reveal = useCallback(() => {
    const stored = readPreviewSnapshot();
    if (stored) setBusSnapshot(stored);
    if (stored?.inspect) actions?.applyInspectedEntity(stored.inspect);
    setInspectorOpen?.(true);
  }, [actions, setInspectorOpen]);

  useEffect(() => {
    const stored = readPreviewSnapshot();
    if (stored) setBusSnapshot(stored);
    return subscribeScryingGlassOpen(reveal);
  }, [reveal]);

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

  if (layout.inspectorView === "create") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <CreateNewHubForm
          initialKind={power?.state.createHubKind}
          homebrewPreferred={power?.state.homebrewPreferred ?? true}
          onClose={() => {
            layout.closeCreateInspector();
            power?.closeCreateHub();
          }}
        />
      </div>
    );
  }

  const snapshot = library?.snapshot ?? busSnapshot;
  const hasSelection = Boolean(library?.hasSelection || snapshotHasContent(snapshot));
  const meta = inspectedEntity ?? snapshot?.inspect ?? null;

  return (
    <div className="scrying-inspector flex min-h-0 flex-1 flex-col">
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" role="tabpanel">
        {inspectorTab === "details" ? (
          hasSelection && snapshot ? (
            <ScryingContentPanel
              snapshot={snapshot}
              variant="inline"
              onClose={collapse}
              onEdit={library?.onEdit}
              onEditSeed={library?.onEditSeed}
              onEditResult={library?.onEditResult}
              onSavePartyVtt={library?.onSavePartyVtt}
              onLoadPartyVtt={library?.onLoadPartyVtt}
              onSaveToLibrary={library?.onSaveToLibrary}
            />
          ) : (
            <LibraryInlineScryingPanel snapshot={null} hasSelection={false} onClose={collapse} />
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
    </div>
  );
}
