"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import {
  characterSummary,
  effectiveAc,
  effectiveMaxHp,
  formatMod,
  proficiencyBonus,
} from "@/lib/tabletop/character";
import {
  CHARACTER_SORT_LABEL,
  CHARACTER_SOURCE_LABEL,
  deleteSavedCharacter,
  loadSavedCharacters,
  onCharactersChanged,
  saveCharacterToLibrary,
  sortSavedCharacters,
  type CharacterSortKey,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import {
  deleteSavedCharacterRoster,
  loadSavedCharacterRosters,
  onRostersChanged,
  PARTY_SOURCE_LABEL,
  updateCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  formatPartyUpdated,
  queuePartyImport,
  type PartyImportRequest,
} from "@/lib/tabletop/partyCampaign";
import {
  characterFileName,
  characterToMarkdownFile,
  fileSlug,
  rosterToMarkdown,
} from "@/lib/tabletop/characterMarkdown";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { workplace } from "@/lib/workplace";
import { THE_TAVERN, CHARACTER_CF, PARTY_CF } from "@/lib/workplace/forgeLexicon";
import { APP_ICONS } from "@/lib/ui/appIcons";
import WorkshopPageShell from "@/features/workshop/WorkshopPageShell";
import AddPartyDialog from "@/features/workshop/AddPartyDialog";
import CharacterEditorDialog from "./CharacterEditorDialog";
import PartyBuilderDialog from "./PartyBuilderDialog";
import VttExportPanel from "@/features/tabletop/VttExportPanel";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

function downloadMarkdownFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CharactersAndPartiesPage() {
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [rosters, setRosters] = useState<SavedCharacterRoster[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  /* Characters section state */
  const [sortKey, setSortKey] = useState<CharacterSortKey>("updated");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<SavedCharacter | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  /* Parties section state */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [showAddParty, setShowAddParty] = useState(false);
  const [showPartyBuilder, setShowPartyBuilder] = useState(false);

  const refresh = useCallback(async () => {
    const [chars, parties] = await Promise.all([
      loadSavedCharacters(),
      loadSavedCharacterRosters(),
    ]);
    setCharacters(chars);
    setRosters(parties);
  }, []);

  useEffect(() => {
    void refresh();
    const offChars = onCharactersChanged(() => void refresh());
    const offRosters = onRostersChanged(() => void refresh());
    return () => {
      offChars();
      offRosters();
    };
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const visibleCharacters = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? characters.filter((c) =>
          [c.player.name, c.player.playerName, c.player.className, c.player.species]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : characters;
    return sortSavedCharacters(filtered, sortKey);
  }, [characters, query, sortKey]);

  const selectedCharacters = useMemo(
    () => characters.filter((c) => selectedIds.includes(c.id)),
    [characters, selectedIds],
  );

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  /* ---- Character actions ---- */

  const downloadCharacterFile = (c: SavedCharacter) => {
    downloadMarkdownFile(characterFileName(c.player), characterToMarkdownFile(c.player));
    setStatus(
      `Downloaded ${c.player.name} as a ${CHARACTER_CF} — a portable sheet you can load anywhere in The Tavern or at the Virtual Table.`,
    );
  };

  const removeCharacter = async (c: SavedCharacter) => {
    setCharacters(await deleteSavedCharacter(c.id));
    setSelectedIds((prev) => prev.filter((x) => x !== c.id));
    scheduleLibrarySnapshot();
    setStatus(`${c.player.name} removed from your heroes. Fellowships keep their own copy.`);
  };

  const onImportCharacterFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = parseCharactersMarkdown(await file.text());
    e.target.value = "";
    if (parsed.players.length === 0) {
      setStatus(
        "No heroes recognized in that file. Character CFs need a ### heading per hero — export one from a fellowship to see the format.",
      );
      return;
    }
    let list: SavedCharacter[] = characters;
    for (const player of parsed.players) {
      list = await saveCharacterToLibrary({ player, source: "import" });
    }
    setCharacters(list);
    scheduleLibrarySnapshot();
    setStatus(
      `Added ${parsed.players.length} hero${parsed.players.length === 1 ? "" : "es"} from “${file.name}”.`,
    );
  };

  /* ---- Party building from characters ---- */

  const addSelectionToParty = async (rosterId: string) => {
    const roster = rosters.find((r) => r.id === rosterId);
    if (!roster || selectedCharacters.length === 0) return;
    const existingIds = new Set(roster.players.map((p) => p.id));
    const additions = selectedCharacters
      .filter((c) => !existingIds.has(c.id))
      .map((c) => ({ ...c.player, tokenId: null }));
    if (additions.length === 0) {
      setStatus(`Everyone selected is already in “${roster.name}”.`);
      return;
    }
    const players = [...roster.players, ...additions];
    const list = await updateCharacterRoster(roster.id, {
      players,
      markdown: rosterToMarkdown(roster.name, players),
    });
    setRosters(list);
    scheduleLibrarySnapshot();
    setSelectedIds([]);
    setStatus(
      `Added ${additions.length} hero${additions.length === 1 ? "" : "es"} to “${roster.name}”.`,
    );
  };

  const copyPartyToCharacters = async (roster: SavedCharacterRoster) => {
    const known = new Set(characters.map((c) => c.id));
    const additions = roster.players.filter((p) => !known.has(p.id));
    if (additions.length === 0) {
      setStatus(`Everyone in “${roster.name}” is already in your heroes.`);
      return;
    }
    let list: SavedCharacter[] = characters;
    for (const player of additions) {
      list = await saveCharacterToLibrary({ player, source: "party" });
    }
    setCharacters(list);
    scheduleLibrarySnapshot();
    setStatus(
      `Added ${additions.length} hero${additions.length === 1 ? "" : "es"} from “${roster.name}” to your heroes.`,
    );
  };

  /* ---- Party actions (unchanged behavior) ---- */

  const sendToVtt = (rosterId: string, options: Omit<PartyImportRequest, "rosterId">) => {
    queuePartyImport({ rosterId, ...options });
    setStatus("Opening Virtual Table with your party…");
    window.location.href = "/table";
  };

  const saveNotes = async (id: string) => {
    const list = await updateCharacterRoster(id, { notes: notesDraft });
    setRosters(list);
    setEditingNotesId(null);
    setStatus("Campaign notes saved.");
  };

  const renameParty = async (id: string, name: string) => {
    setRosters(await updateCharacterRoster(id, { name }));
  };

  const removeParty = async (id: string) => {
    const list = await deleteSavedCharacterRoster(id);
    setRosters(list);
    if (expandedId === id) setExpandedId(null);
    setStatus("Fellowship removed from library. Its heroes stay in your hero list.");
  };

  const downloadParty = (roster: SavedCharacterRoster) => {
    downloadMarkdownFile(
      `${fileSlug(roster.name)}.md`,
      rosterToMarkdown(roster.name, roster.players),
    );
    setStatus(
      `Downloaded “${roster.name}” as a ${PARTY_CF} — load it back through Add party or the Virtual Table.`,
    );
  };

  const downloadRosterCharacter = (player: SavedCharacterRoster["players"][number]) => {
    downloadMarkdownFile(characterFileName(player), characterToMarkdownFile(player));
    setStatus(
      `Downloaded ${player.name} as a ${CHARACTER_CF} — load it into any party, adventure, or Virtual Table session.`,
    );
  };

  return (
    <WorkshopPageShell>
      <div className="workshop-page-panel panel-scroll forge-forest-panel fantasy-panel rounded-xl border p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge mb-3">{THE_TAVERN}</p>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">
            <span aria-hidden="true">{APP_ICONS.tavern} </span>
            {workplace("tavern").label}
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--text-soft)]">
            {workplace("tavern").description} Generate a ready-made party with AI, create
            character CFs by hand, import saved sheets, then gather heroes into
            party CFs for campaigns and the Virtual Table.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/?mode=characters" className="btn btn-sm btn-accent">
            Generate heroes (AI)
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingCharacter(null);
              setEditorOpen(true);
            }}
            className="btn btn-sm btn-accent"
          >
            New hero
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="btn btn-sm"
            title={`Load a saved ${CHARACTER_CF} from this app or your auto-save folder`}
          >
            Import character CF
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => void onImportCharacterFile(e)}
          />
          <FantasyTooltipWrap label="Virtual Table" hint="Run combat, fog, tokens, and dice at the table">
            <Link href="/table" className="btn btn-sm">
              Virtual Table
            </Link>
          </FantasyTooltipWrap>
        </div>
      </div>

      {editorOpen ? (
        <CharacterEditorDialog
          character={editingCharacter}
          onClose={() => setEditorOpen(false)}
          onSaved={(list, message) => {
            setCharacters(list);
            setStatus(message);
            setEditorOpen(false);
          }}
        />
      ) : null}

      {showAddParty ? (
        <AddPartyDialog
          onClose={() => setShowAddParty(false)}
          onSaved={(list, message) => {
            setRosters(list);
            setStatus(message);
            setShowAddParty(false);
          }}
        />
      ) : null}

      {showPartyBuilder ? (
        <PartyBuilderDialog
          characters={characters}
          rosters={rosters}
          initialCharacterIds={selectedIds}
          onClose={() => setShowPartyBuilder(false)}
          onSaved={(list, message) => {
            setRosters(list);
            setStatus(message);
            setSelectedIds([]);
            setShowPartyBuilder(false);
          }}
        />
      ) : null}

      {/* ---- Heroes ---- */}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text)]">Heroes</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--text-soft)]">
            Every character CF you keep, import, or generate lives here. Select
            heroes to add them to a party CF below.
          </p>
        </div>
      </div>

      {status ? (
        <p
          className="mb-4 rounded-lg border px-3 py-2 text-sm text-[var(--text)]"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.1)",
          }}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {/* ---- Character list ---- */}

      {characters.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, player, class, species…"
            className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm text-[var(--text)]"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            aria-label="Search heroes"
          />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
            Sort
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as CharacterSortKey)}
              className="rounded-lg border px-2 py-1.5 text-sm text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {(Object.keys(CHARACTER_SORT_LABEL) as CharacterSortKey[]).map((key) => (
                <option key={key} value={key}>
                  {CHARACTER_SORT_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.08)" }}
        >
          <span className="font-semibold text-[var(--text)]">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            onClick={() => setShowPartyBuilder(true)}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Create party
          </button>
          {rosters.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) void addSelectionToParty(e.target.value);
              }}
              className="rounded-md border px-2 py-1.5 text-xs font-semibold text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              aria-label="Add selected heroes to an existing fellowship"
            >
              <option value="">Add to existing party…</option>
              {rosters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-md border px-2.5 py-1.5 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {characters.length === 0 ? (
        <div className="workshop-campaign-card rounded-xl border p-8 text-center text-sm text-[var(--text-soft)]">
          <p className="mb-2 text-[var(--text)]">No heroes yet.</p>
          <p>
            Click <strong className="text-[var(--text)]">New hero</strong> to build one
            sheet by sheet, <strong className="text-[var(--text)]">Import character CF</strong> to
            load a saved character CF, or open a fellowship below and copy its
            members here.
          </p>
        </div>
      ) : visibleCharacters.length === 0 ? (
        <p
          className="workshop-campaign-card rounded-xl border p-4 text-sm text-[var(--text-soft)]"
          style={{ borderColor: "var(--border)" }}
        >
          No heroes match “{query.trim()}”.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visibleCharacters.map((c) => {
            const p = c.player;
            const selected = selectedIds.includes(c.id);
            return (
              <li
                key={c.id}
                className="workshop-campaign-card rounded-xl border p-3 text-sm"
                style={{
                  borderColor: selected ? "var(--accent)" : "var(--border)",
                }}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelected(c.id)}
                    className="mt-1"
                    aria-label={`Select ${p.name} for a party`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--text)]">{p.name}</p>
                    {p.playerName ? (
                      <p className="text-[11px] text-[var(--text-soft)]">{p.playerName}</p>
                    ) : null}
                    <p className="text-xs text-[var(--text-soft)]">{characterSummary(p)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text)]">
                      <span>
                        AC <b>{effectiveAc(p)}</b>
                      </span>
                      <span>
                        HP <b>{effectiveMaxHp(p)}</b>
                      </span>
                      <span>
                        Prof <b>{formatMod(proficiencyBonus(p.level))}</b>
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] text-[var(--text-soft)]">
                      {CHARACTER_SOURCE_LABEL[c.source]} · Updated {formatPartyUpdated(c.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCharacter(c);
                      setEditorOpen(true);
                    }}
                    className="rounded-md border px-2.5 py-1 text-xs font-semibold text-[var(--text)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCharacterFile(c)}
                    className="rounded-md border px-2.5 py-1 text-xs text-[var(--text)]"
                    style={{ borderColor: "var(--border)" }}
                    title={`Save ${p.name} as a ${CHARACTER_CF}`}
                  >
                    Export character CF
                  </button>
                  <VttExportPanel compact player={p} />
                  <button
                    type="button"
                    onClick={() => void removeCharacter(c)}
                    className="rounded-md border px-2.5 py-1 text-xs text-red-800"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---- Parties ---- */}

      <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--text)]">Fellowships</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--text-soft)]">
            A fellowship is a party CF — a group of heroes saved as one unit.
            Link it to a campaign, track its progress, and load it onto the Virtual Table.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPartyBuilder(true)}
            className="btn btn-sm btn-accent"
            title="Combine your heroes and existing fellowships into a new fellowship"
          >
            Build party
          </button>
          <button type="button" onClick={() => setShowAddParty(true)} className="btn btn-sm">
            Add party
          </button>
        </div>
      </div>

      {rosters.length === 0 ? (
        <div className="workshop-campaign-card rounded-xl border p-6 text-center text-sm text-[var(--text-soft)]">
          <p className="mb-2 text-[var(--text)]">No parties yet.</p>
          <p>
            Select heroes above and click{" "}
            <strong className="text-[var(--text)]">Create party</strong>, or click{" "}
            <strong className="text-[var(--text)]">Add party</strong> to type, paste, or import
            a whole group at once.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rosters.map((roster) => {
            const open = expandedId === roster.id;
            return (
              <li
                key={roster.id}
                className="workshop-campaign-card rounded-xl border"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex flex-wrap items-start gap-2 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(open ? null : roster.id)}
                  >
                    <input
                      value={roster.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const name = e.target.value;
                        setRosters((prev) =>
                          prev.map((r) => (r.id === roster.id ? { ...r, name } : r)),
                        );
                      }}
                      onBlur={(e) => void renameParty(roster.id, e.target.value)}
                      className="mb-1 w-full max-w-md rounded border bg-transparent px-1 py-0.5 font-display text-lg font-bold text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      style={{ borderColor: "transparent" }}
                      aria-label="Party name"
                    />
                    <p className="text-xs text-[var(--text-soft)]">
                      {roster.players.length} hero{roster.players.length === 1 ? "" : "es"} ·{" "}
                      {PARTY_SOURCE_LABEL[roster.source]} · Updated{" "}
                      {formatPartyUpdated(roster.updatedAt)}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        sendToVtt(roster.id, {
                          placeTokens: true,
                          linkCampaign: true,
                          replaceExisting: true,
                        })
                      }
                      className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
                      style={{ background: "var(--accent)" }}
                      title="Replace the VTT party, link for save-back, and place tokens"
                    >
                      Load campaign
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        sendToVtt(roster.id, {
                          placeTokens: false,
                          linkCampaign: false,
                          replaceExisting: false,
                        })
                      }
                      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Import once
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadParty(roster)}
                      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
                      style={{ borderColor: "var(--border)" }}
                      title={`Save this fellowship as a ${PARTY_CF} you can load anywhere`}
                    >
                      Export party CF
                    </button>
                    <VttExportPanel compact party={roster} />
                    <button
                      type="button"
                      onClick={() => void copyPartyToCharacters(roster)}
                      className="rounded-md border px-2.5 py-1.5 text-xs"
                      style={{ borderColor: "var(--border)" }}
                      title="Copy this fellowship's members into your hero list above"
                    >
                      Copy to heroes
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeParty(roster.id)}
                      className="rounded-md border px-2.5 py-1.5 text-xs text-red-800"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {open ? (
                  <div
                    className="border-t px-4 py-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold tracking-wide uppercase text-[var(--text)]">
                          Campaign notes
                        </p>
                        {editingNotesId === roster.id ? (
                          <button
                            type="button"
                            onClick={() => void saveNotes(roster.id)}
                            className="rounded border px-2 py-0.5 text-[10px] font-semibold"
                            style={{ borderColor: "var(--accent-dim)" }}
                          >
                            Save notes
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesId(roster.id);
                              setNotesDraft(roster.notes);
                            }}
                            className="rounded border px-2 py-0.5 text-[10px]"
                            style={{ borderColor: "var(--border)" }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      {editingNotesId === roster.id ? (
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={4}
                          placeholder="Plot threads, downtime, treasure found, NPC relationships…"
                          className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--text)]"
                          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-[var(--text-soft)]">
                          {roster.notes.trim() || "No campaign notes yet."}
                        </p>
                      )}
                    </div>

                    <p className="mb-2 text-xs font-bold tracking-wide uppercase text-[var(--text)]">
                      Heroes
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {roster.players.map((p) => {
                        const maxHp = effectiveMaxHp(p);
                        const hpLabel =
                          p.currentHp != null ? `${p.currentHp}/${maxHp} HP` : `${maxHp} HP max`;
                        return (
                          <div
                            key={p.id}
                            className="workshop-campaign-check rounded-lg border p-3 text-sm"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-[var(--text)]">{p.name}</p>
                              <button
                                type="button"
                                onClick={() => downloadRosterCharacter(p)}
                                className="shrink-0 rounded border px-2 py-0.5 text-[10px] text-[var(--text)]"
                                style={{ borderColor: "var(--border)" }}
                                title={`Save ${p.name} as a ${CHARACTER_CF}`}
                              >
                                Export CF
                              </button>
                            </div>
                            {p.playerName ? (
                              <p className="text-[11px] text-[var(--text-soft)]">{p.playerName}</p>
                            ) : null}
                            <p className="text-xs text-[var(--text-soft)]">{characterSummary(p)}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text)]">
                              <span>
                                AC <b>{effectiveAc(p)}</b>
                              </span>
                              <span>
                                HP <b>{hpLabel}</b>
                              </span>
                              <span>
                                Prof <b>{formatMod(proficiencyBonus(p.level))}</b>
                              </span>
                            </div>
                            {p.items.length > 0 ? (
                              <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--text-soft)]">
                                {p.items.map((item) => (
                                  <li key={item.id}>
                                    {item.name}
                                    {item.notes ? ` — ${item.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {p.notes.trim() ? (
                              <p className="mt-2 line-clamp-3 text-[11px] text-[var(--text-soft)]">
                                {p.notes}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </WorkshopPageShell>
  );
}
