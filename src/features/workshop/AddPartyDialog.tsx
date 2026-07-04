"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import {
  saveCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

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

type AddPartyDialogProps = {
  onClose: () => void;
  /** Called with the refreshed party list and a status message after saving. */
  onSaved: (parties: SavedCharacterRoster[], message: string) => void;
};

export default function AddPartyDialog({ onClose, onSaved }: AddPartyDialogProps) {
  const [text, setText] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseCharactersMarkdown(text), [text]);
  const rosterName = nameOverride.trim() || parsed.rosterName;
  const hasText = text.trim().length > 0;

  const applyTemplate = () => {
    if (hasText && !window.confirm("Replace what you've typed with the example party?")) {
      return;
    }
    setText(PARTY_TEMPLATE);
    setError(null);
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setError(null);
    e.target.value = "";
  };

  const onSave = async () => {
    if (parsed.players.length === 0) {
      setError(
        "No characters recognized yet. Each character needs a heading line starting with ### — try “Use example party” to see how it looks.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const list = await saveCharacterRoster({
        name: rosterName,
        markdown: text,
        source: "import",
        players: parsed.players,
      });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        `Saved “${rosterName}” with ${parsed.players.length} character${parsed.players.length === 1 ? "" : "s"} to Library → Parties.`,
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
          Type or paste your characters below — no file needed. Start from the example and
          replace the details, or load a saved <code>.md</code> file if you have one. Saved
          parties are <strong className="text-[var(--text)]">your import</strong>: private,
          on your devices only.
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
            Load a file…
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
          else is kept in the character&apos;s Notes. Missing numbers get sensible defaults you
          can fix later on the sheet.
        </p>

        <div
          className="mt-3 rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {parsed.players.length === 0 ? (
            <span className="text-[var(--muted)]">
              {hasText
                ? "No characters recognized yet — check that each one has a ### heading."
                : "Characters found in your text will appear here as you type."}
            </span>
          ) : (
            <>
              <span className="font-semibold text-[var(--text)]">
                Found {parsed.players.length} character{parsed.players.length === 1 ? "" : "s"}:
              </span>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {parsed.players.map((p) => (
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
            placeholder={parsed.rosterName}
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
            disabled={saving || parsed.players.length === 0}
          >
            {saving ? "Saving…" : "Save party"}
          </button>
        </div>
      </div>
    </div>
  );
}
