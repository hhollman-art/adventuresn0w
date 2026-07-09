"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  HOMEBREW_ACCEPT,
  ingestHomebrewFile,
  isHomebrewDropFile,
  type HomebrewIngestResult,
} from "@/lib/workshop/homebrewFileIngest";
import {
  createNewKindToMapped,
  draftHasBlankFields,
  draftToPartial,
  mapHomebrewToCfSchema,
  type CfMappedDraft,
  type CfMappedKind,
} from "@/lib/workshop/cfSchemaMapper";
import type { CreateNewKind } from "@/lib/workshop/powerWorkspaceMachine";

type HomebrewDocumentDropzoneProps = {
  /** Target CF kind for AI schema mapping. */
  targetKind?: CfMappedKind | CreateNewKind;
  /** Called after local ingest + optional AI map fills a draft. */
  onMapped?: (mapped: CfMappedDraft, ingest: HomebrewIngestResult) => void;
  /** Called after local ingest only (before AI). */
  onIngested?: (ingest: HomebrewIngestResult) => void;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
};

function resolveTarget(kind?: CfMappedKind | CreateNewKind): CfMappedKind {
  if (!kind) return "item";
  if (
    kind === "item" ||
    kind === "npc" ||
    kind === "character" ||
    kind === "spell" ||
    kind === "location" ||
    kind === "realm"
  ) {
    return kind;
  }
  return createNewKindToMapped(kind) ?? "item";
}

/**
 * Drop Homebrew File zone — .pdf / .txt / .png / .jpg.
 * Reads the stream locally first; AI mapping is an explicit second step.
 */
export default function HomebrewDocumentDropzone({
  targetKind,
  onMapped,
  onIngested,
  className = "",
  compact = false,
  children,
}: HomebrewDocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingest, setIngest] = useState<HomebrewIngestResult | null>(null);
  const [mapped, setMapped] = useState<CfMappedDraft | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const kind = resolveTarget(targetKind);

  const runIngest = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setStatus(null);
      setMapped(null);
      try {
        const result = await ingestHomebrewFile(file);
        setIngest(result);
        onIngested?.(result);
        const warn = result.warnings[0];
        setStatus(
          warn
            ? `Read ${file.name} on this device. ${warn}`
            : `Read ${file.name} on this device (${result.byteLength.toLocaleString()} bytes).`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file.");
        setIngest(null);
      } finally {
        setBusy(false);
      }
    },
    [onIngested],
  );

  const runAiMap = useCallback(
    async (completeMissing: boolean) => {
      if (!ingest) return;
      setAiBusy(true);
      setError(null);
      try {
        const response = await mapHomebrewToCfSchema({
          targetKind: kind,
          extractedText: ingest.text,
          fileName: ingest.fileName,
          imageDataUrl: ingest.dataUrl,
          completeMissing,
          partial: completeMissing && mapped ? draftToPartial(mapped) : undefined,
        });
        setMapped(response.mapped);
        onMapped?.(response.mapped, ingest);
        setStatus(
          completeMissing
            ? `Filled blanks with AI (${response.model}). Review before saving.`
            : `Mapped into a ${kind} Creation File template (${response.model}).`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI mapping failed.");
      } finally {
        setAiBusy(false);
      }
    },
    [ingest, kind, mapped, onMapped],
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setActive(true);
  };

  const onDragLeave = () => setActive(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isHomebrewDropFile(file)) {
      setError("Drop a .pdf, .txt, .png, or .jpg file.");
      return;
    }
    void runIngest(file);
  };

  const showComplete =
    mapped !== null && draftHasBlankFields(mapped) && !aiBusy;

  return (
    <div className={className}>
      <div
        className={`relative rounded-lg border-2 border-dashed transition ${
          compact ? "p-3" : "p-5"
        } ${active ? "border-[var(--accent)] bg-[var(--accent-dim)]" : ""}`}
        style={{
          borderColor: active ? undefined : "var(--border)",
          background: active ? undefined : "var(--bg)",
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Drop Homebrew File</p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              .pdf · .txt · .png · .jpg — read locally first (never uploaded raw).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Reading…" : "Choose file"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={HOMEBREW_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void runIngest(file);
            }}
          />
        </div>
        {children}
      </div>

      {status ? (
        <p className="mt-2 text-xs text-[var(--text-soft)]">{status}</p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded border border-red-400/40 bg-red-950/40 px-2 py-1.5 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      {ingest ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-accent"
            disabled={aiBusy}
            onClick={() => void runAiMap(false)}
          >
            {aiBusy && !mapped ? "Mapping…" : "Map to Creation File"}
          </button>
          {showComplete ? (
            <button
              type="button"
              className="btn btn-sm"
              disabled={aiBusy}
              onClick={() => void runAiMap(true)}
              title="Extrapolate blank fields from context via AI"
            >
              {aiBusy ? "Completing…" : "✨ Complete with AI"}
            </button>
          ) : null}
        </div>
      ) : null}

      {mapped ? (
        <div
          className="mt-3 max-h-40 overflow-auto rounded-md border p-2 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        >
          <p className="mb-1 font-semibold text-[var(--text)]">
            Parsed {mapped.cfKind} template
            {draftHasBlankFields(mapped) ? " — some fields still blank" : ""}
          </p>
          <pre className="whitespace-pre-wrap break-words text-[var(--text-soft)]">
            {JSON.stringify(mapped.draft, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
