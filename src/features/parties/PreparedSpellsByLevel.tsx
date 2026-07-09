"use client";

import { useMemo, useState } from "react";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import { canKnowSpellAtLevel } from "@/lib/srd/classProgression";
import { formatSpellSlotsHint } from "@/lib/tabletop/characterLevelValidation";

/**
 * Spells split by level with Memorized / Prepared checkboxes.
 * Writes preparedSpellIds (subset of knownSpellIds), gated by character level.
 */
export default function PreparedSpellsByLevel({
  knownSpellIds,
  preparedSpellIds,
  onChangePrepared,
  characterLevel = 1,
  className = "",
  subclass = "",
}: {
  knownSpellIds: string[];
  preparedSpellIds: string[];
  onChangePrepared: (ids: string[]) => void;
  characterLevel?: number;
  className?: string;
  subclass?: string;
}) {
  const prepared = useMemo(() => new Set(preparedSpellIds), [preparedSpellIds]);
  const [hint, setHint] = useState<string | null>(null);
  const slotsHint = useMemo(
    () => formatSpellSlotsHint(characterLevel, className, subclass),
    [characterLevel, className, subclass],
  );

  const byLevel = useMemo(() => {
    const map = new Map<number, { id: string; name: string; level: number }[]>();
    for (const id of knownSpellIds) {
      const spell = findSpellIndexEntry(id);
      const level = spell?.level ?? 0;
      const name = spell?.name ?? id;
      const list = map.get(level) ?? [];
      list.push({ id, name, level });
      map.set(level, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, spells]) => ({
        level,
        label: level === 0 ? "Cantrips" : `Level ${level}`,
        spells: spells.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [knownSpellIds]);

  function toggle(id: string, spellLevel: number, name: string, next: boolean) {
    if (next) {
      if (prepared.has(id)) return;
      if (!canKnowSpellAtLevel(characterLevel, className, subclass, spellLevel)) {
        setHint(
          `${name} cannot be prepared at level ${characterLevel} for ${className || "this class"}.`,
        );
        return;
      }
      setHint(null);
      onChangePrepared([...preparedSpellIds, id]);
    } else {
      setHint(null);
      onChangePrepared(preparedSpellIds.filter((x) => x !== id));
    }
  }

  if (knownSpellIds.length === 0) {
    return (
      <p className="text-xs text-[var(--text-soft)]">
        No known spells yet — add spells above, then mark which are prepared.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-soft)]">
        Check <strong>Prepared</strong> for spells this hero has memorized for the day.{" "}
        <span className="text-[10px]">{slotsHint}</span>
      </p>
      {hint ? (
        <p className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800" role="status">
          {hint}
        </p>
      ) : null}
      {byLevel.map((group) => {
        const groupAllowed = canKnowSpellAtLevel(
          characterLevel,
          className,
          subclass,
          group.level,
        );
        return (
          <div key={group.level} className={groupAllowed ? "" : "opacity-50"}>
            <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-soft)]">
              {group.label}
              {!groupAllowed ? " — locked for this level" : ""}
            </h4>
            <ul className="mt-1 space-y-1">
              {group.spells.map((spell) => (
                <li key={spell.id}>
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <input
                      type="checkbox"
                      checked={prepared.has(spell.id)}
                      disabled={!groupAllowed && !prepared.has(spell.id)}
                      onChange={(e) =>
                        toggle(spell.id, spell.level, spell.name, e.target.checked)
                      }
                    />
                    <span className="font-semibold text-[var(--text)]">{spell.name}</span>
                    <span className="text-[var(--text-soft)]">Prepared</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
