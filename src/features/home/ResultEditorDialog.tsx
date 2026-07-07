"use client";

import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";
export type ResultEditorDialogProps = {
  resultEditor: { markdown: string };
  resultEditorError: string;
  setResultEditor: React.Dispatch<
    React.SetStateAction<{ markdown: string } | null>
  >;
  setResultEditorError: (error: string) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
};

export function ResultEditorDialog({
  resultEditor,
  resultEditorError,
  setResultEditor,
  setResultEditorError,
  onSave,
  onCancel,
}: ResultEditorDialogProps) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-editor-title"
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          id="result-editor-title"
          className="text-lg font-semibold text-[var(--text)]"
        >
          Edit generated text
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Rewrite any part of this result in your own words. Edits update
          the preview and everything you copy, download, or print, and are
          kept with the saved copy in your library.
        </p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--muted)]">
            Content (plain text or Markdown)
          </span>
          <SrdMarkdownTextarea
            value={resultEditor.markdown}
            onChange={(markdown) => {
              setResultEditorError("");
              setResultEditor((d) => (d ? { ...d, markdown } : d));
            }}
            rows={20}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
            style={{ borderColor: "var(--border)" }}
            autoFocus
          />
        </label>
        {resultEditorError ? (
          <p className="mt-2 text-sm text-red-500">{resultEditorError}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Save changes
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
