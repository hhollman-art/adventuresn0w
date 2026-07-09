"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FIRST_SAVE_GATE_EVENT,
  resolveFirstSaveGate,
  type FirstSaveGateDetail,
} from "@/lib/workshop/firstSaveGate";
import {
  markVaultStorageConfigured,
  type VaultStorageMode,
} from "@/lib/workshop/vaultStoragePrefs";
import {
  connectSyncFolder,
  getLibrarySyncStatus,
  isLibrarySyncSupported,
} from "@/lib/workshop/librarySync";

/**
 * "Configure Your Arcane Vault Storage" — first custom CF save interceptor UI.
 * Persists the DM's default save path (browser sandbox vs filesystem sync).
 */
export default function FirstSaveVaultModal() {
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<VaultStorageMode>("browser-sandbox");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fsSupported, setFsSupported] = useState(true);
  const [folderHint, setFolderHint] = useState<string | null>(null);

  useEffect(() => {
    setFsSupported(isLibrarySyncSupported());
    void getLibrarySyncStatus().then((s) => {
      if (s.state === "on") setFolderHint(s.folderName);
      if (s.state === "needs-permission") setFolderHint(s.folderName);
    });
  }, []);

  useEffect(() => {
    const onGate = (event: Event) => {
      const detail = (event as CustomEvent<FirstSaveGateDetail>).detail;
      if (!detail?.requestId) return;
      setRequestId(detail.requestId);
      setLabel(detail.label || "your Creation File");
      setOpen(true);
      setError(null);
    };
    window.addEventListener(FIRST_SAVE_GATE_EVENT, onGate);
    return () => window.removeEventListener(FIRST_SAVE_GATE_EVENT, onGate);
  }, []);

  const finish = useCallback(
    (ok: boolean, filesystemLabel: string | null = null) => {
      if (!requestId) return;
      if (ok) {
        markVaultStorageConfigured({ mode, filesystemLabel });
      }
      resolveFirstSaveGate({
        requestId,
        ok,
        prefs: ok
          ? {
              version: 1,
              configured: true,
              mode,
              filesystemLabel,
              configuredAt: new Date().toISOString(),
            }
          : null,
      });
      setOpen(false);
      setRequestId(null);
      setBusy(false);
    },
    [mode, requestId],
  );

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "filesystem-sync") {
        if (!isLibrarySyncSupported()) {
          setError(
            "This browser cannot pick a folder. Choose Local Client Sandboxed Storage, or use Chrome/Edge.",
          );
          setBusy(false);
          return;
        }
        const result = await connectSyncFolder();
        if (!result.ok) {
          setError(
            result.cancelled
              ? "Folder picker cancelled — pick a folder or switch to browser storage."
              : result.error ?? "Could not connect that folder.",
          );
          setBusy(false);
          return;
        }
        finish(true, result.folderName);
        return;
      }
      finish(true, null);
    } catch {
      setError("Could not save vault preferences. Try again.");
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arcane-vault-title"
    >
      <div
        className="w-full max-w-md rounded-xl border p-5 shadow-2xl"
        style={{
          background: "linear-gradient(165deg, #1a1520 0%, #0f1419 55%, #12181f 100%)",
          borderColor: "rgba(196, 165, 116, 0.35)",
          boxShadow: "0 0 40px rgba(80, 40, 120, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="arcane-vault-title"
          className="font-display text-xl font-bold tracking-wide"
          style={{ color: "#e8d5a3" }}
        >
          Configure Your Arcane Vault Storage
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
          You&apos;re about to save <span className="text-[var(--text)]">{label}</span>{" "}
          for the first time. Choose where future Creation Files live by default.
          This preference is stored on this device.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Default save path</legend>
          <label
            className="flex cursor-pointer gap-3 rounded-lg border px-3 py-3"
            style={{
              borderColor:
                mode === "browser-sandbox" ? "rgba(196, 165, 116, 0.55)" : "var(--border)",
              background: mode === "browser-sandbox" ? "rgba(196, 165, 116, 0.08)" : "var(--bg)",
            }}
          >
            <input
              type="radio"
              name="vault-mode"
              checked={mode === "browser-sandbox"}
              onChange={() => setMode("browser-sandbox")}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-[var(--text)]">
                Local Client Sandboxed Browser Storage
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-soft)]">
                IndexedDB + localStorage on this browser profile. Export/restore backups
                anytime from The Library.
              </span>
            </span>
          </label>

          <label
            className={`flex gap-3 rounded-lg border px-3 py-3 ${
              fsSupported ? "cursor-pointer" : "opacity-60"
            }`}
            style={{
              borderColor:
                mode === "filesystem-sync" ? "rgba(196, 165, 116, 0.55)" : "var(--border)",
              background: mode === "filesystem-sync" ? "rgba(196, 165, 116, 0.08)" : "var(--bg)",
            }}
          >
            <input
              type="radio"
              name="vault-mode"
              checked={mode === "filesystem-sync"}
              disabled={!fsSupported}
              onChange={() => setMode("filesystem-sync")}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-[var(--text)]">
                Local File System export path
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-soft)]">
                Pick a folder (or OneDrive/Drive/Dropbox sync folder). The app auto-writes{" "}
                <code className="text-[var(--text)]">ddeasy-library.json</code> after each
                change — write-only, never auto-imports.
                {folderHint ? ` Current: ${folderHint}` : null}
                {!fsSupported ? " Not supported in this browser." : null}
              </span>
            </span>
          </label>
        </fieldset>

        {error ? (
          <p className="mt-3 rounded border border-red-400/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => finish(false)}
          >
            Cancel save
          </button>
          <button
            type="button"
            className="btn btn-sm btn-accent"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy
              ? "Saving preference…"
              : mode === "filesystem-sync"
                ? "Choose folder & continue"
                : "Save preference & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
