"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import {
  previewAiHeroesFromMarkdown,
  type ParsedHeroPreview,
} from "@/lib/tabletop/instantiateAiHeroes";
import { getActiveCampaignId } from "@/lib/campaigns";

export type SaveHeroesOptions = {
  linkCampaign: boolean;
};

type HeroScrySelectionProps = {
  markdown: string;
  onAccept: (selectedIndices: number[], options: SaveHeroesOptions) => void;
  busy?: boolean;
};

/**
 * Scry Window hero recruit — Save Heroes writes CF cards into characterLibrary
 * and refreshes the Lore Vault immediately.
 */
export default function HeroScrySelection({
  markdown,
  onAccept,
  busy = false,
}: HeroScrySelectionProps) {
  const heroes = useMemo(() => previewAiHeroesFromMarkdown(markdown).heroes, [markdown]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const hasActiveCampaign = Boolean(getActiveCampaignId());
  const [linkCampaign, setLinkCampaign] = useState(hasActiveCampaign);

  useEffect(() => {
    const next: Record<number, boolean> = {};
    for (const h of heroes) next[h.index] = true;
    setChecked(next);
  }, [heroes]);

  useEffect(() => {
    setLinkCampaign(hasActiveCampaign);
  }, [hasActiveCampaign]);

  const selectedCount = heroes.filter((h) => checked[h.index]).length;

  const toggle = (index: number) => {
    startTransition(() => {
      setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
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
      className="no-print sticky top-0 z-[5] mt-3 rounded-lg border p-3"
      style={{ borderColor: "var(--accent-dim)", background: "rgba(11,14,20,0.96)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#F0F6FC]">
            Save Heroes
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Saves checked heroes as Character Creation File cards in your Library and Lore Vault.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || selectedCount === 0}
          onClick={() =>
            onAccept(
              heroes.filter((h) => checked[h.index]).map((h) => h.index),
              { linkCampaign: hasActiveCampaign && linkCampaign },
            )
          }
          className="shrink-0 rounded-md px-4 py-2.5 text-sm font-bold text-[#0B0E14] disabled:opacity-50"
          style={{ background: "#E3B341" }}
          data-testid="save-hero-to-library"
        >
          {busy
            ? "Saving…"
            : selectedCount === 1
              ? "Save Heroes"
              : `Save Heroes (${selectedCount})`}
        </button>
      </div>

      {hasActiveCampaign ? (
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={linkCampaign}
            onChange={(e) => setLinkCampaign(e.target.checked)}
          />
          <span>Attach saved heroes directly to Active Campaign</span>
        </label>
      ) : null}

      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {heroes.map((hero: ParsedHeroPreview) => (
          <li key={`${hero.index}:${hero.id}`}>
            <label
              className="flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-xs"
              style={{ borderColor: "#30363D", background: "#161B22" }}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!checked[hero.index]}
                onChange={() => toggle(hero.index)}
              />
              <span className="min-w-0">
                <span className="font-semibold text-[#F0F6FC]">{hero.card.title}</span>
                <span className="block text-[10px] text-slate-400">
                  {hero.card.subtitle}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
