"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import {
  DDB_IMPORT_LEGAL_NOTICE,
  parseDdbPartyImport,
} from "@/lib/tabletop/importDdbCharacterJson";
import {
  saveCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";

/** Starter text so nobody has to know the format (or create a file) up front. */
const PARTY_TEMPLATE = `# My Party

## Characters

### Aria Windrunner — Wizard (Level 4)
- Player: Sam
- Race: Elf
- Background: Sage
- Alignment: Neutral Good
- AC: 13
- HP: 24
- Speed: 30
- STR 8, DEX 14, CON 12, INT 16, WIS 12, CHA 10
- Knows Fire Bolt and Shield; afraid of deep water

### Borin Stonehelm — Fighter (Level 4)
- Player: Alex
- Race: Dwarf
- Background: Soldier
- AC: 17
- HP: 36
- STR 16, DEX 12, CON 15, INT 10, WIS 11, CHA 9
- Carries the company banner
`;

const DDB_SHEET_TEMPLATE = `# My D&D Beyond party

## Characters

### Character name — Class (Level 1)
- Player: (optional)
- Race: (from your sheet)
- Background: (from your sheet)
- AC: (from your sheet)
- HP: (from your sheet)
- STR 10, DEX 10, CON 10, INT 10, WIS 10, CHA 10
- Spells, features, and gear notes go here
`;

type AddMode = "write" | "dndbeyond";

type AddPartyDialogProps = {
  onClose: () => void;
  /** Called with the refreshed party list and a status message after saving. */
  onSaved: (parties: SavedCharacterRoster[], message: string) => void;
};

export default function AddPartyDialog({ onClose, onSaved }: AddPartyDialogProps) {
  const [mode, setMode] = useState<AddMode>("write");
  const [text, setText] = useState("");
  const [ddbJson, setDdbJson] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ddbFileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseCharactersMarkdown(text), [text]);
  const ddbParsed = useMemo(() => {
    if (!ddbJson.trim()) return null;
    return parseDdbPartyImport(ddbJson);
  }, [ddbJson]);

  const rosterName =
    nameOverride.trim() ||
    (mode === "dndbeyond" && ddbParsed?.ok ? ddbParsed.rosterName : parsed.rosterName);
  const hasText = text.trim().length > 0;
  const activePlayers =
    mode === "dndbeyond" && ddbParsed?.ok
      ? ddbParsed.players
      : parsed.players;
  const activeMarkdown =
    mode === "dndbeyond" && ddbParsed?.ok ? ddbParsed.markdown : text;
  const activeSource = mode === "dndbeyond" ? "dndbeyond" : "import";

  const applyTemplate = () => {
    if (hasText && !window.confirm("Replace what you've typed with the example party?")) {
      return;
    }
    setText(PARTY_TEMPLATE);
    setError(null);
  };

  const applyDdbSheetTemplate = () => {
    setMode("write");
    setText(DDB_SHEET_TEMPLATE);
    setError(null);
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setMode("write");
    setError(null);
    e.target.value = "";
  };

  const onPickDdbFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDdbJson(await file.text());
    setMode("dndbeyond");
    setError(null);
    e.target.value = "";
  };

  const onSave = async () => {
    if (mode === "dndbeyond") {
      if (!ddbParsed?.ok) {
        setError(
          ddbParsed?.error ??
            "Paste JSON or choose a .json file from your device — we convert it here, on your browser only.",
        );
        return;
      }
    } else if (parsed.players.length === 0) {
      setError(
        "No heroes recognized yet. Each hero needs a heading line starting with ### — try “Use example party” to see how it looks.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const list = await saveCharacterRoster({
        name: rosterName,
        markdown: activeMarkdown,
        source: activeSource,
        players: activePlayers,
      });
      if (list[0]) void autoLinkToActiveCampaign({ partyId: list[0].id });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        `Saved “${rosterName}” with ${activePlayers.length} character${activePlayers.length === 1 ? "" : "s"} to Library → Parties.`,
      );
    } catch {
      setError("Could not save the party. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-party-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 id="add-party-title" className="font-display text-lg font-bold text-[var(--text)]">
          Add a party
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Bring heroes from your table into the Library. Saved fellowships are{" "}
          <strong className="text-[var(--text)]">your import</strong>: private, on your devices
          only — never merged into the app&apos;s included rules.
        </p>

        <div
          className="mt-3 flex flex-wrap gap-1 rounded-lg border p-1"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          role="tablist"
          aria-label="How to add heroes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "write"}
            className={`btn btn-sm flex-1 ${mode === "write" ? "btn-accent" : ""}`}
            onClick={() => {
              setMode("write");
              setError(null);
            }}
          >
            Write or paste
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "dndbeyond"}
            className={`btn btn-sm flex-1 ${mode === "dndbeyond" ? "btn-accent" : ""}`}
            onClick={() => {
              setMode("dndbeyond");
              setError(null);
            }}
          >
            From D&amp;D Beyond
          </button>
        </div>

        {mode === "write" ? (
          <>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-soft)]">
              Type or paste your heroes below — no file needed. Start from the example and
              replace the details, or load a saved party or character CF if you
              have one.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={applyTemplate} className="btn btn-sm btn-accent">
                Use example party
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm"
              >
                Load character or party CF…
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={(e) => void onPickFile(e)}
              />
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              rows={12}
              spellCheck={false}
              placeholder={"### Character name — Class (Level 1)\n- Race: …\n- AC: 10\n- HP: 10"}
              className="mt-3 w-full rounded-lg border p-3 font-mono text-xs leading-relaxed text-[var(--text)]"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />

            <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
              Format is forgiving: each character starts with <code>###</code> and a name. Labeled
              bullets like Race, AC, HP, and ability scores are picked up automatically; everything
              else is kept in the character&apos;s Notes.
            </p>
          </>
        ) : (
          <>
            <div
              className="mt-3 rounded-lg border p-3 text-xs leading-relaxed text-[var(--text)]/90"
              style={{ borderColor: "var(--accent-dim)", background: "var(--bg)" }}
            >
              {DDB_IMPORT_LEGAL_NOTICE}
            </div>

            <p className="mt-3 text-xs font-semibold text-[var(--text)]">
              Option A — copy from your hero sheet
            </p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--muted)]">
              <li>Open a character you created on dndbeyond.com (from books you own).</li>
              <li>
                For each PC, add a <code>### Name — Class (Level X)</code> heading and bullet lines
                for Race, AC, HP, and ability scores — same fields you see on the sheet.
              </li>
              <li>
                Put spells, features, and gear in the bullets too; they land in Notes on the
                sheet.
              </li>
            </ol>
            <button type="button" onClick={applyDdbSheetTemplate} className="btn btn-sm mt-2">
              Start blank sheet template
            </button>

            <p className="mt-4 text-xs font-semibold text-[var(--text)]">
              Option B — upload JSON you saved yourself
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              If you exported a character backup as <code>.json</code> (for example from a tool
              you use locally), paste it below or choose the file. Conversion happens on this
              device only — nothing is sent to D&amp;D Beyond or our servers.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => ddbFileInputRef.current?.click()}
                className="btn btn-sm"
              >
                Choose .json file…
              </button>
              <input
                ref={ddbFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => void onPickDdbFile(e)}
              />
            </div>

            <textarea
              value={ddbJson}
              onChange={(e) => {
                setDdbJson(e.target.value);
                if (error) setError(null);
              }}
              rows={8}
              spellCheck={false}
              placeholder='Paste character JSON here — one character or a list of characters'
              className="mt-3 w-full rounded-lg border p-3 font-mono text-xs leading-relaxed text-[var(--text)]"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            />
          </>
        )}

        <div
          className="mt-3 rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {activePlayers.length === 0 ? (
            <span className="text-[var(--muted)]">
              {mode === "dndbeyond"
                ? ddbJson.trim()
                  ? ddbParsed && !ddbParsed.ok
                    ? ddbParsed.error
                    : "No heroes recognized yet — check the JSON format."
                  : "Heroes found in your JSON will appear here."
                : hasText
                  ? "No heroes recognized yet — check that each one has a ### heading."
                  : "Heroes found in your text will appear here as you type."}
            </span>
          ) : (
            <>
              <span className="font-semibold text-[var(--text)]">
                Found {activePlayers.length} character{activePlayers.length === 1 ? "" : "s"}:
              </span>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {activePlayers.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full border px-2 py-0.5 text-[11px] text-[var(--text)]"
                    style={{ borderColor: "var(--accent-dim)" }}
                  >
                    {p.name}
                    {p.className ? ` — ${p.className}` : ""} (Lv {p.level})
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <label className="mt-3 block text-xs font-semibold text-[var(--text)]">
          Party name
          <input
            type="text"
            value={nameOverride}
            onChange={(e) => setNameOverride(e.target.value)}
            placeholder={
              mode === "dndbeyond" && ddbParsed?.ok
                ? ddbParsed.rosterName
                : parsed.rosterName
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal text-[var(--text)]"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}
          />
        </label>

        {error ? (
          <p className="mt-2 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-sm" disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            className="btn btn-sm btn-accent"
            disabled={saving || activePlayers.length === 0}
          >
            {saving ? "Saving…" : "Save party"}
          </button>
        </div>
      </div>
    </div>
  );
}
