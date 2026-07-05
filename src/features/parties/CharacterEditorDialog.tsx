"use client";

import { useState } from "react";
import {
  ABILITY_LIST,
  abilityMod,
  emptyBonuses,
  formatMod,
  proficiencyBonus,
} from "@/lib/tabletop/character";
import type { AbilityScores, CharacterItem, PlayerCharacter } from "@/lib/tabletop/types";
import { newId } from "@/lib/tabletop/session";
import {
  saveCharacterToLibrary,
  updateCharacterInLibrary,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  SrdClassSubclassFields,
  SrdSpellPicker,
  SrdSpeciesSelect,
} from "@/features/ui/SrdPickers";

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
] as const;

type Draft = Omit<PlayerCharacter, "tokenId">;

function emptyDraft(): Draft {
  return {
    id: newId(),
    name: "",
    playerName: "",
    species: "",
    className: "",
    subclass: "",
    background: "",
    alignment: "",
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ac: 10,
    maxHp: 10,
    speed: 30,
    notes: "",
    items: [],
    knownSpellIds: [],
    currentHp: null,
  };
}

function draftFrom(character: SavedCharacter): Draft {
  const { tokenId: _tokenId, ...rest } = character.player;
  return { ...rest, items: rest.items.map((i) => ({ ...i, bonuses: { ...i.bonuses } })) };
}

type CharacterEditorDialogProps = {
  /** When set, the dialog edits this character; otherwise it creates a new one. */
  character?: SavedCharacter | null;
  onClose: () => void;
  /** Called with the refreshed character list and a status message after saving. */
  onSaved: (characters: SavedCharacter[], message: string) => void;
};

export default function CharacterEditorDialog({
  character,
  onClose,
  onSaved,
}: CharacterEditorDialogProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    character ? draftFrom(character) : emptyDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setAbility = (key: keyof AbilityScores, value: number) =>
    setDraft((d) => ({ ...d, abilities: { ...d.abilities, [key]: value } }));

  const setNumber = (key: "level" | "ac" | "maxHp" | "speed", raw: string, fallback: number) => {
    const n = Number.parseInt(raw, 10);
    set(key, Number.isFinite(n) ? n : fallback);
  };

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, { id: newId(), name: "", notes: "", bonuses: emptyBonuses() }],
    }));

  const patchItem = (id: string, patch: Partial<Pick<CharacterItem, "name" | "notes">>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const removeItem = (id: string) =>
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const onSave = async () => {
    if (!draft.name.trim()) {
      setError("Give this character a name first.");
      return;
    }
    setSaving(true);
    setError(null);
    const cleaned: Draft = {
      ...draft,
      items: draft.items.filter((i) => i.name.trim() !== ""),
    };
    try {
      const list = character
        ? await updateCharacterInLibrary(character.id, cleaned)
        : await saveCharacterToLibrary({ player: cleaned, source: "created" });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        character
          ? `Saved changes to ${draft.name.trim()}.`
          : `${draft.name.trim()} added to your characters.`,
      );
    } catch {
      setError("Could not save this character. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-editor-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2
          id="character-editor-title"
          className="font-display text-lg font-bold text-[var(--text)]"
        >
          {character ? `Edit ${character.player.name}` : "Create a character"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Characters live in your library on this device. Add one to a party any time — the
          party is what campaigns and the Virtual Table use.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Character name</span>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Aria Windrunner"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Player (optional)</span>
            <input
              value={draft.playerName}
              onChange={(e) => set("playerName", e.target.value)}
              placeholder="Who plays them"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <SrdSpeciesSelect value={draft.species} onChange={(v) => set("species", v)} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Level</span>
            <input
              type="number"
              min={1}
              max={20}
              value={draft.level}
              onChange={(e) => setNumber("level", e.target.value, 1)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <SrdClassSubclassFields
            className={draft.className}
            subclass={draft.subclass}
            onClassChange={(v) => set("className", v)}
            onSubclassChange={(v) => set("subclass", v)}
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Background</span>
            <input
              value={draft.background}
              onChange={(e) => set("background", e.target.value)}
              placeholder="Soldier"
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Alignment</span>
            <select
              value={draft.alignment}
              onChange={(e) => set("alignment", e.target.value)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-bold tracking-wide uppercase">
            Ability scores{" "}
            <span className="font-normal normal-case text-[var(--muted)]">
              (Prof {formatMod(proficiencyBonus(draft.level))})
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ABILITY_LIST.map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1 text-xs">
                <span className="font-semibold">
                  {label}{" "}
                  <span className="font-normal text-[var(--muted)]">
                    {formatMod(abilityMod(draft.abilities[key]))}
                  </span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={draft.abilities[key]}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    setAbility(key, Number.isFinite(n) ? n : 10);
                  }}
                  className="rounded border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">AC</span>
            <input
              type="number"
              min={1}
              max={40}
              value={draft.ac}
              onChange={(e) => setNumber("ac", e.target.value, 10)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Max HP</span>
            <input
              type="number"
              min={1}
              max={999}
              value={draft.maxHp}
              onChange={(e) => setNumber("maxHp", e.target.value, 10)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Speed (ft)</span>
            <input
              type="number"
              min={0}
              max={200}
              value={draft.speed}
              onChange={(e) => setNumber("speed", e.target.value, 30)}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-bold tracking-wide uppercase">Gear &amp; items</p>
            <button
              type="button"
              onClick={addItem}
              className="rounded border px-2 py-0.5 text-[10px] font-semibold"
              style={{ borderColor: "var(--accent-dim)" }}
            >
              Add item
            </button>
          </div>
          {draft.items.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              No gear yet. Stat bonuses (like +1 armor) can be tuned on the Virtual Table sheet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {draft.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => patchItem(item.id, { name: e.target.value })}
                    placeholder="Item name"
                    className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    aria-label="Item name"
                  />
                  <input
                    value={item.notes}
                    onChange={(e) => patchItem(item.id, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    aria-label="Item notes"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded border px-2 py-1 text-xs text-red-800"
                    style={{ borderColor: "var(--border)" }}
                    aria-label={`Remove ${item.name || "item"}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <SrdSpellPicker
            className={draft.className}
            selectedIds={draft.knownSpellIds}
            onChange={(ids) => set("knownSpellIds", ids)}
          />
        </div>

        <label className="mt-4 flex flex-col gap-1 text-xs">
          <span className="font-semibold">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Features, languages, proficiencies, backstory…"
            className="rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>

        {error ? (
          <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="btn btn-sm btn-accent"
          >
            {saving ? "Saving…" : character ? "Save changes" : "Create character"}
          </button>
        </div>
      </div>
    </div>
  );
}
