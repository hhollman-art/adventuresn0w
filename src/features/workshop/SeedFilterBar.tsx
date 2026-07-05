"use client";

import {
  collectSeedTags,
  seedTagLabel,
  type SeedListFilters,
} from "@/lib/seedTags";
import { SEED_KIND_LABEL, SEED_KINDS, type SavedRealmSeed, type SeedKind } from "@/lib/realmSeeds";

type SeedFilterBarProps = {
  seeds: SavedRealmSeed[];
  kindFilter: SeedKind | "all";
  tagFilter: string | "all";
  onKindFilterChange: (value: SeedKind | "all") => void;
  onTagFilterChange: (value: string | "all") => void;
  /** Restrict the kind dropdown/chips to these values (workshop tab relevance). */
  kindOptions?: readonly SeedKind[];
  className?: string;
  style?: React.CSSProperties;
};

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "rgba(201, 162, 39, 0.16)" : "transparent",
        color: active ? "var(--accent)" : "var(--muted)",
      }}
    >
      {label}
    </button>
  );
}

export default function SeedFilterBar({
  seeds,
  kindFilter,
  tagFilter,
  onKindFilterChange,
  onTagFilterChange,
  kindOptions = SEED_KINDS,
  className = "",
  style,
}: SeedFilterBarProps) {
  const tagOptions = collectSeedTags(seeds);

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()} style={style}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Type
        </span>
        <FilterChip
          active={kindFilter === "all"}
          label="All"
          onClick={() => onKindFilterChange("all")}
        />
        {kindOptions.map((kind) => (
          <FilterChip
            key={kind}
            active={kindFilter === kind}
            label={SEED_KIND_LABEL[kind]}
            onClick={() => onKindFilterChange(kind)}
          />
        ))}
      </div>
      {tagOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Tags
          </span>
          <FilterChip
            active={tagFilter === "all"}
            label="All"
            onClick={() => onTagFilterChange("all")}
          />
          {tagOptions.map((tag) => (
            <FilterChip
              key={tag}
              active={tagFilter === tag}
              label={seedTagLabel(tag)}
              onClick={() => onTagFilterChange(tag)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function seedFiltersActive(filters: SeedListFilters): boolean {
  return (
    (filters.kindFilter !== undefined && filters.kindFilter !== "all") ||
    (filters.tagFilter !== undefined && filters.tagFilter !== "all")
  );
}
