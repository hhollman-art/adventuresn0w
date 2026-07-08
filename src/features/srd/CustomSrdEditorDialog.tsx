"use client";

import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";

export type CustomSrdEditorDialogProps = {
  name: string;
  markdown: string;
  error: string;
  onNameChange: (name: string) => void;
  onMarkdownChange: (markdown: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
};

export default function CustomSrdEditorDialog({
  name,
  markdown,
  error,
  onNameChange,
  onMarkdownChange,
  onSave,
  onCancel,
  saving = false,
}: CustomSrdEditorDialogProps) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-srd-editor-title"
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          id="custom-srd-editor-title"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Edit workspace copy
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This is your editable clone — changes stay in your library and never
          modify the bundled SRD reference.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">Title</span>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
          />
        </label>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">
            Content (plain text or Markdown)
          </span>
          <SrdMarkdownTextarea
            value={markdown}
            onChange={onMarkdownChange}
            rows={20}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            autoFocus
          />
        </label>
        {error ? (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {saving ? "Saving…" : "Save changes"}
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
