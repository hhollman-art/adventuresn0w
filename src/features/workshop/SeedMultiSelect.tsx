"use client";

import { useMemo, useState } from "react";
import SeedFilterBar from "@/features/workshop/SeedFilterBar";
import {
  ddeasySeedOptionLabel,
  type RealmScopeTag,
  type SavedRealmSeed,
  type SeedKind,
} from "@/lib/realmSeeds";
import { filterSeeds, seedTagLabel, WORKSHOP_TAB_SEED_KINDS } from "@/lib/seedTags";

type SeedMultiSelectProps = {
  label: string;
  description: string;
  emptyHint: string;
  seeds: SavedRealmSeed[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** When set, defaults to seed kinds useful on this workshop tab. */
  workshopTab?: SeedKind;
};

export default function SeedMultiSelect({
  label,
  description,
  emptyHint,
  seeds,
  selectedIds,
  onChange,
  workshopTab,
}: SeedMultiSelectProps) {
  const [kindFilter, setKindFilter] = useState<SeedKind | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<RealmScopeTag | "all">("all");
  const relevantKinds = workshopTab ? WORKSHOP_TAB_SEED_KINDS[workshopTab] : undefined;
  const showScopeFilter =
    workshopTab === "realm" ||
    relevantKinds?.includes("realm") === true;

  const scopedSeeds = useMemo(
    () =>
      filterSeeds(seeds, {
        limitToKinds: relevantKinds,
        kindFilter,
        tagFilter,
        scopeFilter,
      }),
    [seeds, relevantKinds, kindFilter, tagFilter, scopeFilter],
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-[var(--text)]">{label}</legend>
      <p className="text-xs text-[var(--muted)]">{description}</p>
      {seeds.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">{emptyHint}</p>
      ) : (
        <>
          <SeedFilterBar
            seeds={
              relevantKinds
                ? filterSeeds(seeds, { limitToKinds: relevantKinds })
                : seeds
            }
            kindFilter={kindFilter}
            tagFilter={tagFilter}
            scopeFilter={scopeFilter}
            onKindFilterChange={setKindFilter}
            onTagFilterChange={setTagFilter}
            onScopeFilterChange={setScopeFilter}
            showScopeFilter={showScopeFilter}
            kindOptions={relevantKinds}
          />
          {scopedSeeds.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              No CFs match these filters. Try another type, scope, or tag.
            </p>
          ) : (
            <ul
              className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border p-2 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {scopedSeeds.map((seed) => {
                const checked = selectedIds.includes(seed.id);
                return (
                  <li key={seed.id}>
                    <label
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5"
                      style={{
                        background: checked
                          ? "rgba(201, 162, 39, 0.12)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(seed.id)}
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[var(--text)]">
                          {ddeasySeedOptionLabel(seed)}
                        </span>
                        {seed.tags?.length ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {seed.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  borderColor: "var(--border)",
                                  color: "var(--muted)",
                                }}
                              >
                                {seedTagLabel(tag)}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 ? (
              <>
                <p className="text-[11px] text-[var(--muted)]">
                  {selectedIds.length} source
                  {selectedIds.length === 1 ? "" : "s"} selected
                </p>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="rounded-md border px-2 py-1 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Clear selection
                </button>
              </>
            ) : (
              <p className="text-[11px] text-[var(--muted)]">
                Select one or more CFs to attach as source material.
              </p>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}
