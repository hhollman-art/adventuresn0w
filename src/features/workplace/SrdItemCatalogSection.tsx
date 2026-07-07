"use client";

import { useEffect, useMemo, useState } from "react";
import {
  filterSrdItemEntries,
  loadSrdItemCatalog,
  srdItemCatalogToLibraryEntries,
  type SrdItemCatalog,
} from "@/lib/workplace/srdItemCatalog";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import type { SrdItemRef } from "@/lib/srd/srdItemRef";
import { openSrdItemPreview } from "@/lib/srd/openSrdPreview";
import { ciClassLabel } from "@/lib/ciRegistry";

type SrdItemCatalogSectionProps = {
  /** Called when the user picks an SRD item to preview or use. */
  onSelect?: (ref: SrdItemRef) => void;
  selectedRef?: SrdItemRef | null;
  /** Compact list for embedding in another panel. */
  compact?: boolean;
  className?: string;
};

function refKey(ref: SrdItemRef): string {
  return `${ref.resource}:${ref.index}`;
}

export default function SrdItemCatalogSection({
  onSelect,
  selectedRef,
  compact = false,
  className = "",
}: SrdItemCatalogSectionProps) {
  const [catalog, setCatalog] = useState<SrdItemCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "equipment" | "magic-items">("all");

  useEffect(() => {
    let cancelled = false;
    void loadSrdItemCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load SRD items.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => {
    if (!catalog) return [] as LibraryListEntry[];
    let list = srdItemCatalogToLibraryEntries(catalog);
    if (kindFilter !== "all") {
      list = list.filter((e) => e.srdItemRef?.resource === kindFilter);
    }
    return filterSrdItemEntries(list, query);
  }, [catalog, query, kindFilter]);

  return (
    <section className={className}>
      {!compact ? (
        <div className="mb-3">
          <h2 className="font-display text-base font-bold text-[var(--text)]">
            Included SRD items
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Every entry is a read-only CF (<code>item.srd-equipment</code> or{" "}
            <code>item.srd-magic</code>) from the bundled catalogue — add them to character
            gear or preview rules text here and in the Library.
          </p>
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SRD equipment and magic items…"
          className="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          aria-label="Search SRD items"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="rounded-lg border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          aria-label="Filter SRD item kind"
        >
          <option value="all">All SRD items</option>
          <option value="equipment">SRD equipment</option>
          <option value="magic-items">SRD magic items</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading SRD catalogue…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No SRD items match your search.</p>
      ) : (
        <ul
          className={
            compact
              ? "flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1"
              : "grid gap-2 sm:grid-cols-2"
          }
        >
          {entries.map((entry) => {
            const ref = entry.srdItemRef!;
            const selected = selectedRef ? refKey(selectedRef) === refKey(ref) : false;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => {
                    openSrdItemPreview(ref);
                    onSelect?.(ref);
                  }}
                  className="w-full rounded-xl border p-3 text-left text-sm transition hover:border-[var(--accent-dim)]"
                  style={{
                    borderColor: selected ? "var(--accent)" : "var(--border)",
                    background: selected ? "rgba(201,162,39,0.1)" : "var(--surface)",
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
  );
}
