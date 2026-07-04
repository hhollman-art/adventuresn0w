"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import BattleStage, { type StageTool } from "@/features/tabletop/BattleStage";
import { useGenerationLibraryImages } from "@/features/tabletop/useGenerationLibraryImages";
import {
  ABILITY_LIST,
  ITEM_BONUS_FIELDS,
  abilityMod,
  characterSummary,
  effectiveAbilities,
  effectiveAc,
  effectiveInitiative,
  effectiveMaxHp,
  effectivePassivePerception,
  effectiveSpeed,
  emptyBonuses,
  formatMod,
  proficiencyBonus,
  sumItemBonuses,
} from "@/lib/tabletop/character";
import {
  getSavedCharacterRoster,
  loadSavedCharacterRosters,
  onRostersChanged,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { addRevealed, allCells, clampTokenPosition, removeRevealed } from "@/lib/tabletop/grid";
import { FEET_PER_CELL_OPTIONS, formatTokenSizeOption, TOKEN_SIZE_CATEGORY, tokenCellFootprint } from "@/lib/tabletop/gridScale";
import { VTT_GRID_PRESETS } from "@/lib/tabletop/gridPresets";
import { prepareMapImage, readImageSource } from "@/lib/tabletop/mapImage";
import {
  applyPartyImport,
  consumePendingPartyImport,
  savePartyFromSession,
} from "@/lib/tabletop/partyCampaign";
import { prepareTokenImage } from "@/lib/tabletop/tokenImage";
import {
  advanceInitiative,
  appendLog,
  createDefaultSession,
  newId,
  sortInitiative,
} from "@/lib/tabletop/session";
import { loadTabletopSession, saveTabletopSession } from "@/lib/tabletop/store";
import { createDmSync } from "@/lib/tabletop/sync";
import { useFullscreen } from "@/features/tabletop/useFullscreen";
import {
  TOKEN_COLOR_PALETTE,
  TOKEN_KIND_DEFAULT_COLOR,
  TOKEN_KIND_LABEL,
  type PlayerCharacter,
  type CharacterItem,
  type ItemBonuses,
  type TabletopSession,
  type TabletopToken,
  type TokenKind,
} from "@/lib/tabletop/types";

const QUICK_DICE = ["1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "2d6", "1d100"];

type SidePanel = "party" | "tokens" | "initiative" | "dice" | "map";

export default function TabletopPage() {
  const [session, setSession] = useState<TabletopSession | null>(null);
  const sessionRef = useRef<TabletopSession>(createDefaultSession());
  const syncRef = useRef<ReturnType<typeof createDmSync> | null>(null);

  const [tool, setTool] = useState<StageTool>("select");
  const [brushRadius, setBrushRadius] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<SidePanel>("tokens");
  const mainRef = useRef<HTMLElement | null>(null);
  const pendingImportHandled = useRef(false);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  useEffect(() => {
    let cancelled = false;
    void loadTabletopSession().then((stored) => {
      if (cancelled) return;
      const initial = stored ?? createDefaultSession();
      sessionRef.current = initial;
      setSession(initial);
    });
    const sync = createDmSync(() => sessionRef.current);
    syncRef.current = sync;
    return () => {
      cancelled = true;
      sync.close();
      syncRef.current = null;
    };
  }, []);

  const update = useCallback((fn: (s: TabletopSession) => TabletopSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...fn(prev), updatedAt: new Date().toISOString() };
      sessionRef.current = next;
      saveTabletopSession(next);
      syncRef.current?.publish(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session || pendingImportHandled.current) return;
    const pending = consumePendingPartyImport();
    if (!pending) return;
    pendingImportHandled.current = true;
    void getSavedCharacterRoster(pending.rosterId).then((roster) => {
      if (!roster) return;
      update((s) => applyPartyImport(s, roster, pending, newPlayerToken));
      setPanel("party");
    });
  }, [session, update]);

  if (!session) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-[var(--muted)]">
        Preparing the table&hellip;
      </main>
    );
  }

  const selectedToken = session.tokens.find((t) => t.id === selectedTokenId) ?? null;
  const activeEntry = session.initiative.entries[session.initiative.activeIndex] ?? null;

  const openPlayerView = () => {
    window.open("/table/player", "ddeasy-player-view", "noopener");
  };

  return (
    <main
      ref={mainRef}
      className="mx-auto flex w-full max-w-[110rem] flex-col gap-3 px-3 pb-4"
      style={{
        height: isFullscreen ? "100vh" : "calc(100vh - 140px)",
        minHeight: 480,
        paddingTop: isFullscreen ? 12 : 0,
        // When <main> itself is the fullscreen element the page background
        // behind it is not rendered, so paint the parchment color directly.
        background: isFullscreen ? "var(--bg)" : undefined,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="rounded-md border px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent-dim)] hover:text-[var(--text)]"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          &larr; Back to workshop
        </Link>
        <h1 className="font-display text-lg font-bold">Virtual Table</h1>
        <span
          className="mr-2 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.15)",
            color: "var(--accent)",
          }}
          title="This is the Dungeon Master's screen. Players see the separate player view."
        >
          DM view
        </span>

        <ToolButton
          label="Move"
          active={tool === "select"}
          onClick={() => setTool("select")}
          title="Drag tokens, drag empty ground to pan, scroll to zoom"
        />
        <ToolButton
          label="Reveal fog"
          active={tool === "reveal"}
          onClick={() => setTool("reveal")}
          title="Paint fog away for the players"
        />
        <ToolButton
          label="Hide fog"
          active={tool === "hide"}
          onClick={() => setTool("hide")}
          title="Paint fog back over the map"
        />
        {(tool === "reveal" || tool === "hide") && (
          <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
            Brush
            <select
              value={brushRadius}
              onChange={(e) => setBrushRadius(Number(e.target.value))}
              className="rounded border px-1 py-0.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <option value={0}>1 cell</option>
              <option value={1}>3&times;3</option>
              <option value={2}>5&times;5</option>
              <option value={3}>7&times;7</option>
            </select>
          </label>
        )}

        <span className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />

        <ToggleChip
          label="Fog"
          checked={session.fog.enabled}
          onChange={(v) => update((s) => ({ ...s, fog: { ...s.fog, enabled: v } }))}
        />
        <ToggleChip
          label="Grid"
          checked={session.grid.visible}
          onChange={(v) => update((s) => ({ ...s, grid: { ...s.grid, visible: v } }))}
        />
        <ToggleChip
          label="Snap"
          checked={session.grid.snap}
          onChange={(v) => update((s) => ({ ...s, grid: { ...s.grid, snap: v } }))}
        />

        <span className="flex-1" />

        {activeEntry && (
          <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: "rgba(154,116,22,0.15)" }}>
            Round {session.initiative.round}: {activeEntry.name}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleFullscreen(mainRef.current)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--border)" }}
          title={isFullscreen ? "Leave full screen" : "Fill the whole screen for play"}
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
        <button
          type="button"
          onClick={openPlayerView}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{
            borderColor: "var(--accent-dim)",
            background: "linear-gradient(180deg, rgba(201,162,39,0.4), rgba(154,116,22,0.25))",
          }}
        >
          Open player view &#8599;
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <BattleStage
            session={session}
            mode="dm"
            tool={tool}
            brushRadius={brushRadius}
            selectedTokenId={selectedTokenId}
            activeTokenId={activeEntry?.tokenId ?? null}
            onSelectToken={setSelectedTokenId}
            onMoveToken={(id, x, y) =>
              update((s) => ({
                ...s,
                tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)),
              }))
            }
            onPaintCells={(keys, reveal) =>
              update((s) => ({
                ...s,
                fog: {
                  ...s.fog,
                  revealed: reveal
                    ? addRevealed(s.fog.revealed, keys)
                    : removeRevealed(s.fog.revealed, keys),
                },
              }))
            }
          />
        </div>

        <aside
          className="fantasy-panel flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex border-b text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
            {(
              [
                ["party", "Party"],
                ["tokens", "Tokens"],
                ["initiative", "Initiative"],
                ["dice", "Dice"],
                ["map", "Map"],
              ] as [SidePanel, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className="flex-1 px-2 py-2"
                style={
                  panel === id
                    ? { background: "rgba(154,116,22,0.15)", color: "var(--accent)" }
                    : { color: "var(--muted)" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {panel === "party" && (
              <PartyPanel session={session} update={update} onSelectToken={setSelectedTokenId} />
            )}
            {panel === "tokens" && (
              <TokensPanel
                session={session}
                selectedToken={selectedToken}
                onSelect={setSelectedTokenId}
                update={update}
              />
            )}
            {panel === "initiative" && <InitiativePanel session={session} update={update} />}
            {panel === "dice" && <DicePanel session={session} update={update} />}
            {panel === "map" && <MapPanel session={session} update={update} />}
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------- party */

function PartyPanel({
  session,
  update,
  onSelectToken,
}: {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
  onSelectToken: (id: string | null) => void;
}) {
  const [sheet, setSheet] = useState<PlayerCharacter | "new" | null>(null);
  const [savedRosters, setSavedRosters] = useState<SavedCharacterRoster[]>([]);
  const [partyMsg, setPartyMsg] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => {
      void loadSavedCharacterRosters().then(setSavedRosters);
    };
    reload();
    return onRostersChanged(reload);
  }, []);

  const linkedRoster =
    savedRosters.find((r) => r.id === session.activePartyId) ??
    (session.activePartyId ? ({ id: session.activePartyId, name: "Linked party" } as SavedCharacterRoster) : null);

  const saveToLibrary = async (linkNew: boolean) => {
    if (session.players.length === 0) {
      setPartyMsg("Add at least one character before saving.");
      return;
    }
    let name: string | undefined;
    if (!session.activePartyId || linkNew) {
      const suggested =
        session.players.length === 1
          ? session.players[0].name
          : `Campaign party (${session.players.length})`;
      const entered = window.prompt("Party name for your library:", suggested);
      if (entered === null) return;
      name = entered;
    }
    const { roster } = await savePartyFromSession(session, { name });
    if (!roster) return;
    const wasLinkedUpdate = session.activePartyId && !linkNew;
    if (linkNew || !session.activePartyId) {
      update((s) => ({ ...s, activePartyId: roster.id }));
    }
    setSavedRosters(await loadSavedCharacterRosters());
    setPartyMsg(
      wasLinkedUpdate
        ? `Updated "${roster.name}" — levels, gear, items, and HP saved.`
        : `Saved "${roster.name}" to your party library.`,
    );
  };

  const unlinkCampaign = () => {
    update((s) => ({ ...s, activePartyId: null }));
    setPartyMsg("Unlinked from campaign party. You can still edit sheets here.");
  };

  const loadCampaign = (roster: SavedCharacterRoster) => {
    update((s) =>
      applyPartyImport(
        s,
        roster,
        { placeTokens: true, linkCampaign: true, replaceExisting: true },
        newPlayerToken,
      ),
    );
    setPartyMsg(`Loaded campaign "${roster.name}" with tokens placed.`);
  };

  const savePlayer = (draft: PlayerCharacter, placeToken: boolean) => {
    update((s) => {
      const exists = s.players.some((p) => p.id === draft.id);
      let tokens = s.tokens;
      let entries = s.initiative.entries;
      let next = draft;

      if (exists && draft.tokenId) {
        const maxHp = effectiveMaxHp(draft);
        // Keep the linked token in step with the sheet: name and max HP.
        tokens = tokens.map((t) => {
          if (t.id !== draft.tokenId) return t;
          const current =
            t.hp && t.hp.current !== t.hp.max ? Math.min(t.hp.current, maxHp) : maxHp;
          return { ...t, label: draft.name, hp: { current, max: maxHp } };
        });
        entries = entries.map((e) =>
          e.tokenId === draft.tokenId ? { ...e, name: draft.name } : e,
        );
      }

      if (!exists && placeToken) {
        const tokenId = newId();
        tokens = [...tokens, newPlayerToken(s, draft, tokenId)];
        next = { ...draft, tokenId };
      }

      return {
        ...s,
        tokens,
        players: exists
          ? s.players.map((p) => (p.id === draft.id ? next : p))
          : [...s.players, next],
        initiative: { ...s.initiative, entries },
      };
    });
    setSheet(null);
  };

  const placeToken = (player: PlayerCharacter) => {
    const tokenId = newId();
    update((s) => ({
      ...s,
      tokens: [...s.tokens, newPlayerToken(s, player, tokenId)],
      players: s.players.map((p) => (p.id === player.id ? { ...p, tokenId } : p)),
    }));
    onSelectToken(tokenId);
  };

  const removePlayer = (player: PlayerCharacter) => {
    update((s) => {
      const entries = player.tokenId
        ? s.initiative.entries.filter((e) => e.tokenId !== player.tokenId)
        : s.initiative.entries;
      return {
        ...s,
        players: s.players.filter((p) => p.id !== player.id),
        tokens: player.tokenId ? s.tokens.filter((t) => t.id !== player.tokenId) : s.tokens,
        initiative: {
          ...s.initiative,
          entries,
          activeIndex:
            entries.length === 0 ? 0 : Math.min(s.initiative.activeIndex, entries.length - 1),
        },
      };
    });
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div
        className="rounded-lg border p-2"
        style={{ borderColor: "var(--border)", background: "rgba(154,116,22,0.06)" }}
      >
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold">Campaign party</p>
            {session.activePartyId ? (
              <p className="text-[11px] text-[var(--muted)]">
                Linked to{" "}
                <strong className="text-[var(--text)]">{linkedRoster?.name ?? "saved party"}</strong>
                . Save after sessions to keep levels, gear, and HP.
              </p>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                Save scratch-built parties for future sessions, or load one from your library.
              </p>
            )}
          </div>
          <Link
            href="/parties"
            className="shrink-0 rounded border px-2 py-1 text-[10px] font-semibold"
            style={{ borderColor: "var(--accent-dim)" }}
          >
            Party library
          </Link>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {session.activePartyId ? (
            <>
              <button
                type="button"
                onClick={() => void saveToLibrary(false)}
                className="rounded border px-2 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
              >
                Update campaign party
              </button>
              <button
                type="button"
                onClick={() => void saveToLibrary(true)}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                Save as new party
              </button>
              <button
                type="button"
                onClick={unlinkCampaign}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                Unlink
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void saveToLibrary(true)}
              className="rounded border px-2 py-1 text-xs font-semibold"
              style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
              disabled={session.players.length === 0}
            >
              Save to party library
            </button>
          )}
        </div>
        {savedRosters.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-wide text-[var(--muted)] uppercase">
              Quick load
            </p>
            {savedRosters.slice(0, 4).map((roster) => (
              <div
                key={roster.id}
                className="flex flex-wrap items-center justify-between gap-1 rounded border px-2 py-1"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="min-w-0 truncate text-[11px] font-semibold">{roster.name}</span>
                <button
                  type="button"
                  onClick={() => loadCampaign(roster)}
                  className="shrink-0 rounded border px-2 py-0.5 text-[10px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Load campaign
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {partyMsg ? (
          <p className="mt-2 text-[11px]" style={{ color: "var(--accent)" }} role="status">
            {partyMsg}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setSheet("new")}
        className="rounded-md border px-2 py-1.5 text-xs font-semibold"
        style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
      >
        Add player (character sheet)
      </button>

      {session.players.length === 0 && (
        <p className="text-xs text-[var(--muted)]">
          No party members yet. Add each player from their character sheet — their token,
          hit points, and initiative bonus come along automatically.
        </p>
      )}

      {session.players.map((p) => {
        const token = session.tokens.find((t) => t.id === p.tokenId) ?? null;
        const maxHp = effectiveMaxHp(p);
        const hp = token?.hp ?? { current: maxHp, max: maxHp };
        return (
          <div
            key={p.id}
            className="flex flex-col gap-1.5 rounded-lg border p-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold">{p.name}</span>
              {p.playerName && (
                <span className="shrink-0 text-[10px] text-[var(--muted)]">{p.playerName}</span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">{characterSummary(p)}</p>
            {p.items.length > 0 && (
              <p className="text-[10px] text-[var(--muted)]">
                {p.items.length} item{p.items.length === 1 ? "" : "s"} equipped
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              <span>
                AC <b>{effectiveAc(p)}</b>
              </span>
              <span>
                HP{" "}
                <b>
                  {hp.current}/{maxHp}
                </b>
              </span>
              <span>
                Init <b>{formatMod(effectiveInitiative(p))}</b>
              </span>
              <span title="Passive Perception">
                PP <b>{effectivePassivePerception(p)}</b>
              </span>
              <span title="Proficiency bonus">
                Prof <b>{formatMod(proficiencyBonus(p.level))}</b>
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSheet(p)}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                Sheet
              </button>
              {token ? (
                <button
                  type="button"
                  onClick={() => onSelectToken(token.id)}
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)" }}
                  title="Select this character's token on the map"
                >
                  Select token
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => placeToken(p)}
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)" }}
                >
                  Place token
                </button>
              )}
              <button
                type="button"
                onClick={() => removePlayer(p)}
                className="rounded border px-2 py-1 text-xs text-red-800"
                style={{ borderColor: "var(--border)" }}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {sheet !== null && (
        <PlayerSheetModal
          initial={sheet === "new" ? null : sheet}
          onSave={savePlayer}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function newPlayerToken(
  session: TabletopSession,
  player: PlayerCharacter,
  tokenId: string,
): TabletopToken {
  const centerX = Math.max(0, Math.floor(session.grid.cols / 2) - 1);
  const centerY = Math.max(0, Math.floor(session.grid.rows / 2) - 1);
  return {
    id: tokenId,
    label: player.name,
    color: TOKEN_KIND_DEFAULT_COLOR.pc,
    kind: "pc",
    x: Math.min(centerX + (session.tokens.length % 5), session.grid.cols - 1),
    y: Math.min(centerY + Math.floor(session.tokens.length / 5), session.grid.rows - 1),
    size: 1,
    hp: (() => {
      const max = effectiveMaxHp(player);
      const current =
        player.currentHp != null ? Math.min(Math.max(0, player.currentHp), max) : max;
      return { current, max };
    })(),
    hidden: false,
    imageDataUrl: null,
  };
}

/** Editable string fields of the sheet form. */
type SheetForm = {
  name: string;
  playerName: string;
  species: string;
  className: string;
  subclass: string;
  background: string;
  alignment: string;
  level: string;
  ac: string;
  maxHp: string;
  speed: string;
  notes: string;
  str: string;
  dex: string;
  con: string;
  int: string;
  wis: string;
  cha: string;
};

function toForm(p: PlayerCharacter | null): SheetForm {
  return {
    name: p?.name ?? "",
    playerName: p?.playerName ?? "",
    species: p?.species ?? "",
    className: p?.className ?? "",
    subclass: p?.subclass ?? "",
    background: p?.background ?? "",
    alignment: p?.alignment ?? "",
    level: String(p?.level ?? 1),
    ac: String(p?.ac ?? 10),
    maxHp: String(p?.maxHp ?? 10),
    speed: String(p?.speed ?? 30),
    notes: p?.notes ?? "",
    str: String(p?.abilities.str ?? 10),
    dex: String(p?.abilities.dex ?? 10),
    con: String(p?.abilities.con ?? 10),
    int: String(p?.abilities.int ?? 10),
    wis: String(p?.abilities.wis ?? 10),
    cha: String(p?.abilities.cha ?? 10),
  };
}

function clampNum(raw: string, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || raw.trim() === "") return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseSignedInt(raw: string, fallback = 0): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || raw.trim() === "") return fallback;
  return Math.round(n);
}

function buildSheetPlayer(
  f: SheetForm,
  items: CharacterItem[],
  id: string,
  tokenId: string | null,
  currentHp: number | null = null,
): PlayerCharacter {
  return {
    id,
    name: f.name.trim(),
    playerName: f.playerName.trim(),
    species: f.species.trim(),
    className: f.className.trim(),
    subclass: f.subclass.trim(),
    background: f.background.trim(),
    alignment: f.alignment.trim(),
    level: clampNum(f.level, 1, 20, 1),
    abilities: {
      str: clampNum(f.str, 1, 30, 10),
      dex: clampNum(f.dex, 1, 30, 10),
      con: clampNum(f.con, 1, 30, 10),
      int: clampNum(f.int, 1, 30, 10),
      wis: clampNum(f.wis, 1, 30, 10),
      cha: clampNum(f.cha, 1, 30, 10),
    },
    ac: clampNum(f.ac, 1, 40, 10),
    maxHp: clampNum(f.maxHp, 1, 999, 10),
    speed: clampNum(f.speed, 0, 200, 30),
    notes: f.notes,
    items: items.filter((item) => item.name.trim()),
    currentHp,
    tokenId,
  };
}

function ItemEditorSection({
  items,
  onChange,
}: {
  items: CharacterItem[];
  onChange: (items: CharacterItem[]) => void;
}) {
  const addItem = () =>
    onChange([...items, { id: newId(), name: "", notes: "", bonuses: emptyBonuses() }]);

  const updateItem = (id: string, patch: Partial<CharacterItem>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const updateBonus = (id: string, key: keyof ItemBonuses, raw: string) => {
    const value = Math.min(99, Math.max(-99, parseSignedInt(raw, 0)));
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, bonuses: { ...item.bonuses, [key]: value } } : item,
      ),
    );
  };

  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide uppercase">Items &amp; equipment</p>
        <button
          type="button"
          onClick={addItem}
          className="rounded border px-2 py-0.5 text-[10px] font-semibold"
          style={{ borderColor: "var(--border)" }}
        >
          + Add item
        </button>
      </div>

      {items.length === 0 && (
        <p className="mb-1 text-xs text-[var(--muted)]">
          Add armor, weapons, magic items, or conditions — each can grant bonuses or penalties to
          AC, HP, speed, abilities, and more.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border p-2"
            style={{ borderColor: "var(--border)", background: "rgba(154,116,22,0.05)" }}
          >
            <div className="mb-2 flex gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="Item name (e.g. Shield, Boots of Speed)"
                className="min-w-0 flex-1 rounded border px-2 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.name || "item"}`}
                className="rounded border px-2 py-1 text-xs text-red-800"
                style={{ borderColor: "var(--border)" }}
              >
                &times;
              </button>
            </div>
            <input
              value={item.notes}
              onChange={(e) => updateItem(item.id, { notes: e.target.value })}
              placeholder="Notes (optional)"
              className="mb-2 w-full rounded border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
            <p className="mb-1 text-[10px] font-semibold text-[var(--muted)]">
              Bonuses / penalties
            </p>
            <div className="grid grid-cols-6 gap-1">
              {ITEM_BONUS_FIELDS.map(({ key, label, title }) => (
                <label key={key} className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[9px] font-bold text-[var(--muted)]" title={title}>
                    {label}
                  </span>
                  <input
                    value={item.bonuses[key] === 0 ? "" : String(item.bonuses[key])}
                    onChange={(e) =>
                      updateBonus(item.id, key, e.target.value.replace(/[^\d-]/g, ""))
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full rounded border px-0.5 py-0.5 text-center text-[11px]"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    aria-label={`${item.name || "Item"} ${label} bonus`}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerSheetModal({
  initial,
  onSave,
  onClose,
}: {
  initial: PlayerCharacter | null;
  onSave: (player: PlayerCharacter, placeToken: boolean) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<SheetForm>(() => toForm(initial));
  const [items, setItems] = useState<CharacterItem[]>(() => initial?.items ?? []);
  const [draftId] = useState(() => initial?.id ?? newId());
  const [placeToken, setPlaceToken] = useState(true);
  const set = (key: keyof SheetForm) => (value: string) => setF((v) => ({ ...v, [key]: value }));

  const preview = buildSheetPlayer(
    f,
    items,
    draftId,
    initial?.tokenId ?? null,
    initial?.currentHp ?? null,
  );
  const itemBonuses = sumItemBonuses(items);
  const effectiveScores = effectiveAbilities(preview.abilities, items);

  const save = () => {
    if (!f.name.trim()) return;
    onSave(preview, initial === null && placeToken);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fantasy-panel flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="font-display text-base font-bold">
            {initial ? `${initial.name} — character sheet` : "New party member"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close character sheet"
            className="rounded px-2 py-0.5 text-lg leading-none text-[var(--muted)] hover:text-[var(--text)]"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4 text-sm">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-2">
            <SheetField label="Character name *" value={f.name} onChange={set("name")} />
            <SheetField label="Player" value={f.playerName} onChange={set("playerName")} />
            <SheetField
              label="Class"
              value={f.className}
              onChange={set("className")}
              placeholder="Fighter"
            />
            <SheetField
              label="Subclass"
              value={f.subclass}
              onChange={set("subclass")}
              placeholder="Champion"
            />
            <SheetField
              label="Species"
              value={f.species}
              onChange={set("species")}
              placeholder="Human"
            />
            <SheetField
              label="Background"
              value={f.background}
              onChange={set("background")}
              placeholder="Soldier"
            />
            <SheetField
              label="Level (1–20)"
              value={f.level}
              onChange={(v) => set("level")(v.replace(/\D/g, ""))}
            />
            <SheetField
              label="Alignment"
              value={f.alignment}
              onChange={set("alignment")}
              placeholder="Neutral Good"
            />
          </div>

          {/* Abilities */}
          <div>
            <p className="mb-1 text-xs font-bold tracking-wide uppercase">Ability scores</p>
            <div className="grid grid-cols-6 gap-1.5">
              {ABILITY_LIST.map(({ key, label }) => (
                <label key={key} className="flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[10px] font-bold text-[var(--muted)]">{label}</span>
                  <input
                    value={f[key]}
                    onChange={(e) => set(key)(e.target.value.replace(/\D/g, ""))}
                    onFocus={(e) => e.currentTarget.select()}
                    inputMode="numeric"
                    className="w-full rounded border px-1 py-1 text-center text-sm font-semibold"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                    aria-label={`${label} score`}
                  />
                  <span className="text-[11px] text-[var(--muted)]">
                    {formatMod(abilityMod(effectiveScores[key]))}
                    {itemBonuses[key] !== 0 && (
                      <span className="block text-[9px]">
                        {itemBonuses[key] > 0 ? "+" : ""}
                        {itemBonuses[key]} item
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Combat */}
          <div className="grid grid-cols-3 gap-2">
            <SheetField
              label="Armor Class"
              value={f.ac}
              onChange={(v) => set("ac")(v.replace(/\D/g, ""))}
            />
            <SheetField
              label="Max HP"
              value={f.maxHp}
              onChange={(v) => set("maxHp")(v.replace(/\D/g, ""))}
            />
            <SheetField
              label="Speed (ft.)"
              value={f.speed}
              onChange={(v) => set("speed")(v.replace(/\D/g, ""))}
            />
          </div>

          {(itemBonuses.ac !== 0 ||
            itemBonuses.maxHp !== 0 ||
            itemBonuses.speed !== 0) && (
            <p className="text-[10px] text-[var(--muted)]">
              Effective from items: AC {effectiveAc(preview)}
              {itemBonuses.ac !== 0 && ` (${itemBonuses.ac > 0 ? "+" : ""}${itemBonuses.ac})`}
              {" · "}
              HP {effectiveMaxHp(preview)}
              {itemBonuses.maxHp !== 0 && ` (${itemBonuses.maxHp > 0 ? "+" : ""}${itemBonuses.maxHp})`}
              {" · "}
              Spd {effectiveSpeed(preview)} ft.
              {itemBonuses.speed !== 0 && ` (${itemBonuses.speed > 0 ? "+" : ""}${itemBonuses.speed})`}
            </p>
          )}

          <p
            className="rounded-md px-2 py-1.5 text-xs"
            style={{ background: "rgba(154,116,22,0.1)" }}
          >
            Proficiency <b>{formatMod(proficiencyBonus(preview.level))}</b> &middot; Initiative{" "}
            <b>{formatMod(effectiveInitiative(preview))}</b> &middot; Passive Perception{" "}
            <b>{effectivePassivePerception(preview)}</b>
          </p>

          <ItemEditorSection items={items} onChange={setItems} />

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold">Notes — features, languages, proficiencies</span>
            <textarea
              value={f.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={3}
              className="rounded border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            />
          </label>

          {initial === null && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={placeToken}
                onChange={(e) => setPlaceToken(e.target.checked)}
              />
              Place a token on the battle map
            </label>
          )}
        </div>

        <div
          className="flex justify-end gap-2 border-t px-4 py-2.5"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!f.name.trim()}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.25)" }}
          >
            {initial ? "Save sheet" : "Add to party"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        placeholder={placeholder}
        className="rounded border px-2 py-1.5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
    </label>
  );
}

/* ---------------------------------------------------------------- tokens */

function TokensPanel({
  session,
  selectedToken,
  onSelect,
  update,
}: {
  session: TabletopSession;
  selectedToken: TabletopSession["tokens"][number] | null;
  onSelect: (id: string | null) => void;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<TokenKind>("monster");
  const [size, setSize] = useState(1);
  const [maxHp, setMaxHp] = useState("");
  // null = follow the kind's default color.
  const [color, setColor] = useState<string | null>(null);

  const addToken = () => {
    const name = label.trim();
    if (!name) return;
    const hpMax = Number(maxHp);
    const centerX = Math.max(0, Math.floor(session.grid.cols / 2) - 1);
    const centerY = Math.max(0, Math.floor(session.grid.rows / 2) - 1);
    const id = newId();
    const footprint = tokenCellFootprint(size, session.grid.feetPerCell);
    update((s) => ({
      ...s,
      tokens: [
        ...s.tokens,
        {
          id,
          label: name,
          color: color ?? TOKEN_KIND_DEFAULT_COLOR[kind],
          kind,
          x: Math.min(centerX + (s.tokens.length % 5), s.grid.cols - footprint),
          y: Math.min(centerY + Math.floor(s.tokens.length / 5), s.grid.rows - footprint),
          size,
          hp: Number.isFinite(hpMax) && hpMax > 0 ? { current: hpMax, max: hpMax } : null,
          hidden: false,
          imageDataUrl: null,
        },
      ],
    }));
    setLabel("");
    setMaxHp("");
    onSelect(id);
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addToken()}
          placeholder="Name (e.g. Goblin 1, Thera)"
          className="rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
        <div className="flex gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TokenKind)}
            className="flex-1 rounded border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            {(Object.keys(TOKEN_KIND_LABEL) as TokenKind[]).map((k) => (
              <option key={k} value={k}>
                {TOKEN_KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="rounded border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            title="Creature size (scaled to grid square size)"
          >
            {TOKEN_SIZE_CATEGORY.map((n) => (
              <option key={n} value={n}>
                {formatTokenSizeOption(n, session.grid.feetPerCell)}
              </option>
            ))}
          </select>
          <input
            value={maxHp}
            onChange={(e) => setMaxHp(e.target.value.replace(/\D/g, ""))}
            placeholder="HP"
            className="w-14 rounded border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </div>
        <ColorSwatchRow
          value={color ?? TOKEN_KIND_DEFAULT_COLOR[kind]}
          onChange={setColor}
        />
        <button
          type="button"
          onClick={addToken}
          className="rounded-md border px-2 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
        >
          Add token
        </button>
      </div>

      {selectedToken && (
        <TokenEditor
          key={selectedToken.id}
          token={selectedToken}
          feetPerCell={session.grid.feetPerCell}
          onSelect={onSelect}
          update={update}
        />
      )}

      <ul className="flex flex-col gap-1">
        {session.tokens.length === 0 && (
          <li className="text-xs text-[var(--muted)]">
            No tokens yet. Add heroes and monsters above, then drag them on the map.
          </li>
        )}
        {session.tokens.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs"
              style={{
                borderColor: t.id === selectedToken?.id ? "var(--accent)" : "var(--border)",
                background: t.id === selectedToken?.id ? "rgba(201,162,39,0.12)" : "transparent",
              }}
            >
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  background: t.imageDataUrl
                    ? `${t.color} url("${t.imageDataUrl}") center / cover no-repeat`
                    : t.color,
                  opacity: t.hidden ? 0.4 : 1,
                }}
              />
              <span className="flex-1 truncate">
                {t.label}
                {t.hidden && <span className="text-[var(--muted)]"> (hidden)</span>}
              </span>
              {t.hp && (
                <span className="text-[var(--muted)]">
                  {t.hp.current}/{t.hp.max}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TokenEditor({
  token,
  feetPerCell,
  onSelect,
  update,
}: {
  token: TabletopToken;
  feetPerCell: number;
  onSelect: (id: string | null) => void;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const { images: libraryImages, load: loadLibraryImages } = useGenerationLibraryImages();

  const patch = (fn: (t: TabletopToken) => TabletopToken) =>
    update((s) => ({
      ...s,
      tokens: s.tokens.map((t) => (t.id === token.id ? fn(t) : t)),
    }));

  const rename = (name: string) =>
    update((s) => ({
      ...s,
      tokens: s.tokens.map((t) => (t.id === token.id ? { ...t, label: name } : t)),
      // Keep initiative entries created from this token in step with its name.
      initiative: {
        ...s.initiative,
        entries: s.initiative.entries.map((e) =>
          e.tokenId === token.id ? { ...e, name } : e,
        ),
      },
    }));

  const resize = (sizeCategory: number) =>
    update((s) => ({
      ...s,
      tokens: s.tokens.map((t) => {
        if (t.id !== token.id) return t;
        const footprint = tokenCellFootprint(sizeCategory, s.grid.feetPerCell);
        const pos = clampTokenPosition(t.x, t.y, footprint, s.grid.cols, s.grid.rows, s.grid.snap);
        return { ...t, size: sizeCategory, x: pos.x, y: pos.y };
      }),
    }));

  const setMaxHp = (raw: string) => {
    const max = Number(raw);
    patch((t) => {
      if (raw === "" || !Number.isFinite(max) || max <= 0) return { ...t, hp: null };
      // A token at full health stays at full health when its max changes.
      const current =
        t.hp && t.hp.current !== t.hp.max ? Math.min(t.hp.current, max) : max;
      return { ...t, hp: { current, max } };
    });
  };

  const applyArtwork = (source: string | File) => {
    void prepareTokenImage(source).then((dataUrl) => {
      if (dataUrl) patch((t) => ({ ...t, imageDataUrl: dataUrl }));
    });
  };

  const onUploadArtwork = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyArtwork(file);
    e.target.value = "";
  };

  const toggleLibrary = () => {
    setShowLibrary((v) => !v);
    if (libraryImages === null) void loadLibraryImages();
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-2"
      style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.08)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
          style={{
            background: token.imageDataUrl
              ? `${token.color} url("${token.imageDataUrl}") center / cover no-repeat`
              : token.color,
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          {token.imageDataUrl ? null : token.label.trim().slice(0, 2).toUpperCase() || "?"}
        </span>
        <input
          value={token.label}
          onChange={(e) => rename(e.target.value)}
          aria-label="Token name"
          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm font-semibold"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
      </div>

      <div className="flex gap-2">
        <select
          value={token.kind}
          onChange={(e) => patch((t) => ({ ...t, kind: e.target.value as TokenKind }))}
          aria-label="Token type"
          className="flex-1 rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {(Object.keys(TOKEN_KIND_LABEL) as TokenKind[]).map((k) => (
            <option key={k} value={k}>
              {TOKEN_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={token.size}
          onChange={(e) => resize(Number(e.target.value))}
          aria-label="Token size"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {TOKEN_SIZE_CATEGORY.map((n) => (
            <option key={n} value={n}>
              {formatTokenSizeOption(n, feetPerCell)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
          Max HP
          <input
            value={token.hp?.max ?? ""}
            onChange={(e) => setMaxHp(e.target.value.replace(/\D/g, ""))}
            placeholder="—"
            className="w-12 rounded border px-1.5 py-1 text-xs"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          />
        </label>
      </div>

      <ColorSwatchRow
        value={token.color}
        onChange={(c) => patch((t) => ({ ...t, color: c }))}
      />

      {token.hp && (
        <div className="flex items-center gap-1 text-xs">
          HP
          {[-10, -5, -1].map((d) => (
            <HpButton key={d} delta={d} tokenId={token.id} update={update} />
          ))}
          <span className="mx-1 font-semibold">
            {token.hp.current}/{token.hp.max}
          </span>
          {[1, 5, 10].map((d) => (
            <HpButton key={d} delta={d} tokenId={token.id} update={update} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <label
          className="cursor-pointer rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          Upload art&hellip;
          <input type="file" accept="image/*" className="hidden" onChange={onUploadArtwork} />
        </label>
        <button
          type="button"
          onClick={toggleLibrary}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          {showLibrary ? "Hide library" : "From library"}
        </button>
        {token.imageDataUrl && (
          <button
            type="button"
            onClick={() => patch((t) => ({ ...t, imageDataUrl: null }))}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            Remove art
          </button>
        )}
      </div>

      {showLibrary &&
        (libraryImages === null ? (
          <p className="text-xs text-[var(--muted)]">Loading library&hellip;</p>
        ) : libraryImages.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No images in your library yet. Generate characters or props first, or upload art.
          </p>
        ) : (
          <div className="grid max-h-40 grid-cols-4 gap-1 overflow-y-auto">
            {libraryImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => applyArtwork(img.dataUrl)}
                className="overflow-hidden rounded border"
                style={{ borderColor: "var(--border)" }}
                title={img.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.label}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        ))}

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)" }}
          onClick={() => patch((t) => ({ ...t, hidden: !t.hidden }))}
        >
          {token.hidden ? "Show to players" : "Hide from players"}
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs text-red-800"
          style={{ borderColor: "var(--border)" }}
          onClick={() => {
            onSelect(null);
            update((s) => ({
              ...s,
              tokens: s.tokens.filter((t) => t.id !== token.id),
              // A party member whose token is deleted stays in the roster, unlinked.
              players: s.players.map((p) =>
                p.tokenId === token.id ? { ...p, tokenId: null } : p,
              ),
              initiative: {
                ...s.initiative,
                entries: s.initiative.entries.filter((e) => e.tokenId !== token.id),
              },
            }));
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function ColorSwatchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TOKEN_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Token color ${c}`}
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full border"
          style={{
            background: c,
            borderColor: "rgba(255,255,255,0.7)",
            boxShadow:
              value.toLowerCase() === c ? "0 0 0 2px var(--accent)" : "0 0 0 1px var(--border)",
          }}
        />
      ))}
      <label
        className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border"
        title="Custom color"
        style={{
          borderColor: "rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px var(--border)",
          background: "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#b91c1c"}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom token color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function HpButton({
  delta,
  tokenId,
  update,
}: {
  delta: number;
  tokenId: string;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  return (
    <button
      type="button"
      className="rounded border px-1 py-0.5 text-[10px] leading-none"
      style={{ borderColor: "var(--border)" }}
      onClick={() =>
        update((s) => ({
          ...s,
          tokens: s.tokens.map((t) =>
            t.id === tokenId && t.hp
              ? {
                  ...t,
                  hp: {
                    ...t.hp,
                    current: Math.min(t.hp.max, Math.max(0, t.hp.current + delta)),
                  },
                }
              : t,
          ),
        }))
      }
    >
      {delta > 0 ? `+${delta}` : delta}
    </button>
  );
}

/* ------------------------------------------------------------ initiative */

function InitiativePanel({
  session,
  update,
}: {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");

  const addManual = () => {
    const n = name.trim();
    const r = Number(roll);
    if (!n || !Number.isFinite(r)) return;
    update((s) => ({
      ...s,
      initiative: {
        ...s.initiative,
        entries: sortInitiative([
          ...s.initiative.entries,
          { id: newId(), name: n, roll: r, tokenId: null },
        ]),
      },
    }));
    setName("");
    setRoll("");
  };

  const rollForTokens = () => {
    update((s) => {
      const existing = new Set(
        s.initiative.entries.map((e) => e.tokenId).filter((x): x is string => x !== null),
      );
      // Party members add their sheet's effective initiative bonus to the d20.
      const initModByToken = new Map(
        s.players
          .filter((p) => p.tokenId !== null)
          .map((p) => [p.tokenId as string, effectiveInitiative(p)]),
      );
      const added = s.tokens
        .filter((t) => t.kind !== "object" && !existing.has(t.id))
        .map((t) => ({
          id: newId(),
          name: t.label,
          roll: 1 + Math.floor(Math.random() * 20) + (initModByToken.get(t.id) ?? 0),
          tokenId: t.id,
        }));
      if (added.length === 0) return s;
      return {
        ...s,
        initiative: {
          ...s.initiative,
          entries: sortInitiative([...s.initiative.entries, ...added]),
        },
      };
    });
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">Round {session.initiative.round}</span>
        <button
          type="button"
          onClick={() => update(advanceInitiative)}
          disabled={session.initiative.entries.length === 0}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
        >
          Next turn &rarr;
        </button>
      </div>

      <ol className="flex flex-col gap-1">
        {session.initiative.entries.length === 0 && (
          <li className="text-xs text-[var(--muted)]">
            No combatants. Roll for all tokens or add entries manually.
          </li>
        )}
        {session.initiative.entries.map((e, i) => (
          <li
            key={e.id}
            className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            style={{
              borderColor: i === session.initiative.activeIndex ? "var(--accent)" : "var(--border)",
              background:
                i === session.initiative.activeIndex ? "rgba(201,162,39,0.15)" : "transparent",
            }}
          >
            <span className="w-6 shrink-0 text-right font-bold">{e.roll}</span>
            <span className="flex-1 truncate">{e.name}</span>
            <button
              type="button"
              aria-label={`Remove ${e.name} from initiative`}
              className="text-[var(--muted)] hover:text-red-700"
              onClick={() =>
                update((s) => {
                  const entries = s.initiative.entries.filter((x) => x.id !== e.id);
                  return {
                    ...s,
                    initiative: {
                      ...s.initiative,
                      entries,
                      activeIndex:
                        entries.length === 0
                          ? 0
                          : Math.min(s.initiative.activeIndex, entries.length - 1),
                    },
                  };
                })
              }
            >
              &times;
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={rollForTokens}
        className="rounded-md border px-2 py-1.5 text-xs font-semibold"
        style={{ borderColor: "var(--border)" }}
      >
        Roll d20 for all tokens
      </button>

      <div className="flex gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
        <input
          value={roll}
          onChange={(e) => setRoll(e.target.value.replace(/[^\d-]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && addManual()}
          placeholder="Init"
          className="w-12 rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
        <button
          type="button"
          onClick={addManual}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          Add
        </button>
      </div>

      {session.initiative.entries.length > 0 && (
        <button
          type="button"
          className="self-start text-xs text-[var(--muted)] underline"
          onClick={() =>
            update((s) => ({
              ...s,
              initiative: { entries: [], activeIndex: 0, round: 1 },
            }))
          }
        >
          Clear initiative
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ dice */

function DicePanel({
  session,
  update,
}: {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  const [expression, setExpression] = useState("1d20");
  const [secret, setSecret] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const roll = (expr: string) => {
    const result = rollDice(expr);
    if (!result) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    update((s) =>
      appendLog(s, {
        expression: result.expression,
        detail: result.detail,
        total: result.total,
        secret,
      }),
    );
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex gap-1">
        <input
          value={expression}
          onChange={(e) => {
            setExpression(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && roll(expression)}
          placeholder="e.g. 2d6+3"
          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm"
          style={{
            borderColor: invalid ? "#dc2626" : "var(--border)",
            background: "var(--bg)",
          }}
        />
        <button
          type="button"
          onClick={() => roll(expression)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.2)" }}
        >
          Roll
        </button>
      </div>
      {invalid && <p className="text-xs text-red-700">Could not read that expression.</p>}

      <div className="flex flex-wrap gap-1">
        {QUICK_DICE.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setExpression(d);
              roll(d);
            }}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            {d}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
        Secret roll (players never see it)
      </label>

      <div className="flex flex-col gap-1">
        {session.log.map((e) => (
          <div
            key={e.id}
            className="rounded-md border px-2 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              background: e.secret ? "rgba(120,60,60,0.08)" : "transparent",
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{e.expression}</span>
              <span className="font-display text-base font-bold">{e.total}</span>
            </div>
            <p className="text-[var(--muted)]">
              {e.detail}
              {e.secret && " · secret"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- map */

function MapPanel({
  session,
  update,
}: {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
}) {
  const { images: libraryMaps } = useGenerationLibraryImages({ loadOnMount: true });
  const libraryMapThumbs = libraryMaps ?? [];
  const [mapMsg, setMapMsg] = useState<string | null>(null);

  const clearMap = () =>
    update((s) => ({
      ...s,
      mapName: "Blank battlefield",
      mapImageDataUrl: null,
      mapSourceDataUrl: null,
    }));

  const applyMapImage = async (
    name: string,
    source: string | File | null,
    gridCols = session.grid.cols,
    gridRows = session.grid.rows,
  ) => {
    if (!source) {
      clearMap();
      return;
    }
    setMapMsg(null);
    const sourceDataUrl = await readImageSource(source);
    if (!sourceDataUrl) {
      setMapMsg("Could not read that image.");
      return;
    }
    const prepared = await prepareMapImage(sourceDataUrl, gridCols, gridRows);
    if (!prepared) {
      setMapMsg("Could not align map to the grid.");
      return;
    }
    update((s) => ({
      ...s,
      mapName: name,
      mapSourceDataUrl: sourceDataUrl,
      mapImageDataUrl: prepared,
      mapGridCols: gridCols,
      mapGridRows: gridRows,
      grid: { ...s.grid, cols: gridCols, rows: gridRows },
      fog: { ...s.fog, revealed: [] },
    }));
    setMapMsg(`Map aligned to ${gridCols}×${gridRows} squares.`);
  };

  const realignMapToGrid = async (gridCols: number, gridRows: number) => {
    const source = session.mapSourceDataUrl ?? session.mapImageDataUrl;
    if (!source) return;
    setMapMsg(null);
    const prepared = await prepareMapImage(source, gridCols, gridRows);
    if (!prepared) {
      setMapMsg("Could not re-align map.");
      return;
    }
    update((s) => ({
      ...s,
      mapImageDataUrl: prepared,
      mapGridCols: gridCols,
      mapGridRows: gridRows,
      grid: { ...s.grid, cols: gridCols, rows: gridRows },
      fog: { ...s.fog, revealed: [] },
    }));
    setMapMsg(`Map re-aligned to ${gridCols}×${gridRows} squares.`);
  };

  const setGridDimensions = (gridCols: number, gridRows: number) => {
    if (session.mapImageDataUrl) {
      void realignMapToGrid(gridCols, gridRows);
      return;
    }
    update((s) => ({
      ...s,
      grid: { ...s.grid, cols: gridCols, rows: gridRows },
      mapGridCols: gridCols,
      mapGridRows: gridRows,
      fog: { ...s.fog, revealed: [] },
    }));
  };

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void applyMapImage(file.name.replace(/\.[^.]+$/, ""), file);
    e.target.value = "";
  };

  const gridSizes = VTT_GRID_PRESETS;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="mb-1 text-xs font-bold">Square size</p>
        <p className="mb-1.5 text-[11px] text-[var(--muted)]">
          Each grid cell represents this many feet on a side (D&amp;D default is 5 ft). Token
          sizes (Medium = 5 ft, Large = 10 ft, etc.) scale to match.
        </p>
        <div className="flex flex-wrap gap-1">
          {FEET_PER_CELL_OPTIONS.map((feet) => (
            <button
              key={feet}
              type="button"
              onClick={() =>
                update((s) => ({
                  ...s,
                  grid: { ...s.grid, feetPerCell: feet },
                }))
              }
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor:
                  session.grid.feetPerCell === feet ? "var(--accent)" : "var(--border)",
              }}
            >
              {feet} ft
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold">Grid dimensions</p>
        <p className="mb-1.5 text-[11px] text-[var(--muted)]">
          Count the squares drawn on your map art and pick the matching size so the overlay grid
          lines up. Changing this re-aligns an loaded map.
        </p>
        <div className="flex flex-wrap gap-1">
          {gridSizes.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setGridDimensions(g.cols, g.rows)}
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor:
                  session.grid.cols === g.cols && session.grid.rows === g.rows
                    ? "var(--accent)"
                    : "var(--border)",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        {session.mapImageDataUrl &&
        (session.mapGridCols !== session.grid.cols ||
          session.mapGridRows !== session.grid.rows) ? (
          <p className="mt-1 text-[11px]" style={{ color: "var(--accent)" }}>
            Map grid ({session.mapGridCols}×{session.mapGridRows}) differs from overlay — pick a
            preset or re-align.
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-1 text-xs font-bold">Fog of war</p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
            onClick={() =>
              update((s) => ({
                ...s,
                fog: { enabled: true, revealed: [] },
              }))
            }
          >
            Cover everything
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
            onClick={() =>
              update((s) => ({
                ...s,
                fog: { ...s.fog, revealed: allCells(s.grid.cols, s.grid.rows) },
              }))
            }
          >
            Reveal everything
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold">Battle map image</p>
        <div className="mb-2 flex flex-wrap gap-1">
          <label
            className="cursor-pointer rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            Upload image&hellip;
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
          {session.mapImageDataUrl && (
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
              onClick={() => {
                clearMap();
                setMapMsg(null);
              }}
            >
              Clear map
            </button>
          )}
          {session.mapImageDataUrl && session.mapSourceDataUrl && (
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)" }}
              onClick={() =>
                void realignMapToGrid(session.grid.cols, session.grid.rows)
              }
            >
              Re-align map
            </button>
          )}
        </div>
        {mapMsg ? (
          <p className="mb-2 text-[11px]" style={{ color: "var(--accent)" }} role="status">
            {mapMsg}
          </p>
        ) : null}

        {libraryMapThumbs.length > 0 ? (
          <>
            <p className="mb-1 text-xs text-[var(--muted)]">From your library:</p>
            <div className="grid grid-cols-2 gap-2">
              {libraryMapThumbs.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void applyMapImage(m.label, m.dataUrl)}
                  className="overflow-hidden rounded-md border text-left"
                  style={{ borderColor: "var(--border)" }}
                  title={m.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.dataUrl} alt={m.label} className="aspect-square w-full object-cover" />
                  <span className="block truncate px-1.5 py-1 text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Generate battle maps in the Maps tab and they will appear here, or upload any image.
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- widgets */

function ToolButton({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md border px-3 py-1.5 text-xs font-semibold"
      style={
        active
          ? {
              borderColor: "var(--accent)",
              background: "rgba(201,162,39,0.25)",
              color: "var(--text)",
            }
          : { borderColor: "var(--border)", color: "var(--muted)" }
      }
    >
      {label}
    </button>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold"
      style={
        checked
          ? { borderColor: "var(--accent)", background: "rgba(201,162,39,0.2)" }
          : { borderColor: "var(--border)", color: "var(--muted)" }
      }
      aria-pressed={checked}
    >
      {label} {checked ? "on" : "off"}
    </button>
  );
}
