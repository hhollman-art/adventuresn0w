"use client";

import { REALM_SIZE_LABEL, REALM_SIZES, type RealmSize } from "@/lib/realmPrompt";
import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";
import { SEED_TAG_SUGGESTIONS } from "@/lib/seedTags";
import {
  formatSeedTagsInput,
  mergeRealmSeedTags,
  parseSeedTagsInput,
  SEED_KIND_LABEL,
  SEED_KINDS,
  type SeedKind,
} from "@/lib/realmSeeds";
import type { SeedEditorDraft } from "./homeTypes";

export type SeedEditorDialogProps = {
  seedEditor: SeedEditorDraft;
  seedEditorError: string;
  setSeedEditor: React.Dispatch<React.SetStateAction<SeedEditorDraft | null>>;
  setSeedEditorError: (error: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
};

export function SeedEditorDialog({
  seedEditor,
  seedEditorError,
  setSeedEditor,
  setSeedEditorError,
  onSave,
  onCancel,
}: SeedEditorDialogProps) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seed-editor-title"
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          id="seed-editor-title"
          className="text-lg font-semibold text-[var(--text)]"
        >
          {seedEditor.id
            ? `Edit ${SEED_KIND_LABEL[seedEditor.kind].toLowerCase()} CF`
            : "Add a CF manually"}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          CFs are story notes the generators build from. Type or paste
          anything — places, people, plots — and future realms, adventures,
          characters, maps, and items will stay true to them. Plain text or
          Markdown formatting both work.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">CF type</span>
          <select
            value={seedEditor.kind}
            onChange={(e) => {
              const kind = e.target.value as SeedKind;
              setSeedEditor((d) => (d ? { ...d, kind } : d));
            }}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          >
            {SEED_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SEED_KIND_LABEL[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">CF name</span>
          <input
            value={seedEditor.name}
            onChange={(e) => {
              setSeedEditorError("");
              setSeedEditor((d) => (d ? { ...d, name: e.target.value } : d));
            }}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            placeholder="e.g. The Ash Covenant coast"
            autoFocus
          />
        </label>
        {seedEditor.kind === "realm" ? (
          <label className="mt-3 flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--muted)]">
              Realm size
            </span>
            <select
              value={seedEditor.realmSize}
              onChange={(e) => {
                const realmSize = e.target.value as RealmSize;
                setSeedEditor((d) => {
                  if (!d) return d;
                  const tagsInput = formatSeedTagsInput(
                    mergeRealmSeedTags(
                      parseSeedTagsInput(d.tagsInput),
                      "realm",
                      realmSize,
                    ),
                  );
                  return { ...d, realmSize, tagsInput };
                });
              }}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            >
              {REALM_SIZES.map((size) => (
                <option key={size} value={size}>
                  {REALM_SIZE_LABEL[size].label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">
            Short description (optional)
          </span>
          <span className="text-xs text-[var(--muted)]">
            A one-line summary shown in the CF picker for recognition.
          </span>
          <input
            value={seedEditor.briefDescription}
            onChange={(e) => {
              setSeedEditor((d) =>
                d ? { ...d, briefDescription: e.target.value } : d,
              );
            }}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            placeholder="e.g. Volcanic coast ruled by a fire-priest covenant"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">Tags (optional)</span>
          <span className="text-xs text-[var(--muted)]">
            Comma-separated labels to filter CFs in the Library and on workshop
            tabs — e.g. campaign, one-shot, faction. Realm scope (world, city,
            village, …) is set automatically from realm size above.
          </span>
          <input
            value={seedEditor.tagsInput}
            onChange={(e) => {
              setSeedEditor((d) =>
                d ? { ...d, tagsInput: e.target.value } : d,
              );
            }}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            placeholder="campaign, location, session-3"
          />
          <div className="flex flex-wrap gap-1.5">
            {SEED_TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSeedEditor((d) => {
                    if (!d) return d;
                    const current = parseSeedTagsInput(d.tagsInput);
                    if (current.includes(tag)) return d;
                    const next = [...current, tag];
                    return { ...d, tagsInput: formatSeedTagsInput(next) };
                  });
                }}
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
              >
                + {tag}
              </button>
            ))}
          </div>
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">CF details</span>
          <span className="text-xs text-[var(--muted)]">
            The brief, notes, or generated text that should carry into future
            runs on this tab (and related tabs). Required.
          </span>
          <SrdMarkdownTextarea
            value={seedEditor.markdown}
            onChange={(markdown) => {
              setSeedEditorError("");
              setSeedEditor((d) => (d ? { ...d, markdown } : d));
            }}
            rows={12}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            placeholder={"# The Ash Covenant Coast\n\nA volcanic stretch of coastline where..."}
          />
        </label>
        {seedEditorError ? (
          <p className="mt-2 text-sm text-red-500">{seedEditorError}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            {seedEditor.id ? "Save changes" : "Add to library"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
            style={{ borderColor: "var(--border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
