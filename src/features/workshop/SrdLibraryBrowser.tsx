"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  listSrdEntities,
  srdEntityKindLabel,
} from "@/lib/srd/corpus";
import { SRD_MANIFEST } from "@/lib/srd/manifest";
import type { SrdEntityKind } from "@/lib/srd/types";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import SrdCloneButton, { SrdCloneCategoryButton } from "@/features/srd/SrdCloneButton";
import type { CloneSrdResult } from "@/lib/srd/cloneSrdEntity";

type SrdLibraryBrowserProps = {
  selection: LibraryViewSelection;
  onSelect: (selection: LibraryViewSelection) => void;
  wideLayout?: boolean;
  onCloned?: (result: CloneSrdResult) => void;
  onBulkCloned?: (results: CloneSrdResult[]) => void;
  onStatus?: (message: string | null) => void;
};

const BROWSER_KINDS: {
  kind: SrdEntityKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "rule",
    label: "Rules",
    description: "Playing the game, actions, and glossary sections.",
  },
  {
    kind: "spell",
    label: "Spells",
    description: "Every spell in the bundled SRD spell list.",
  },
  {
    kind: "monster",
    label: "Monsters",
    description: "Stat blocks from the SRD bestiary.",
  },
  {
    kind: "class",
    label: "Classes",
    description: "Character classes from the bundled SRD.",
  },
  {
    kind: "class-feature",
    label: "Class features",
    description: "Subclass features, invocations, and other class abilities.",
  },
  {
    kind: "species",
    label: "Species",
    description: "Ancestry / species options from the SRD.",
  },
  {
    kind: "feat",
    label: "Feats",
    description: "Optional feats from the SRD.",
  },
  {
    kind: "background",
    label: "Backgrounds",
    description: "Character backgrounds from the SRD.",
  },
  {
    kind: "condition",
    label: "Conditions",
    description: "Combat conditions such as Blinded, Grappled, and Prone.",
  },
  {
    kind: "skill",
    label: "Skills",
    description: "Skill definitions from the rules glossary.",
  },
  {
    kind: "glossary-term",
    label: "Glossary",
    description: "General rules terms from the SRD glossary.",
  },
  {
    kind: "weapon",
    label: "Weapons",
    description: "Weapon entries with damage dice and properties.",
  },
  {
    kind: "armor",
    label: "Armor",
    description: "Armor entries with AC and requirements.",
  },
  {
    kind: "equipment",
    label: "Equipment",
    description: "Adventuring gear, tools, packs, and services.",
  },
  {
    kind: "magic-item",
    label: "Magic items",
    description: "Magic treasures from the SRD.",
  },
];

function isEntitySelected(
  selection: LibraryViewSelection,
  entityId: string,
): boolean {
  return selection?.kind === "srd-entity" && selection.entityId === entityId;
}

export default function SrdLibraryBrowser({
  selection,
  onSelect,
  wideLayout = false,
  onCloned,
  onBulkCloned,
  onStatus,
}: SrdLibraryBrowserProps) {
  const [kind, setKind] = useState<SrdEntityKind>("rule");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const pool = listSrdEntities(kind);
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.key.includes(q) ||
        (entity.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [kind, query]);

  const kindMeta = BROWSER_KINDS.find((row) => row.kind === kind);
  const selectedEntityId =
    selection?.kind === "srd-entity" ? selection.entityId : null;
  const selectedEntity = selectedEntityId
    ? filtered.find((entity) => entity.id === selectedEntityId) ??
      listSrdEntities(kind).find((entity) => entity.id === selectedEntityId)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className="rounded-lg border p-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <p className="text-[var(--muted)]">
          <strong className="text-[var(--text)]">Included rules (SRD)</strong> — browse spells,
          monsters, classes, equipment, and rules. Full descriptions open in the {PREVIEW_WINDOW}{" "}
          from the bundled <strong className="text-[var(--text)]">{SRD_MANIFEST.documentPdfId}</strong>{" "}
          ({SRD_MANIFEST.license}, read-only). Clone any entry to your editable workspace with{" "}
          <strong className="text-[var(--text)]">Copy &amp; Edit</strong>. Material from books you
          own stays in your imports — never here. See{" "}
          <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
            Licenses &amp; content
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {kindMeta ? (
          <SrdCloneCategoryButton
            kind={kind}
            categoryLabel={kindMeta.label}
            entryCount={listSrdEntities(kind).length}
            onCloned={(results) => {
              onBulkCloned?.(results);
              onStatus?.(
                `Cloned ${results.length} ${kindMeta.label.toLowerCase()} entr${results.length === 1 ? "y" : "ies"} to your workspace.`,
              );
            }}
            onError={(message) => onStatus?.(message)}
          />
        ) : null}
        {selectedEntity ? (
          <SrdCloneButton
            entityId={selectedEntity.id}
            entityName={selectedEntity.name}
            onCloned={(result) => {
              onCloned?.(result);
              onStatus?.(`Copied “${selectedEntity.name}” to your workspace — opening editor…`);
            }}
            onError={(message) => onStatus?.(message)}
          />
        ) : null}
      </div>

      <div className="srd-button-grid srd-category-grid" role="tablist" aria-label="SRD categories">
        {BROWSER_KINDS.map((cat) => (
          <button
            key={cat.kind}
            type="button"
            role="tab"
            aria-selected={kind === cat.kind}
            onClick={() => {
              setKind(cat.kind);
              setQuery("");
            }}
            className={`srd-grid-btn${kind === cat.kind ? " srd-grid-btn-active" : ""}`}
          >
            <span className="srd-grid-btn-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {kindMeta ? (
        <p className="text-xs text-[var(--muted)]">{kindMeta.description}</p>
      ) : null}

      <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        Search {kindMeta?.label.toLowerCase() ?? "entries"}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="rounded-md border px-2 py-1.5 text-sm text-[var(--text)]"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        />
      </label>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {query.trim() ? "No matches — try a different search." : "No entries in this category."}
        </p>
      ) : (
        <div
          className={
            wideLayout
              ? "srd-button-grid srd-entry-grid min-h-0 flex-1"
              : "srd-button-grid srd-entry-grid max-h-[min(44vh,360px)]"
          }
        >
          {filtered.map((entity) => {
            const selected = isEntitySelected(selection, entity.id);
            return (
              <button
                key={entity.id}
                type="button"
                onClick={() =>
                  onSelect({
                    kind: "srd-entity",
                    entityId: entity.id,
                    name: entity.name,
                  })
                }
                className={`srd-grid-btn${selected ? " srd-grid-btn-active" : ""}`}
              >
                <span className="srd-grid-btn-label">{entity.name}</span>
                {entity.subtitle ? (
                  <span className="srd-grid-btn-detail">{entity.subtitle}</span>
                ) : (
                  <span className="srd-grid-btn-detail">{srdEntityKindLabel(entity.kind)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > 0 ? (
        <p className="text-[11px] text-[var(--muted)]">
          {filtered.length} {kindMeta?.label.toLowerCase() ?? "entries"}
          {query.trim() ? " matching search" : ""}. Select one, then use Copy &amp; Edit to clone it
          into your workspace.
        </p>
      ) : null}
    </div>
  );
}
