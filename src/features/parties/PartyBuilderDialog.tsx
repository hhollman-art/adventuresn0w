"use client";

import { useMemo, useState } from "react";
import { characterSummary } from "@/lib/tabletop/character";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import {
  saveCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { rosterToMarkdown } from "@/lib/tabletop/characterMarkdown";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

type PartyBuilderDialogProps = {
  characters: SavedCharacter[];
  rosters: SavedCharacterRoster[];
  /** Characters pre-selected from the page's checkboxes. */
  initialCharacterIds: string[];
  onClose: () => void;
  /** Called with the refreshed party list and a status message after saving. */
  onSaved: (parties: SavedCharacterRoster[], message: string) => void;
};

export default function PartyBuilderDialog({
  characters,
  rosters,
  initialCharacterIds,
  onClose,
  onSaved,
}: PartyBuilderDialogProps) {
  const [name, setName] = useState("");
  const [characterIds, setCharacterIds] = useState<string[]>(initialCharacterIds);
  const [rosterIds, setRosterIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleCharacter = (id: string) =>
    setCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleRoster = (id: string) =>
    setRosterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  /** Selected characters first, then members of selected parties, deduped by id. */
  const members = useMemo(() => {
    const seen = new Set<string>();
    const list: PlayerCharacter[] = [];
    for (const c of characters) {
      if (!characterIds.includes(c.id) || seen.has(c.id)) continue;
      seen.add(c.id);
      list.push({ ...c.player, tokenId: null });
    }
    for (const r of rosters) {
      if (!rosterIds.includes(r.id)) continue;
      for (const p of r.players) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        list.push({ ...p, tokenId: null });
      }
    }
    return list;
  }, [characters, characterIds, rosters, rosterIds]);

  const onSave = async () => {
    if (members.length === 0) {
      setError("Pick at least one hero or fellowship to build from.");
      return;
    }
    setSaving(true);
    setError(null);
    const partyName = name.trim() || "New party";
    try {
      const list = await saveCharacterRoster({
        name: partyName,
        source: "builder",
        markdown: rosterToMarkdown(partyName, members),
        players: members,
      });
      if (list[0]) void autoLinkToActiveCampaign({ partyId: list[0].id });
      scheduleLibrarySnapshot();
      onSaved(
        list,
        `Fellowship “${partyName}” created with ${members.length} hero${members.length === 1 ? "" : "es"} — ready for campaigns and the Virtual Table.`,
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
      aria-labelledby="party-builder-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 id="party-builder-title" className="font-display text-lg font-bold text-[var(--text)]">
          Build a party
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-soft)]">
          Pick heroes, existing fellowships, or both — members are combined into one new party
          CF (each hero appears once). The originals are never changed.
        </p>

        <label className="mt-4 flex flex-col gap-1 text-xs">
          <span className="font-semibold">Party name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Gilded Compass"
            className="rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            autoFocus
          />
        </label>

        <div className="mt-4">
          <p className="mb-1 text-xs font-bold tracking-wide uppercase">Your heroes</p>
          {characters.length === 0 ? (
            <p className="text-xs text-[var(--text-soft)]">
              No heroes in your library yet — you can still build from existing fellowships
              below.
            </p>
          ) : (
            <div
              className="max-h-44 overflow-y-auto rounded border p-1"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {characters.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs hover:bg-[rgba(154,116,22,0.06)]"
                >
                  <input
                    type="checkbox"
                    checked={characterIds.includes(c.id)}
                    onChange={() => toggleCharacter(c.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">{c.player.name}</span>{" "}
                    <span className="text-[var(--text-soft)]">({characterSummary(c.player)})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-bold tracking-wide uppercase">
            Include members of existing parties
          </p>
          {rosters.length === 0 ? (
            <p className="text-xs text-[var(--text-soft)]">
              No saved parties yet — parties you generate in the workshop, import, or save from
              the Virtual Table will show up here.
            </p>
          ) : (
            <div
              className="max-h-44 overflow-y-auto rounded border p-1"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {rosters.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs hover:bg-[rgba(154,116,22,0.06)]"
                >
                  <input
                    type="checkbox"
                    checked={rosterIds.includes(r.id)}
                    onChange={() => toggleRoster(r.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">{r.name}</span>{" "}
                    <span className="text-[var(--text-soft)]">
                      ({r.players.length} hero{r.players.length === 1 ? "" : "es"})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-[var(--text-soft)]">
          {members.length === 0
            ? "Nothing selected yet."
            : `New fellowship will have ${members.length} hero${members.length === 1 ? "" : "es"}: ${members
                .map((m) => m.name)
                .join(", ")}`}
        </p>

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
            disabled={saving || members.length === 0}
            className="btn btn-sm btn-accent"
          >
            {saving ? "Saving…" : "Create party"}
          </button>
        </div>
      </div>
    </div>
  );
}
