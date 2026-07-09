"use client";

import { useEffect } from "react";
import {
  ABILITY_LIST,
  abilityMod,
  characterSummary,
  effectiveAc,
  effectiveMaxHp,
  formatMod,
  proficiencyBonus,
} from "@/lib/tabletop/character";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import { formatSpellSlotsHint } from "@/lib/tabletop/characterLevelValidation";
import type { PlayerCharacter } from "@/lib/tabletop/types";

type CharacterSheetPrintViewProps = {
  character: PlayerCharacter;
  onClose: () => void;
};

/**
 * Print-ready 5e-style character sheet. Opens a dedicated surface and triggers
 * window.print(); interactive chrome is hidden via @media print.
 */
export default function CharacterSheetPrintView({
  character: p,
  onClose,
}: CharacterSheetPrintViewProps) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${p.name} — Character Sheet`;
    return () => {
      document.title = prev;
    };
  }, [p.name]);

  const prepared = new Set(p.preparedSpellIds);
  const spellsByLevel = (() => {
    const map = new Map<number, string[]>();
    for (const id of p.knownSpellIds) {
      const spell = findSpellIndexEntry(id);
      const level = spell?.level ?? 0;
      const label = spell?.name ?? id;
      const mark = prepared.has(id) ? `${label} ★` : label;
      const list = map.get(level) ?? [];
      list.push(mark);
      map.set(level, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  })();

  return (
    <div className="character-sheet-print-overlay no-print-hide-self fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="no-print flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-sm btn-accent"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>

        <article className="character-sheet-print" aria-label={`${p.name} character sheet`}>
          <header className="character-sheet-print-header">
            <div>
              <h1 className="character-sheet-print-name">{p.name}</h1>
              <p className="character-sheet-print-meta">
                {characterSummary(p)}
                {p.playerName ? ` · Player: ${p.playerName}` : ""}
              </p>
              <p className="character-sheet-print-meta">
                Background: {p.background || "—"} · Alignment: {p.alignment || "—"}
              </p>
            </div>
            <div className="character-sheet-print-combat">
              <div>
                <span className="character-sheet-print-stat-label">AC</span>
                <strong>{effectiveAc(p)}</strong>
              </div>
              <div>
                <span className="character-sheet-print-stat-label">HP</span>
                <strong>{effectiveMaxHp(p)}</strong>
              </div>
              <div>
                <span className="character-sheet-print-stat-label">Speed</span>
                <strong>{p.speed} ft</strong>
              </div>
              <div>
                <span className="character-sheet-print-stat-label">Prof</span>
                <strong>{formatMod(proficiencyBonus(p.level))}</strong>
              </div>
            </div>
          </header>

          <section className="character-sheet-print-abilities">
            {ABILITY_LIST.map(({ key, label }) => (
              <div key={key} className="character-sheet-print-ability">
                <span>{label}</span>
                <strong>{p.abilities[key]}</strong>
                <em>{formatMod(abilityMod(p.abilities[key]))}</em>
              </div>
            ))}
          </section>

          <div className="character-sheet-print-columns">
            <section>
              <h2>Equipment</h2>
              {p.items.length === 0 ? (
                <p className="character-sheet-print-empty">—</p>
              ) : (
                <ul>
                  {p.items.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong>
                      {item.notes ? ` — ${item.notes}` : ""}
                      {item.equipped === false ? " (unequipped)" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2>Spells</h2>
              <p className="character-sheet-print-slots">
                {formatSpellSlotsHint(p.level, p.className, p.subclass)}
              </p>
              {spellsByLevel.length === 0 ? (
                <p className="character-sheet-print-empty">No known spells.</p>
              ) : (
                spellsByLevel.map(([level, names]) => (
                  <div key={level} className="character-sheet-print-spell-block">
                    <h3>{level === 0 ? "Cantrips" : `Level ${level}`}</h3>
                    <p>{names.join("; ")}</p>
                  </div>
                ))
              )}
              <p className="character-sheet-print-footnote">★ = prepared / memorized</p>
            </section>
          </div>

          <section className="character-sheet-print-notes">
            <h2>Background &amp; flavor</h2>
            <p className="character-sheet-print-notebook">
              {p.notes.trim() || "—"}
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
