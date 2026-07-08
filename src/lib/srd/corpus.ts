import type { CiClass } from "@/lib/ciRegistry";
import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";
import {
  buildSrdSpellPreviewMarkdown,
  formatSrdSpellLibraryDetail,
} from "@/lib/srd/srdSpellPreview";
import { SRD_ENTITIES } from "@/lib/srd/srdEntities.data";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import { ciClassLabel } from "@/lib/ciRegistry";
import type { SrdEntityId, SrdEntityKind, SrdEntitySummary } from "@/lib/srd/types";
import { normalizeSrdDocumentKey, lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { isBundledSrdSectionKey } from "@/lib/srd/srdRuleBundles";
import type { SrdItemRef } from "@/lib/srd/srdItemRef";

const ENTITY_KIND_LABEL: Record<SrdEntityKind, string> = {
  spell: "SRD spell",
  "magic-item": "SRD magic item",
  equipment: "SRD equipment",
  weapon: "SRD weapon",
  armor: "SRD armor",
  monster: "SRD monster",
  class: "SRD class",
  "class-feature": "SRD class feature",
  species: "SRD species",
  feat: "SRD feat",
  background: "SRD background",
  condition: "SRD condition",
  skill: "SRD skill",
  "glossary-term": "SRD glossary term",
  rule: "SRD rule",
};

const KIND_TO_API_RESOURCE: Partial<Record<SrdEntityKind, SrdApiResource>> = {
  spell: "spells",
  "magic-item": "magic-items",
  equipment: "equipment",
  weapon: "equipment",
  armor: "equipment",
  monster: "monsters",
  class: "classes",
  "class-feature": "classes",
  species: "races",
  feat: "feats",
  background: "backgrounds",
  condition: "conditions",
  skill: "rules",
  "glossary-term": "rule-sections",
  rule: "rule-sections",
};

const byId = new Map<SrdEntityId, SrdEntitySummary>(
  SRD_ENTITIES.map((entity) => [entity.id, entity]),
);

const byKind = new Map<SrdEntityKind, SrdEntitySummary[]>();
for (const entity of SRD_ENTITIES) {
  const list = byKind.get(entity.kind) ?? [];
  list.push(entity);
  byKind.set(entity.kind, list);
}

export function srdEntityKindLabel(kind: SrdEntityKind): string {
  return ENTITY_KIND_LABEL[kind];
}

export function ciClassForSrdEntity(kind: SrdEntityKind): CiClass {
  if (kind === "spell") return "spell.srd-entry";
  if (kind === "equipment" || kind === "weapon" || kind === "armor") return "item.srd-equipment";
  if (kind === "magic-item") return "item.srd-magic";
  if (kind === "monster") return "monster.srd-entry";
  return "rules.srd-entry";
}

export function getSrdEntity(id: SrdEntityId): SrdEntitySummary | undefined {
  return byId.get(id);
}

export function listSrdEntities(kind?: SrdEntityKind): readonly SrdEntitySummary[] {
  if (!kind) return SRD_ENTITIES;
  return byKind.get(kind) ?? [];
}

export function searchSrdEntities(
  query: string,
  opts?: { kinds?: readonly SrdEntityKind[]; limit?: number },
): SrdEntitySummary[] {
  const q = query.trim().toLowerCase();
  const limit = opts?.limit ?? 40;
  const kinds = opts?.kinds;
  const pool = kinds?.length
    ? kinds.flatMap((kind) => byKind.get(kind) ?? [])
    : SRD_ENTITIES;

  if (!q) return pool.slice(0, limit);

  const scored: { entity: SrdEntitySummary; score: number }[] = [];
  for (const entity of pool) {
    const name = entity.name.toLowerCase();
    const key = entity.key;
    const subtitle = entity.subtitle?.toLowerCase() ?? "";
    let score = 0;
    if (name === q || key === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (key.startsWith(q)) score = 70;
    else if (name.includes(q)) score = 50;
    else if (subtitle.includes(q)) score = 30;
    else continue;
    scored.push({ entity, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name),
  );
  return scored.slice(0, limit).map((row) => row.entity);
}

export function srdEntityToPreviewMarkdown(entity: SrdEntitySummary): string | null {
  if (entity.kind === "spell") {
    return buildSrdSpellPreviewMarkdown({ key: entity.key, name: entity.name });
  }
  const resource = KIND_TO_API_RESOURCE[entity.kind];
  if (!resource) return null;
  return lookupSrdDocumentMarkdown({
    resource,
    name: entity.name,
    index: entity.key,
  });
}

/** Map item-like entities to the existing SRD item ref shape. */
export function srdEntityToItemRef(entity: SrdEntitySummary): SrdItemRef | null {
  if (entity.kind === "equipment" || entity.kind === "weapon" || entity.kind === "armor") {
    return { resource: "equipment", index: entity.key, name: entity.name };
  }
  if (entity.kind === "magic-item") {
    return { resource: "magic-items", index: entity.key, name: entity.name };
  }
  return null;
}

const ITEM_ENTITY_KINDS: readonly SrdEntityKind[] = [
  "equipment",
  "weapon",
  "armor",
  "magic-item",
];

/** All bundled SRD equipment and magic item rows for the Items shelf. */
export function listSrdItemLibraryEntries(): LibraryListEntry[] {
  return ITEM_ENTITY_KINDS.flatMap((kind) =>
    (byKind.get(kind) ?? []).map(srdEntityToLibraryEntry),
  );
}

/** Bundled SRD monster stat blocks for the Monsters shelf. */
export function listSrdMonstersLibraryEntries(): LibraryListEntry[] {
  return (byKind.get("monster") ?? []).map(srdEntityToLibraryEntry);
}

/** Spells, classes, rules, and other non-item, non-monster SRD rows for the Rules shelf. */
export function listSrdRulesLibraryEntries(): LibraryListEntry[] {
  return SRD_ENTITIES.filter(
    (entity) =>
      !ITEM_ENTITY_KINDS.includes(entity.kind) &&
      entity.kind !== "monster" &&
      entity.kind !== "spell" &&
      !isBundledSrdSectionKey(entity.key),
  ).map(srdEntityToLibraryEntry);
}

/** Bundled SRD spells with full index detail for the Rules shelf. */
export function listSrdSpellsLibraryEntries(): LibraryListEntry[] {
  return (byKind.get("spell") ?? []).map(srdEntityToLibraryEntry);
}

/** Virtual read-only Library row — not stored in user backup. */
export function srdEntityToLibraryEntry(entity: SrdEntitySummary): LibraryListEntry {
  const ciClass = ciClassForSrdEntity(entity.kind);
  const itemRef = srdEntityToItemRef(entity);
  const spellIndex = entity.kind === "spell" ? findSpellIndexEntry(entity.key) : undefined;
  const detail =
    spellIndex != null
      ? formatSrdSpellLibraryDetail(spellIndex)
      : entity.subtitle ?? ciClassLabel(ciClass);
  return {
    id: `srd-entity:${entity.id}`,
    ciClass,
    category:
      entity.kind === "equipment" ||
      entity.kind === "weapon" ||
      entity.kind === "armor" ||
      entity.kind === "magic-item"
        ? "items"
        : entity.kind === "monster"
          ? "monsters"
          : "rules",
    provenance: "srd",
    kindLabel: srdEntityKindLabel(entity.kind),
    title: entity.name,
    detail,
    createdAt: "5.2.1-01-01T00:00:00.000Z",
    srdItemRef: itemRef ?? undefined,
    srdEntityId: entity.id,
  };
}

export function parseSrdEntityId(raw: string): SrdEntityId | null {
  const m =
    /^(spell|magic-item|equipment|weapon|armor|monster|class|class-feature|species|feat|background|condition|skill|glossary-term|rule):(.+)$/.exec(
      raw.trim(),
    );
  if (!m) return null;
  return `${m[1]}:${m[2]}` as SrdEntityId;
}

export function findSrdEntityByName(kind: SrdEntityKind, name: string): SrdEntitySummary | undefined {
  const key = normalizeSrdDocumentKey(name);
  return (byKind.get(kind) ?? []).find((e) => e.key === key || normalizeSrdDocumentKey(e.name) === key);
}

export { listSrdRuleBundleLibraryEntries, isBundledSrdSectionKey } from "@/lib/srd/srdRuleBundles";
export { SRD_ENTITIES, ENTITY_KIND_LABEL, KIND_TO_API_RESOURCE };
