"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchSrdEntities, srdEntityKindLabel } from "@/lib/srd/corpus";
import type { SrdEntityKind, SrdEntitySummary } from "@/lib/srd/types";

type SrdEntityComboboxProps = {
  label?: string;
  placeholder?: string;
  kinds?: readonly SrdEntityKind[];
  onSelect: (entity: SrdEntitySummary) => void;
  /** Called when the user clears the field without picking. */
  onClear?: () => void;
  className?: string;
};

export default function SrdEntityCombobox({
  label = "Search SRD",
  placeholder = "Spell, monster, rule…",
  kinds,
  onSelect,
  onClear,
  className = "",
}: SrdEntityComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = searchSrdEntities(query, { kinds, limit: 12 });

  useEffect(() => {
    setActiveIndex(0);
  }, [query, kinds]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (entity: SrdEntitySummary) => {
    onSelect(entity);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onClear?.();
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && results[activeIndex]) {
            e.preventDefault();
            pick(results[activeIndex]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        className="rounded-md border px-2 py-1.5 text-sm text-[var(--text)]"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      />
      {open && query.trim() && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border shadow-md"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {results.map((entity, index) => (
            <li key={entity.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(entity)}
                className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left text-xs hover:bg-[rgba(201,162,39,0.12)]"
                style={
                  index === activeIndex
                    ? { background: "rgba(201, 162, 39, 0.16)" }
                    : undefined
                }
              >
                <span className="font-semibold text-[var(--text)]">{entity.name}</span>
                <span className="text-[var(--muted)]">
                  {srdEntityKindLabel(entity.kind)}
                  {entity.subtitle ? ` · ${entity.subtitle}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
