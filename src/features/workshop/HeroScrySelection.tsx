"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import {
  previewAiHeroesFromMarkdown,
  type ParsedHeroPreview,
} from "@/lib/tabletop/instantiateAiHeroes";

type HeroScrySelectionProps = {
  markdown: string;
  onAccept: (selectedIndices: number[]) => void;
  busy?: boolean;
};

/**
 * Scry Window multi-select for AI-generated heroes.
 * Checkbox state stays local for snappy toggles; accept writes only checked CFs.
 */
export default function HeroScrySelection({
  markdown,
  onAccept,
  busy = false,
}: HeroScrySelectionProps) {
  const heroes = useMemo(() => previewAiHeroesFromMarkdown(markdown).heroes, [markdown]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const next: Record<number, boolean> = {};
    for (const h of heroes) next[h.index] = true;
    setChecked(next);
  }, [heroes]);

  const selectedCount = heroes.filter((h) => checked[h.index]).length;

  const toggle = (index: number) => {
    startTransition(() => {
      setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
    });
  };

  const selectAll = (value: boolean) => {
    startTransition(() => {
      const next: Record<number, boolean> = {};
      for (const h of heroes) next[h.index] = value;
      setChecked(next);
    });
  };

  if (heroes.length === 0) {
    return (
      <p className="no-print mt-3 text-xs text-[var(--text-soft)]">
        No heroes found yet — wait for generation to finish, or check that each hero has a ### heading.
      </p>
    );
  }

  return (
    <div
      className="no-print mt-3 rounded-lg border p-3"
      style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.06)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
            Choose heroes to recruit
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
            Checked heroes become Character CFs in The Tavern and can link to campaigns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-[10px]"
            style={{ borderColor: "var(--border)" }}
            onClick={() => selectAll(true)}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-[10px]"
            style={{ borderColor: "var(--border)" }}
            onClick={() => selectAll(false)}
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {heroes.map((hero: ParsedHeroPreview) => (
          <li key={`${hero.index}:${hero.id}`}>
            <label
              className="flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!checked[hero.index]}
                onChange={() => toggle(hero.index)}
              />
              <span className="min-w-0">
                <span className="font-semibold text-[var(--text)]">{hero.name}</span>
                <span className="block text-[10px] text-[var(--text-soft)]">{hero.summary}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--text-soft)]">
          {selectedCount} of {heroes.length} selected
        </span>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() =>
            onAccept(heroes.filter((h) => checked[h.index]).map((h) => h.index))
          }
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {busy ? "Saving…" : `Accept ${selectedCount} hero${selectedCount === 1 ? "" : "es"}`}
        </button>
      </div>
    </div>
  );
}
