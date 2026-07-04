"use client";

import { useCallback, useEffect, useState } from "react";
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
  deleteSavedCharacterRoster,
  loadSavedCharacterRosters,
  onRostersChanged,
  PARTY_SOURCE_LABEL,
  saveCharacterRoster,
  updateCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import {
  formatPartyUpdated,
  queuePartyImport,
  type PartyImportRequest,
} from "@/lib/tabletop/partyCampaign";

export default function PartyLibraryPage() {
  const [rosters, setRosters] = useState<SavedCharacterRoster[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const refresh = useCallback(async () => {
    setRosters(await loadSavedCharacterRosters());
  }, []);

  useEffect(() => {
    void refresh();
    return onRostersChanged(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const sendToVtt = (rosterId: string, options: Omit<PartyImportRequest, "rosterId">) => {
    queuePartyImport({ rosterId, ...options });
    setStatus("Opening Virtual Table with your party…");
    window.location.href = "/table";
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const text = await file.text();
    const parsed = parseCharactersMarkdown(text);
    if (parsed.players.length === 0) {
      setStatus("No characters found in that file.");
      e.target.value = "";
      return;
    }
    const list = await saveCharacterRoster({
      name: parsed.rosterName,
      markdown: text,
      source: "import",
      players: parsed.players,
    });
    setRosters(list);
    setStatus(`Saved ${parsed.players.length} characters from ${file.name}.`);
    e.target.value = "";
  };

  const saveNotes = async (id: string) => {
    const list = await updateCharacterRoster(id, { notes: notesDraft });
    setRosters(list);
    setEditingNotesId(null);
    setStatus("Campaign notes saved.");
  };

  const renameParty = async (id: string, name: string) => {
    const list = await updateCharacterRoster(id, { name });
    setRosters(list);
  };

  const removeParty = async (id: string) => {
    const list = await deleteSavedCharacterRoster(id);
    setRosters(list);
    if (expandedId === id) setExpandedId(null);
    setStatus("Party removed from library.");
  };

  return (
    <main className="app-main app-main--workshop mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge mb-3">Party library</p>
          <h1 className="font-display text-2xl font-bold">Saved parties</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Review saved parties, track campaign progress (levels, gear, HP), and load them onto the
            Virtual Table. Progress saved from the VTT updates the linked party here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-sm cursor-pointer">
            Import .md roster&hellip;
            <input
              type="file"
              accept=".md,text/markdown,text/plain"
              className="hidden"
              onChange={onImportFile}
            />
          </label>
          <Link href="/table" className="btn btn-sm btn-accent">
            Virtual Table
          </Link>
        </div>
      </div>

      {status ? (
        <p
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.1)",
          }}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {rosters.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center text-sm text-[var(--muted)]"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="mb-2">No saved parties yet.</p>
          <p>
            Generate characters in the workshop and click{" "}
            <strong className="text-[var(--text)]">Save party for VTT</strong>, build a party on the
            Virtual Table and click <strong className="text-[var(--text)]">Save to party library</strong>
            , or import a character markdown file above.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rosters.map((roster) => {
            const open = expandedId === roster.id;
            return (
              <li
                key={roster.id}
                className="rounded-xl border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
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
                      className="mb-1 w-full max-w-md rounded border bg-transparent px-1 py-0.5 font-display text-lg font-bold outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      style={{ borderColor: "transparent" }}
                      aria-label="Party name"
                    />
                    <p className="text-xs text-[var(--muted)]">
                      {roster.players.length} character{roster.players.length === 1 ? "" : "s"} ·{" "}
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
                        <p className="text-xs font-bold tracking-wide uppercase">Campaign notes</p>
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
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">
                          {roster.notes.trim() || "No campaign notes yet."}
                        </p>
                      )}
                    </div>

                    <p className="mb-2 text-xs font-bold tracking-wide uppercase">Characters</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {roster.players.map((p) => {
                        const maxHp = effectiveMaxHp(p);
                        const hpLabel =
                          p.currentHp != null ? `${p.currentHp}/${maxHp} HP` : `${maxHp} HP max`;
                        return (
                          <div
                            key={p.id}
                            className="rounded-lg border p-3 text-sm"
                            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                          >
                            <p className="font-bold">{p.name}</p>
                            {p.playerName ? (
                              <p className="text-[11px] text-[var(--muted)]">{p.playerName}</p>
                            ) : null}
                            <p className="text-xs text-[var(--muted)]">{characterSummary(p)}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
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
                              <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--muted)]">
                                {p.items.map((item) => (
                                  <li key={item.id}>
                                    {item.name}
                                    {item.notes ? ` — ${item.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {p.notes.trim() ? (
                              <p className="mt-2 line-clamp-3 text-[11px] text-[var(--muted)]">
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
    </main>
  );
}
