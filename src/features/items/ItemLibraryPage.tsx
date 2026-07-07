"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  deleteGameItem,
  GAME_ITEM_KIND_LABEL,
  GAME_ITEM_SORT_LABEL,
  GAME_ITEM_SOURCE_LABEL,
  loadSavedGameItems,
  MAGIC_RARITY_LABEL,
  onItemsChanged,
  sortSavedGameItems,
  type GameItemKind,
  type GameItemSortKey,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import { formatPartyUpdated } from "@/lib/tabletop/partyCampaign";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { ITEM_BONUS_FIELDS, formatMod } from "@/lib/tabletop/character";
import { THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import { workplace } from "@/lib/workplace";
import {
  filterSrdItemEntries,
  loadSrdItemCatalog,
  srdItemCatalogToLibraryEntries,
  type SrdItemCatalog,
} from "@/lib/workplace/srdItemCatalog";
import { openSrdItemPreview } from "@/lib/srd/openSrdPreview";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import { ciClassLabel } from "@/lib/ciRegistry";
import WorkshopPageShell from "@/features/workshop/WorkshopPageShell";
import ItemEditorDialog from "./ItemEditorDialog";

type KindFilter = "all" | GameItemKind;

const itemsWorkplace = workplace("items");

function bonusSummary(item: SavedGameItem): string {
  const parts: string[] = [];
  for (const { key, label } of ITEM_BONUS_FIELDS) {
    const v = item.bonuses[key];
    if (v !== 0) parts.push(`${label} ${formatMod(v)}`);
  }
  return parts.join(", ");
}

export default function ItemLibraryPage() {
  const [items, setItems] = useState<SavedGameItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sortKey, setSortKey] = useState<GameItemSortKey>("updated");
  const [includeSrdInSearch, setIncludeSrdInSearch] = useState(false);
  const [srdCatalog, setSrdCatalog] = useState<SrdItemCatalog | null>(null);
  const [srdCatalogLoading, setSrdCatalogLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedGameItem | null>(null);
  const [newKind, setNewKind] = useState<GameItemKind>("equipment");

  const refresh = useCallback(async () => {
    setItems(await loadSavedGameItems());
  }, []);

  useEffect(() => {
    void refresh();
    return onItemsChanged(() => void refresh());
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const searchActive = query.trim().length > 0;

  useEffect(() => {
    if (!includeSrdInSearch || !searchActive) return;
    if (srdCatalog) return;
    let cancelled = false;
    setSrdCatalogLoading(true);
    void loadSrdItemCatalog()
      .then((data) => {
        if (!cancelled) setSrdCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setStatus("Could not load the included SRD item catalogue.");
      })
      .finally(() => {
        if (!cancelled) setSrdCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeSrdInSearch, searchActive, srdCatalog]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = kindFilter === "all" ? items : items.filter((i) => i.kind === kindFilter);
    if (q) {
      filtered = filtered.filter((i) =>
        [i.name, i.itemType, i.description].join(" ").toLowerCase().includes(q),
      );
    }
    return sortSavedGameItems(filtered, sortKey);
  }, [items, query, kindFilter, sortKey]);

  const srdMatches = useMemo(() => {
    if (!includeSrdInSearch || !searchActive || !srdCatalog) return [] as LibraryListEntry[];
    const entries = srdItemCatalogToLibraryEntries(srdCatalog);
    return filterSrdItemEntries(entries, query);
  }, [includeSrdInSearch, searchActive, srdCatalog, query]);

  const openEditor = (item: SavedGameItem | null, kind: GameItemKind = "equipment") => {
    setEditingItem(item);
    setNewKind(kind);
    setEditorOpen(true);
  };

  const removeItem = async (item: SavedGameItem) => {
    setItems(await deleteGameItem(item.id));
    scheduleLibrarySnapshot();
    setStatus(`${item.name} removed from your items. Hero sheets keep their own copy.`);
  };

  return (
    <WorkshopPageShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="zone-badge mb-3">{itemsWorkplace.label} workplace</p>
          <h1 className="font-display text-2xl font-bold">Items &amp; equipment</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            {itemsWorkplace.description} Search your gear below — optionally fold in the included
            SRD catalogue when you need a rules reference.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openEditor(null, "equipment")}
            className="btn btn-sm btn-accent"
          >
            New equipment
          </button>
          <button
            type="button"
            onClick={() => openEditor(null, "magic")}
            className="btn btn-sm btn-accent"
          >
            New magic item
          </button>
          <Link href="/library" className="btn btn-sm">
            {THE_LIBRARY}
          </Link>
          <Link
            href="/?mode=props"
            className="btn btn-sm"
            title="Open the workshop's handout generator to craft an item card image"
          >
            Craft handout image
          </Link>
        </div>
      </div>

      {editorOpen ? (
        <ItemEditorDialog
          item={editingItem}
          initialKind={newKind}
          onClose={() => setEditorOpen(false)}
          onSaved={(list, message) => {
            setItems(list);
            setStatus(message);
            setEditorOpen(false);
          }}
        />
      ) : null}

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

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your items — name, type, description…"
            className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            aria-label="Search items library"
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as KindFilter)}
            className="rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            aria-label="Filter by kind"
          >
            <option value="all">All kinds</option>
            <option value="equipment">Equipment</option>
            <option value="magic">Magic items</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            Sort
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as GameItemSortKey)}
              className="rounded-lg border px-2 py-1.5 text-sm text-[var(--text)]"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {(Object.keys(GAME_ITEM_SORT_LABEL) as GameItemSortKey[]).map((key) => (
                <option key={key} value={key}>
                  {GAME_ITEM_SORT_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label
          className="mb-4 flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <input
            type="checkbox"
            checked={includeSrdInSearch}
            onChange={(e) => setIncludeSrdInSearch(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold text-[var(--text)]">
              Include included SRD items in search
            </span>
            <span className="block text-xs text-[var(--muted)]">
              When searching, also show read-only gear and magic from the bundled SRD catalogue.
            </span>
          </span>
        </label>

        {items.length === 0 && !searchActive ? (
          <div
            className="rounded-xl border p-8 text-center text-sm text-[var(--muted)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="mb-2">No custom items yet.</p>
            <p>
              Click <strong className="text-[var(--text)]">New equipment</strong> or{" "}
              <strong className="text-[var(--text)]">New magic item</strong>, or search with the SRD
              toggle on to browse included rules text.
            </p>
          </div>
        ) : visibleItems.length === 0 && srdMatches.length === 0 ? (
          <p
            className="rounded-xl border p-4 text-sm text-[var(--muted)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            {srdCatalogLoading
              ? "Loading included SRD catalogue…"
              : searchActive && includeSrdInSearch
                ? "No items match your search."
                : searchActive
                  ? "No custom items match your search."
                  : "No items to show."}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const bonuses = bonusSummary(item);
              return (
                <li
                  key={item.id}
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{item.name}</p>
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        borderColor:
                          item.kind === "magic" ? "var(--accent-dim)" : "var(--border)",
                        background:
                          item.kind === "magic" ? "rgba(201,162,39,0.12)" : "transparent",
                      }}
                    >
                      {item.kind === "magic" && item.rarity
                        ? MAGIC_RARITY_LABEL[item.rarity]
                        : GAME_ITEM_KIND_LABEL[item.kind]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {[
                      item.itemType,
                      item.kind === "magic" && item.requiresAttunement ? "requires attunement" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || GAME_ITEM_KIND_LABEL[item.kind]}
                  </p>
                  {bonuses ? (
                    <p className="mt-1 text-xs">
                      <b>{bonuses}</b>
                    </p>
                  ) : null}
                  {item.description.trim() ? (
                    <p className="mt-1 line-clamp-3 text-[11px] text-[var(--muted)]">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                    {GAME_ITEM_SOURCE_LABEL[item.source]} · Updated{" "}
                    {formatPartyUpdated(item.updatedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => openEditor(item)}
                      className="rounded-md border px-2.5 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeItem(item)}
                      className="rounded-md border px-2.5 py-1 text-xs text-red-800"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}

            {srdMatches.map((entry) => {
              const ref = entry.srdItemRef!;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => {
                      openSrdItemPreview(ref);
                      setStatus(`Opened SRD preview: ${ref.name}`);
                    }}
                    className="w-full rounded-xl border p-3 text-left text-sm transition hover:border-[var(--accent-dim)]"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ borderColor: "var(--accent-dim)", color: "var(--accent)" }}
                      >
                        {ciClassLabel(entry.ciClass)}
                      </span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        Included (SRD)
                      </span>
                      <span className="font-bold text-[var(--text)]">{entry.title}</span>
                    </span>
                    <span className="mt-1 block text-xs text-[var(--muted)]">{entry.kindLabel}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </WorkshopPageShell>
  );
}
