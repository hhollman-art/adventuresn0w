"use client";

import { useMemo, useState } from "react";
import SrdEntityCombobox from "@/features/ui/SrdEntityCombobox";
import {
  SRD_ANCESTRY_NAMES,
  SRD_CLASS_NAMES,
  findSrdClass,
  formatSpellLevel,
  openSrdSpellPreview,
  srdSpellsForClass,
} from "@/lib/srd";
import {
  canKnowSpellAtLevel,
  maxSpellLevelForCharacter,
} from "@/lib/srd/classProgression";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import { formatSpellSlotsHint } from "@/lib/tabletop/characterLevelValidation";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";

type SrdNamedSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Label for the empty option (default "—"). */
  emptyLabel?: string;
};

/** SRD-only dropdown with optional custom text for user-owned content. */
export function SrdNamedSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  emptyLabel = "—",
}: SrdNamedSelectProps) {
  const trimmed = value.trim();
  const inList = trimmed !== "" && options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const [customMode, setCustomMode] = useState(trimmed !== "" && !inList);

  const selectValue = customMode ? "__custom__" : trimmed;

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold">{label}</span>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__custom__") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
        className="rounded border px-2 py-1.5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom__">Custom (your books)…</option>
      </select>
      {customMode ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Type your own"}
          className="rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        />
      ) : null}
    </label>
  );
}

type SrdClassSubclassFieldsProps = {
  className: string;
  subclass: string;
  onClassChange: (className: string) => void;
  onSubclassChange: (subclass: string) => void;
};

export function SrdClassSubclassFields({
  className,
  subclass,
  onClassChange,
  onSubclassChange,
}: SrdClassSubclassFieldsProps) {
  const srdSubclass = findSrdClass(className)?.srdSubclass ?? null;

  return (
    <>
      <SrdNamedSelect
        label="Class (included rules)"
        value={className}
        options={SRD_CLASS_NAMES}
        onChange={(next) => {
          onClassChange(next);
          const bundled = findSrdClass(next)?.srdSubclass;
          if (bundled && !subclass.trim()) {
            onSubclassChange(bundled);
          }
        }}
        placeholder="e.g. Fighter"
      />
      <SrdNamedSelect
        label="Subclass"
        value={subclass}
        options={srdSubclass ? [srdSubclass] : []}
        onChange={onSubclassChange}
        placeholder={srdSubclass ?? "Champion"}
      />
    </>
  );
}

type SrdSpellPickerProps = {
  className: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Character level — gates which spell tiers can be selected. */
  characterLevel?: number;
  subclass?: string;
};

export function SrdSpellPicker({
  className,
  selectedIds,
  onChange,
  characterLevel = 1,
  subclass = "",
}: SrdSpellPickerProps) {
  const [query, setQuery] = useState("");
  const [levelHint, setLevelHint] = useState<string | null>(null);
  const spells = useMemo(() => srdSpellsForClass(className), [className]);
  const maxSpellLevel = useMemo(
    () => maxSpellLevelForCharacter(characterLevel, className, subclass),
    [characterLevel, className, subclass],
  );
  const slotsHint = useMemo(
    () => formatSpellSlotsHint(characterLevel, className, subclass),
    [characterLevel, className, subclass],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spells;
    return spells.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        formatSpellLevel(s.level).toLowerCase().includes(q),
    );
  }, [query, spells]);

  const tryAdd = (id: string, spellLevel: number, name: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      setLevelHint(null);
      return;
    }
    if (!canKnowSpellAtLevel(characterLevel, className, subclass, spellLevel)) {
      setLevelHint(
        maxSpellLevel < 0
          ? `${className || "This class"} cannot learn spells at level ${characterLevel}.`
          : `${name} is too high — at level ${characterLevel} you may only take up to level-${Math.max(0, maxSpellLevel)} spells.`,
      );
      return;
    }
    setLevelHint(null);
    onChange([...selectedIds, id]);
  };

  const toggle = (id: string, spellLevel: number, name: string) => {
    tryAdd(id, spellLevel, name);
  };

  if (!srdSpellsForClass(className).length) {
    return (
      <p className="text-xs text-[var(--muted)]">
        This class has no spell list in the included rules. Add spells from your own books in
        Background — they stay on this device.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] leading-relaxed text-[var(--text-soft)]">{slotsHint}</p>
      <SrdEntityCombobox
        label="Find any SRD spell"
        kinds={["spell"]}
        placeholder="Search the full spell list…"
        onSelect={(entity) => {
          const level = findSpellIndexEntry(entity.key)?.level ?? 0;
          tryAdd(entity.key, level, entity.name);
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide uppercase">Spells (included rules)</p>
        <span className="text-[10px] text-[var(--muted)]">{selectedIds.length} selected</span>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter spells…"
        className="rounded border px-2 py-1.5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      {levelHint ? (
        <p className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] text-red-800" role="status">
          {levelHint}
        </p>
      ) : null}
      <div
        className="max-h-40 overflow-y-auto rounded border p-1"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-xs text-[var(--muted)]">No matches.</p>
        ) : (
          filtered.map((spell) => {
            const allowed = canKnowSpellAtLevel(
              characterLevel,
              className,
              subclass,
              spell.level,
            );
            return (
              <div
                key={spell.id}
                className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${
                  allowed ? "hover:bg-[rgba(154,116,22,0.06)]" : "opacity-45"
                }`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(spell.id)}
                    disabled={!allowed && !selectedIds.includes(spell.id)}
                    onChange={() => toggle(spell.id, spell.level, spell.name)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">{spell.name}</span>{" "}
                    <span className="text-[var(--muted)]">
                      ({formatSpellLevel(spell.level)}, {spell.school})
                      {!allowed ? " — locked for this level" : ""}
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => openSrdSpellPreview(spell)}
                  className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]"
                  style={{ borderColor: "var(--accent-dim)" }}
                  title={`Open ${spell.name} in the ${PREVIEW_WINDOW}`}
                >
                  Rules
                </button>
              </div>
            );
          })
        )}
      </div>
      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        Spell tiers follow your character level and class slots. Spells from books you own that are
        not in the SRD belong in Background — they stay on this device only.
      </p>
    </div>
  );
}

export function SrdSpeciesSelect({
  value,
  onChange,
  emptyLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  return (
    <SrdNamedSelect
      label="Species (included rules)"
      value={value}
      options={SRD_ANCESTRY_NAMES}
      onChange={onChange}
      placeholder="Human"
      emptyLabel={emptyLabel}
    />
  );
}
