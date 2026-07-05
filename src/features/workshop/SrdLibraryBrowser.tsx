"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchDnd5eList,
  SRD_API_CATEGORIES,
  srdListItemDetail,
  type Dnd5eListItem,
  type SrdApiResource,
} from "@/lib/srd/dnd5eApi";
import { SRD_MANIFEST } from "@/lib/srd/manifest";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";

type SrdLibraryBrowserProps = {
  selection: LibraryViewSelection;
  onSelect: (selection: LibraryViewSelection) => void;
  wideLayout?: boolean;
};

function isSrdSelected(
  selection: LibraryViewSelection,
  resource: SrdApiResource,
  index: string,
): boolean {
  return (
    selection?.kind === "srd" &&
    selection.resource === resource &&
    selection.index === index
  );
}

export default function SrdLibraryBrowser({
  selection,
  onSelect,
  wideLayout = false,
}: SrdLibraryBrowserProps) {
  const [resource, setResource] = useState<SrdApiResource>("rule-sections");
  const [items, setItems] = useState<Dnd5eListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadList = useCallback(async (nextResource: SrdApiResource) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchDnd5eList(nextResource);
      setItems(results);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load SRD list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(resource);
  }, [resource, loadList]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, query]);

  const categoryMeta = SRD_API_CATEGORIES.find((c) => c.resource === resource);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className="rounded-lg border p-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <p className="text-[var(--muted)]">
          <strong className="text-[var(--text)]">Included rules (SRD)</strong> — browse spells,
          monsters, classes, equipment, and rules via the{" "}
          <a
            href="https://www.dnd5eapi.co/"
            className="font-semibold text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            D&amp;D 5e SRD API
          </a>{" "}
          ({SRD_MANIFEST.license}, read-only). Character pickers use the bundled{" "}
          {SRD_MANIFEST.version} index. Material from books you own stays in your imports — never
          here. See{" "}
          <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
            Licenses &amp; content
          </Link>
          .
        </p>
      </div>

      <div className="srd-button-grid srd-category-grid" role="tablist" aria-label="SRD categories">
        {SRD_API_CATEGORIES.map((cat) => (
          <button
            key={cat.resource}
            type="button"
            role="tab"
            aria-selected={resource === cat.resource}
            onClick={() => {
              setResource(cat.resource);
              setQuery("");
            }}
            className={`srd-grid-btn${resource === cat.resource ? " srd-grid-btn-active" : ""}`}
          >
            <span className="srd-grid-btn-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {categoryMeta ? (
        <p className="text-xs text-[var(--muted)]">{categoryMeta.description}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Search {categoryMeta?.label.toLowerCase() ?? "entries"}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="rounded-md border px-2 py-1.5 text-sm text-[var(--text)]"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        />
      </label>

      {error ? (
        <p className="rounded-lg border px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading SRD entries…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {query.trim() ? "No matches — try a different search." : "No entries in this category."}
        </p>
      ) : (
        <div
          className={
            wideLayout
              ? "srd-button-grid srd-entry-grid min-h-0 flex-1"
              : "srd-button-grid srd-entry-grid max-h-[min(44vh,360px)]"
          }
        >
          {filtered.map((item) => {
            const selected = isSrdSelected(selection, resource, item.index);
            const detail = srdListItemDetail(item, resource);
            return (
              <button
                key={`${resource}-${item.index}`}
                type="button"
                onClick={() =>
                  onSelect({
                    kind: "srd",
                    resource,
                    index: item.index,
                    name: item.name,
                  })
                }
                className={`srd-grid-btn${selected ? " srd-grid-btn-active" : ""}`}
              >
                <span className="srd-grid-btn-label">{item.name}</span>
                {detail ? <span className="srd-grid-btn-detail">{detail}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {!loading && items.length > 0 ? (
        <p className="text-[11px] text-[var(--muted)]">
          {filtered.length} of {items.length} {categoryMeta?.label.toLowerCase() ?? "entries"}
          {query.trim() ? " matching search" : ""}. Select one to preview in the panel on the right.
        </p>
      ) : null}
    </div>
  );
}
