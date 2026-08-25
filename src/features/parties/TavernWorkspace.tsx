"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadSavedCharacters,
  onCharactersChanged,
  sortSavedCharacters,
  type CharacterSortKey,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { characterToCreationFile } from "@/lib/creationFile/adapters";
import type { CreationFile } from "@/lib/creationFile/types";
import { characterSummary } from "@/lib/tabletop/character";
import { SRD_CLASS_NAMES } from "@/lib/srd/classes";
import { SRD_ANCESTRY_NAMES } from "@/lib/srd/ancestries";
import { CHARACTER_SORT_LABEL } from "@/lib/tabletop/characterLibrary";
import CFCard from "@/features/creationFile/CFCard";

export type TavernHeroActions = (character: SavedCharacter, card: CreationFile) => ReactNode;

type TavernWorkspaceProps = {
  /** Controlled selection for “Create party” flows. */
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  /** Extra buttons per hero card (edit, print, download, delete). */
  renderActions?: TavernHeroActions;
  onOpenCharacter?: (character: SavedCharacter) => void;
  /** Optional filter chrome overrides — when omitted, built-in filters render. */
  showFilters?: boolean;
  emptyState?: ReactNode;
};

/**
 * The Tavern hero roster — loads `character.sheet` rows from characterLibrary
 * and renders each as a draggable Universal CF Card.
 */
export default function TavernWorkspace({
  selectedIds: controlledSelected,
  onSelectedIdsChange,
  renderActions,
  onOpenCharacter,
  showFilters = true,
  emptyState,
}: TavernWorkspaceProps) {
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [sortKey, setSortKey] = useState<CharacterSortKey>("updated");
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [raceFilter, setRaceFilter] = useState("");
  const [internalSelected, setInternalSelected] = useState<string[]>([]);

  const selectedIds = controlledSelected ?? internalSelected;
  const setSelectedIds = onSelectedIdsChange ?? setInternalSelected;

  const refresh = useCallback(async () => {
    setCharacters(await loadSavedCharacters());
  }, []);

  useEffect(() => {
    void refresh();
    const off = onCharactersChanged(() => void refresh());
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const visibleCharacters = useMemo(() => {
    const q = query.trim().toLowerCase();
    const classQ = classFilter.trim().toLowerCase();
    const raceQ = raceFilter.trim().toLowerCase();
    const filtered = characters.filter((c) => {
      if (classQ && c.player.className.trim().toLowerCase() !== classQ) return false;
      if (raceQ && c.player.species.trim().toLowerCase() !== raceQ) return false;
      if (!q) return true;
      return [c.player.name, c.player.playerName, c.player.className, c.player.species]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return sortSavedCharacters(filtered, sortKey);
  }, [characters, query, sortKey, classFilter, raceFilter]);

  const classOptions = useMemo(() => {
    const fromHeroes = new Set(
      characters.map((c) => c.player.className.trim()).filter(Boolean),
    );
    for (const name of SRD_CLASS_NAMES) fromHeroes.add(name);
    return [...fromHeroes].sort((a, b) => a.localeCompare(b));
  }, [characters]);

  const raceOptions = useMemo(() => {
    const fromHeroes = new Set(
      characters.map((c) => c.player.species.trim()).filter(Boolean),
    );
    for (const name of SRD_ANCESTRY_NAMES) fromHeroes.add(name);
    return [...fromHeroes].sort((a, b) => a.localeCompare(b));
  }, [characters]);

  const toggleSelected = (id: string) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  if (characters.length === 0) {
    return (
      emptyState ?? (
        <div
          className="workshop-campaign-card rounded-xl border p-4 text-sm text-[var(--text-soft)]"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="mb-2 text-[var(--text)]">No heroes yet.</p>
          <p>
            Save heroes from the Scrying Window after Generate Heroes, create one with{" "}
            <strong className="text-[var(--text)]">New hero</strong>, or import a character CF.
          </p>
        </div>
      )
    );
  }

  return (
    <div className="tavern-workspace space-y-3">
      {showFilters ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-[var(--text-soft)]">
            Search
            <input
              className="mt-0.5 block w-40 rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name…"
            />
          </label>
          <label className="text-xs text-[var(--text-soft)]">
            Class
            <select
              className="mt-0.5 block rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All</option>
              {classOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--text-soft)]">
            Ancestry
            <select
              className="mt-0.5 block rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
            >
              <option value="">All</option>
              {raceOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--text-soft)]">
            Sort
            <select
              className="mt-0.5 block rounded border px-2 py-1 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as CharacterSortKey)}
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

      {visibleCharacters.length === 0 ? (
        <p
          className="workshop-campaign-card rounded-xl border p-4 text-sm text-[var(--text-soft)]"
          style={{ borderColor: "var(--border)" }}
        >
          No heroes match these filters.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visibleCharacters.map((c) => {
            const card = characterToCreationFile(c, {
              subtitle: characterSummary(c.player),
            });
            const tagged: CreationFile = {
              ...card,
              tags: Array.from(new Set(["Hero", ...card.tags])),
            };
            return (
              <li key={c.id}>
                <CFCard
                  card={tagged}
                  selected={selectedIds.includes(c.id)}
                  onSelect={() => toggleSelected(c.id)}
                  onOpen={onOpenCharacter ? () => onOpenCharacter(c) : undefined}
                  dragParentId="tavern"
                  actions={renderActions?.(c, tagged)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Expose loaded characters for parent party-builder flows. */
export function useTavernCharacters(): {
  characters: SavedCharacter[];
  refresh: () => Promise<void>;
} {
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const refresh = useCallback(async () => {
    setCharacters(await loadSavedCharacters());
  }, []);
  useEffect(() => {
    void refresh();
    return onCharactersChanged(() => void refresh());
  }, [refresh]);
  return { characters, refresh };
}
