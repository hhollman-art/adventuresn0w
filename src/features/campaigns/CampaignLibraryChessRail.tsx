"use client";

import { useMemo, useState } from "react";
import type { CiClass } from "@/lib/ciRegistry";
import { setVaultDragData, type VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { useVaultDrawer } from "@/contexts/VaultDrawerContext";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import { seedDisplayName, SEED_KIND_LABEL } from "@/lib/realmSeeds";
import { GAME_ITEM_KIND_LABEL } from "@/lib/itemLibrary";
import { characterSummary } from "@/lib/tabletop/character";
import {
  ciClassForSeed,
  ciClassForGameItem,
  CI_CLASS_FOR_CHARACTER,
} from "@/lib/ciRegistry";

type ChessPiece = {
  id: string;
  ciClass: CiClass;
  title: string;
  detail: string;
};

/**
 * Live search of Library heroes / items / adventure CFs as draggable chess pieces
 * for the Campaign workspace.
 */
export default function CampaignLibraryChessRail({
  characters,
  items,
  seeds,
}: {
  characters: SavedCharacter[];
  items: SavedGameItem[];
  seeds: SavedRealmSeed[];
}) {
  const { setDragging } = useVaultDrawer();
  const [query, setQuery] = useState("");

  const pieces = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: ChessPiece[] = [
      ...characters.map((c) => ({
        id: c.id,
        ciClass: CI_CLASS_FOR_CHARACTER,
        title: c.player.name,
        detail: characterSummary(c.player),
      })),
      ...items.map((item) => ({
        id: item.id,
        ciClass: ciClassForGameItem(item.kind),
        title: item.name,
        detail: GAME_ITEM_KIND_LABEL[item.kind],
      })),
      ...seeds.map((seed) => ({
        id: seed.id,
        ciClass: ciClassForSeed(seed.kind),
        title: seedDisplayName(seed),
        detail: SEED_KIND_LABEL[seed.kind],
      })),
    ];
    if (!q) return rows.slice(0, 48);
    return rows
      .filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.detail.toLowerCase().includes(q) ||
          row.ciClass.toLowerCase().includes(q),
      )
      .slice(0, 64);
  }, [characters, items, query, seeds]);

  return (
    <aside
      className="flex min-h-0 flex-col rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
          Library chess pieces
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
          Search, then drag into Party, Adventure, Loot, or Scene.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search heroes, items, adventures…"
          className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          aria-label="Search library for campaign drag"
        />
      </div>
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2">
        {pieces.length === 0 ? (
          <li className="px-2 py-3 text-xs text-[var(--text-soft)]">No matches.</li>
        ) : (
          pieces.map((piece) => {
            const payload: VaultDragPayload = {
              vaultKind: "cf",
              id: piece.id,
              ciClass: piece.ciClass,
              title: piece.title,
              detail: piece.detail,
            };
            return (
              <li
                key={`${piece.ciClass}:${piece.id}`}
                draggable
                className="cursor-grab rounded-md border px-2 py-1.5 active:cursor-grabbing"
                style={{ borderColor: "var(--border)", background: "var(--panel)" }}
                onDragStart={(event) => {
                  setVaultDragData(event.dataTransfer, payload);
                  setDragging(payload);
                }}
                onDragEnd={() => setDragging(null)}
              >
                <p className="truncate text-xs font-semibold text-[var(--text)]">{piece.title}</p>
                <p className="truncate text-[10px] text-[var(--text-soft)]">{piece.detail}</p>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
