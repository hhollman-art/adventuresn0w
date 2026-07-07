"use client";

import type { CiClass } from "@/lib/ciRegistry";
import type { RealmScopeTag, SeedKind } from "@/lib/realmSeeds";
import {
  LIBRARY_BROWSE_PROVENANCE_FILTERS,
  LIBRARY_SHELF_LABEL,
  provenanceFilterLabel,
  type CiClassFilterOption,
  type LibraryBrowseProvenanceFilter,
} from "@/lib/workshop/libraryBrowseFilters";
import type { WorkshopLibraryCategory } from "@/lib/workshop/libraryCatalog";
import {
  REALM_SCOPE_TAGS,
  realmScopeTagLabel,
  SEED_KIND_LABEL,
  SEED_KINDS,
} from "@/lib/realmSeeds";
import { seedTagLabel } from "@/lib/seedTags";

type LibraryBrowseToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  shelf: WorkshopLibraryCategory;
  onShelfChange: (shelf: WorkshopLibraryCategory) => void;
  shelfCounts: Record<WorkshopLibraryCategory, number>;
  ciClassFilter: CiClass | "all";
  onCiClassFilterChange: (value: CiClass | "all") => void;
  ciClassOptions: CiClassFilterOption[];
  provenanceFilter: LibraryBrowseProvenanceFilter;
  onProvenanceFilterChange: (value: LibraryBrowseProvenanceFilter) => void;
  seedKindFilter?: SeedKind | "all";
  onSeedKindFilterChange?: (value: SeedKind | "all") => void;
  seedTagFilter?: string | "all";
  onSeedTagFilterChange?: (value: string | "all") => void;
  seedScopeFilter?: RealmScopeTag | "all";
  onSeedScopeFilterChange?: (value: RealmScopeTag | "all") => void;
  seedTagOptions?: string[];
  showSeedRefine?: boolean;
};

const SHELF_TABS: WorkshopLibraryCategory[] = [
  "all",
  "seeds",
  "results",
  "characters",
  "items",
  "rules",
  "monsters",
  "parties",
  "campaigns",
];

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="library-filter-chip rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "rgba(201, 162, 39, 0.16)" : "rgba(154, 116, 22, 0.04)",
        color: active ? "var(--accent)" : "var(--text)",
      }}
    >
      {label}
      {count !== undefined ? ` (${count})` : ""}
    </button>
  );
}

export default function LibraryBrowseToolbar({
  search,
  onSearchChange,
  shelf,
  onShelfChange,
  shelfCounts,
  ciClassFilter,
  onCiClassFilterChange,
  ciClassOptions,
  provenanceFilter,
  onProvenanceFilterChange,
  seedKindFilter = "all",
  onSeedKindFilterChange,
  seedTagFilter = "all",
  onSeedTagFilterChange,
  seedScopeFilter = "all",
  onSeedScopeFilterChange,
  seedTagOptions = [],
  showSeedRefine = false,
}: LibraryBrowseToolbarProps) {
  const kindOptions = ciClassOptions.length > 1 ? ciClassOptions : [];

  return (
    <div className="library-browse-toolbar flex shrink-0 flex-col gap-3">
      <label className="library-browse-search flex items-center gap-2 rounded-lg border px-3 py-2">
        <span className="font-display text-sm text-[var(--accent)]" aria-hidden="true">
          &#10022;
        </span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search the stacks by name, kind, or note…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          aria-label="Search The Library"
        />
      </label>

      <div
        className="library-shelf-tabs flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Archive shelves"
      >
        {SHELF_TABS.map((tab) => {
          const count = shelfCounts[tab];
          const active = shelf === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onShelfChange(tab)}
              className={`library-shelf-tab rounded-md border px-2.5 py-1.5 text-xs font-semibold transition${
                active ? " library-shelf-tab-active" : ""
              }`}
              style={{
                borderColor: active ? "var(--accent-dim)" : "var(--border)",
                background: active ? "rgba(201, 162, 39, 0.14)" : "rgba(154, 116, 22, 0.04)",
                color: active ? "var(--text)" : "var(--muted)",
              }}
            >
              {LIBRARY_SHELF_LABEL[tab]}
              <span className="ml-1 font-normal opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {kindOptions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Kind of entry
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kindOptions.map((opt) => (
              <FilterChip
                key={opt.ciClass}
                active={ciClassFilter === opt.ciClass}
                label={opt.label}
                count={opt.count}
                onClick={() => onCiClassFilterChange(opt.ciClass)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Where it comes from
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LIBRARY_BROWSE_PROVENANCE_FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              active={provenanceFilter === filter}
              label={provenanceFilterLabel(filter)}
              onClick={() => onProvenanceFilterChange(filter)}
            />
          ))}
        </div>
      </div>

      {showSeedRefine &&
      onSeedKindFilterChange &&
      onSeedScopeFilterChange &&
      onSeedTagFilterChange ? (
        <details
          className="rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.03)" }}
        >
          <summary className="cursor-pointer text-xs font-semibold text-[var(--text)]">
            Refine CFs
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                CF type
              </span>
              <FilterChip
                active={seedKindFilter === "all"}
                label="All types"
                onClick={() => onSeedKindFilterChange("all")}
              />
              {SEED_KINDS.map((kind) => (
                <FilterChip
                  key={kind}
                  active={seedKindFilter === kind}
                  label={SEED_KIND_LABEL[kind]}
                  onClick={() => onSeedKindFilterChange(kind)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Realm scope
              </span>
              <FilterChip
                active={seedScopeFilter === "all"}
                label="Any scope"
                onClick={() => onSeedScopeFilterChange("all")}
              />
              {REALM_SCOPE_TAGS.map((scope) => (
                <FilterChip
                  key={scope}
                  active={seedScopeFilter === scope}
                  label={realmScopeTagLabel(scope)}
                  onClick={() => onSeedScopeFilterChange(scope)}
                />
              ))}
            </div>
            {seedTagOptions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Story tags
                </span>
                <FilterChip
                  active={seedTagFilter === "all"}
                  label="All tags"
                  onClick={() => onSeedTagFilterChange("all")}
                />
                {seedTagOptions.map((tag) => (
                  <FilterChip
                    key={tag}
                    active={seedTagFilter === tag}
                    label={seedTagLabel(tag)}
                    onClick={() => onSeedTagFilterChange(tag)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
