"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ciClassForSrdEntity,
  listSrdEntities,
  srdEntityKindLabel,
} from "@/lib/srd/corpus";
import type { SrdEntityKind, SrdEntitySummary } from "@/lib/srd/types";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import SrdCloneButton, { SrdCloneCategoryButton } from "@/features/srd/SrdCloneButton";
import type { CloneSrdResult } from "@/lib/srd/cloneSrdEntity";
import ContextMenu from "@/features/ui/ContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { parkCfFromContext, sendCfToActiveCampaign } from "@/lib/workshop/cfContextActions";

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
  const [menuEntity, setMenuEntity] = useState<SrdEntitySummary | null>(null);
  const menu = useContextMenu();

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
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-[11px] leading-snug text-[var(--muted)]">
        <strong className="text-[var(--text)]">Included rules (SRD)</strong> — pick an entry to
        inspect it in the Scrying panel. Clone with Copy &amp; Edit. See{" "}
        <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
          Licenses &amp; content
        </Link>
        .
      </p>

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
        <p className="sr-only">{kindMeta.description}</p>
      ) : null}

      <label className="library-browse-toolbar--sticky flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-[var(--muted)]">
        Search {kindMeta?.label.toLowerCase() ?? "entries"}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text)] outline-none"
          aria-label={`Search ${kindMeta?.label.toLowerCase() ?? "entries"}`}
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
                onContextMenu={(event) => {
                  setMenuEntity(entity);
                  menu.bind.onContextMenu(event);
                }}
                onPointerDown={(event) => {
                  setMenuEntity(entity);
                  menu.bind.onPointerDown(event);
                }}
                onPointerMove={menu.bind.onPointerMove}
                onPointerUp={menu.bind.onPointerUp}
                onPointerCancel={menu.bind.onPointerCancel}
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

      <ContextMenu
        open={menu.open && Boolean(menuEntity)}
        x={menu.position?.x ?? 0}
        y={menu.position?.y ?? 0}
        label={`Actions for ${menuEntity?.name ?? "SRD entry"}`}
        onClose={menu.close}
        items={
          menuEntity
            ? [
                {
                  id: "campaign",
                  label: "Add to Active Campaign",
                  onSelect: () =>
                    sendCfToActiveCampaign({
                      id: menuEntity.id,
                      title: menuEntity.name,
                      ciClass: ciClassForSrdEntity(menuEntity.kind),
                      category:
                        menuEntity.kind === "monster"
                          ? "monsters"
                          : menuEntity.kind === "equipment" ||
                              menuEntity.kind === "weapon" ||
                              menuEntity.kind === "armor" ||
                              menuEntity.kind === "magic-item"
                            ? "items"
                            : "rules",
                      provenance: "srd",
                      detail: menuEntity.subtitle ?? "",
                      srdEntityId: menuEntity.id,
                    }),
                },
                {
                  id: "park",
                  label: "Park in Lore Vault",
                  onSelect: () =>
                    parkCfFromContext({
                      id: menuEntity.id,
                      title: menuEntity.name,
                      ciClass: ciClassForSrdEntity(menuEntity.kind),
                      category: "rules",
                      provenance: "srd",
                      detail: menuEntity.subtitle ?? "",
                      srdEntityId: menuEntity.id,
                    }),
                },
                {
                  id: "inspect",
                  label: "Inspect Details (Scrying Glass)",
                  onSelect: () =>
                    onSelect({
                      kind: "srd-entity",
                      entityId: menuEntity.id,
                      name: menuEntity.name,
                    }),
                },
                {
                  id: "edit",
                  label: "Quick Edit",
                  disabled: true,
                  onSelect: () => undefined,
                },
              ]
            : []
        }
      />
    </div>
  );
}
