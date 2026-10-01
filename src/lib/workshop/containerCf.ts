/**
 * Container CF architecture — structured Creation Files that hold nested
 * relationships to other CFs (items, spells, curses, characters, …).
 *
 * Complements Tier-1 campaign id lists (`SavedCampaign`) and Tier-2 semantic
 * edges (`CampaignRelationshipGraph`). A ContainerCF is the runtime view of
 * any CF that can accept drops; relationships are the local membership map.
 *
 * Preserve-and-expand: existing campaign/character storage modules remain
 * authoritative — these types describe the container contract and drive the
 * single write path in `containerMoveWritePath.ts`.
 */

import type { CiClass } from "@/lib/ciRegistry";

/** How a child CF is held inside a parent container. */
export type ContainerRelationKind =
  /** Soft link by id (campaign membership, vault parking). */
  | "link"
  /** Deep-embedded JSON copy (character gear, local mutability). */
  | "embed"
  /** Staging / parking (Lore Vault lot, unassigned loot). */
  | "park"
  /** Reactive modifier attachment (curse / blessing on a sheet). */
  | "modifier";

/** Semantic role of the relationship inside the parent. */
export type ContainerSlot =
  | "inventory"
  | "spells"
  | "effects"
  | "party"
  | "adventure"
  | "scene"
  | "loot"
  | "members"
  | "vault"
  | "general"
  /** Campaign builder zones (Homebrew Campaign Builder). */
  | "locations"
  | "encounters";

/**
 * One nested CF relationship inside a ContainerCF.
 * `childId` is the Library / embed id; `parentAssignmentId` is the stable
 * membership row id used by the move write path (prevents phantom duplicates).
 */
export type CfRelationship = {
  id: string;
  /** Parent container CF id. */
  parentId: string;
  parentCiClass: CiClass;
  /** Child CF id (library id, or embedded character-item id). */
  childId: string;
  childCiClass: CiClass;
  kind: ContainerRelationKind;
  slot: ContainerSlot;
  /** Display label for chess-piece UI. */
  label: string;
  /** When true, child is active (equipped / prepared / parked). */
  active: boolean;
  createdAt: string;
  /** Optional provenance — library CF this embed was cloned from. */
  sourceLibraryId?: string | null;
  notes?: string;
  /**
   * SRD instantiation provenance (see `instantiateSrdEntity.ts`). Present when
   * `childId` is a local `instance_*` clone of a bundled SRD entity.
   */
  instanceId?: string;
  _source?: "SRD";
  sourceSrdEntityId?: string | null;
};

/** Minimal SRD provenance carried by rows that project into relationships. */
type ProvenanceInput = {
  instanceId?: string;
  _source?: string;
  sourceSrdEntityId?: string | null;
};

function provenanceFields(row: ProvenanceInput): Pick<
  CfRelationship,
  "instanceId" | "_source" | "sourceSrdEntityId"
> {
  if (row._source !== "SRD" || typeof row.instanceId !== "string") return {};
  return {
    instanceId: row.instanceId,
    _source: "SRD",
    sourceSrdEntityId: row.sourceSrdEntityId ?? null,
  };
}

/**
 * Structured container Creation File — not a static text blob.
 * Concrete storage rows (campaign, character, vault lot) project into this shape.
 */
export type ContainerCF = {
  id: string;
  ciClass: CiClass;
  title: string;
  /** Nested CF relationships owned by this container. */
  relationships: CfRelationship[];
  /** Optional freeform notes / markdown body. */
  body?: string;
  updatedAt: string;
};

/** Drag payload extension — tracks current parent so moves unlink cleanly. */
export type ContainerDragContext = {
  /** Container currently holding this CF (null = Library / unbound). */
  parentId: string | null;
  parentCiClass: CiClass | null;
  /** Relationship row id inside the parent, if any. */
  relationshipId: string | null;
  slot: ContainerSlot | null;
  /** embed | link | park — how the child is currently held. */
  holdKind: ContainerRelationKind | null;
};

export type ContainerDropIntent =
  | {
      action: "link";
      parentId: string;
      parentCiClass: CiClass;
      slot: ContainerSlot;
    }
  | {
      action: "embed";
      parentId: string;
      parentCiClass: CiClass;
      slot: ContainerSlot;
      equipped?: boolean;
    }
  | {
      action: "park";
      parentId: string;
      parentCiClass: CiClass;
      slot: "vault" | "loot";
    }
  | {
      action: "move";
      fromParentId: string;
      toParentId: string;
      toParentCiClass: CiClass;
      slot: ContainerSlot;
      holdKind: ContainerRelationKind;
    }
  | {
      action: "unlink";
      parentId: string;
      relationshipId: string;
    };

export const CONTAINER_CI_CLASSES: CiClass[] = [
  "campaign.record",
  "character.sheet",
  "party.roster",
  "seed.adventure",
  "result.adventure",
];

export function isContainerCiClass(ciClass: CiClass): boolean {
  return CONTAINER_CI_CLASSES.includes(ciClass);
}

export function emptyContainerCF(
  id: string,
  ciClass: CiClass,
  title: string,
): ContainerCF {
  return {
    id,
    ciClass,
    title,
    relationships: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Project campaign Tier-1 id lists into ContainerCF relationships. */
export function campaignToContainerCF(input: {
  id: string;
  name: string;
  updatedAt: string;
  partyId: string | null;
  seedIds: string[];
  resultIds: string[];
  characterIds: string[];
  itemIds: string[];
  unassignedLootIds: string[];
  npcIds: string[];
  locationIds: string[];
  monsterIds?: string[];
  /**
   * Persisted instantiation rows for this campaign (`containerRelationships.ts`).
   * Merged after the Tier-1 projection so instance provenance survives reloads.
   */
  persisted?: readonly CfRelationship[];
}): ContainerCF {
  const now = input.updatedAt;
  const rels: CfRelationship[] = [];
  const push = (
    childId: string,
    childCiClass: CiClass,
    slot: ContainerSlot,
    kind: ContainerRelationKind,
    label: string,
  ) => {
    rels.push({
      id: `${input.id}:${slot}:${childId}`,
      parentId: input.id,
      parentCiClass: "campaign.record",
      childId,
      childCiClass,
      kind,
      slot,
      label,
      active: true,
      createdAt: now,
      sourceLibraryId: kind === "link" || kind === "park" ? childId : null,
    });
  };

  if (input.partyId) {
    push(input.partyId, "party.roster", "party", "link", "Party");
  }
  for (const id of input.seedIds) {
    push(id, "seed.adventure", "adventure", "link", id);
  }
  for (const id of input.resultIds) {
    push(id, "result.adventure", "adventure", "link", id);
  }
  for (const id of input.characterIds) {
    push(id, "character.sheet", "members", "link", id);
  }
  for (const id of input.itemIds) {
    push(id, "item.equipment", "general", "link", id);
  }
  for (const id of input.unassignedLootIds) {
    push(id, "item.equipment", "loot", "park", id);
  }
  for (const id of input.npcIds) {
    push(id, "npc.record", "encounters", "link", id);
  }
  for (const id of input.locationIds) {
    push(id, "location.record", "locations", "link", id);
  }
  for (const id of input.monsterIds ?? []) {
    push(id, "monster.srd-entry", "encounters", "link", id);
  }

  return {
    id: input.id,
    ciClass: "campaign.record",
    title: input.name,
    relationships: mergeContainerRelationships(rels, input.persisted ?? []),
    updatedAt: input.updatedAt,
  };
}

/** Project a character sheet into a ContainerCF (inventory / spells / effects). */
export function characterToContainerCF(input: {
  id: string;
  name: string;
  updatedAt: string;
  items: ({
    id: string;
    name: string;
    libraryItemId?: string | null;
    equipped?: boolean;
  } & ProvenanceInput)[];
  knownSpellIds: string[];
  preparedSpellIds: string[];
  linkedModifiers: ({
    id: string;
    sourceLabel: string;
    sourceCfId: string | null;
    active: boolean;
  } & ProvenanceInput)[];
  /** Persisted instantiation rows (spell instances only live here). */
  persisted?: readonly CfRelationship[];
}): ContainerCF {
  const rels: CfRelationship[] = [];

  for (const item of input.items) {
    rels.push({
      id: `${input.id}:inventory:${item.id}`,
      parentId: input.id,
      parentCiClass: "character.sheet",
      childId: item.id,
      childCiClass: "item.equipment",
      kind: "embed",
      slot: "inventory",
      label: item.name,
      active: item.equipped !== false,
      createdAt: input.updatedAt,
      sourceLibraryId: item.libraryItemId ?? null,
      ...provenanceFields(item),
    });
  }
  // Spell keys already covered by a persisted SRD instance row — the instance
  // row (childId = instanceId) replaces the bare catalogue-key link.
  const instancedSpellKeys = new Set(
    (input.persisted ?? [])
      .filter((r) => r.slot === "spells" && r._source === "SRD" && r.sourceSrdEntityId)
      .map((r) => spellKeyFromSrdEntityId(r.sourceSrdEntityId)),
  );

  for (const spellId of input.knownSpellIds) {
    if (instancedSpellKeys.has(spellId)) continue;
    rels.push({
      id: `${input.id}:spells:${spellId}`,
      parentId: input.id,
      parentCiClass: "character.sheet",
      childId: spellId,
      childCiClass: "spell.srd-entry",
      kind: "link",
      slot: "spells",
      label: spellId,
      active: input.preparedSpellIds.includes(spellId),
      createdAt: input.updatedAt,
    });
  }
  for (const mod of input.linkedModifiers) {
    rels.push({
      id: `${input.id}:effects:${mod.id}`,
      parentId: input.id,
      parentCiClass: "character.sheet",
      childId: mod.sourceCfId ?? mod.id,
      childCiClass: "rules.custom-entry",
      kind: "modifier",
      slot: "effects",
      label: mod.sourceLabel,
      active: mod.active,
      createdAt: input.updatedAt,
      sourceLibraryId: mod.sourceCfId,
      ...provenanceFields(mod),
    });
  }

  return {
    id: input.id,
    ciClass: "character.sheet",
    title: input.name,
    relationships: mergeContainerRelationships(rels, input.persisted ?? []),
    updatedAt: input.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Spell containment — single source of truth is the projection.        */
/* ------------------------------------------------------------------ */

/** `spell:fireball` → `fireball` (catalogue key stored on the sheet). */
export function spellKeyFromSrdEntityId(entityId: string | null | undefined): string {
  if (!entityId) return "";
  return String(entityId).split(":").slice(1).join(":");
}

/** Catalogue key a spell relationship row refers to (instance or bare link). */
export function spellKeyForRelationship(rel: CfRelationship): string {
  if (rel._source === "SRD" && rel.sourceSrdEntityId) {
    return spellKeyFromSrdEntityId(rel.sourceSrdEntityId);
  }
  return rel.childId;
}

/** Spell relationship rows on a container, optionally filtered to one key. */
export function spellRelationships(container: ContainerCF, spellKey?: string): CfRelationship[] {
  return container.relationships.filter(
    (r) => r.slot === "spells" && (spellKey === undefined || spellKeyForRelationship(r) === spellKey),
  );
}

/** True when the container already holds this spell (instance or catalogue link). */
export function containerHoldsSpell(container: ContainerCF, spellKey: string): boolean {
  return spellRelationships(container, spellKey).length > 0;
}

const LEGACY_SPELL_INSTANCE_LINE =
  /^\[instance:(instance_[^\s\]]+) _source:SRD spell:([^\s\]]+)\]$/;

/**
 * Older builds appended `[instance:… _source:SRD spell:…]` lines to the hero's
 * readable notes. Strip exactly those lines and return what they recorded so
 * the caller can index them as relationship rows. Other notes text is untouched.
 */
export function extractLegacySpellInstanceLines(notes: string): {
  notes: string;
  entries: { instanceId: string; spellKey: string }[];
} {
  const entries: { instanceId: string; spellKey: string }[] = [];
  const kept: string[] = [];
  for (const line of notes.split("\n")) {
    const m = line.trim().match(LEGACY_SPELL_INSTANCE_LINE);
    if (m?.[1] && m[2]) entries.push({ instanceId: m[1], spellKey: m[2] });
    else kept.push(line);
  }
  if (entries.length === 0) return { notes, entries };
  return { notes: kept.join("\n").trim(), entries };
}

/* ------------------------------------------------------------------ */
/* Relationship reducers — pure state updates used by drop handlers.    */
/* ------------------------------------------------------------------ */

/** Membership key: one row per (parent, slot, child). */
export function relationshipKey(rel: Pick<CfRelationship, "parentId" | "slot" | "childId">): string {
  return `${rel.parentId}:${rel.slot}:${rel.childId}`;
}

/**
 * Merge persisted rows into a derived projection without phantom duplicates.
 * A persisted row wins over a derived row with the same membership key so
 * instance provenance (`instanceId`, `sourceSrdEntityId`) is never lost.
 */
export function mergeContainerRelationships(
  derived: readonly CfRelationship[],
  persisted: readonly CfRelationship[],
): CfRelationship[] {
  if (persisted.length === 0) return [...derived];
  const byKey = new Map<string, CfRelationship>();
  for (const rel of derived) byKey.set(relationshipKey(rel), rel);
  for (const rel of persisted) {
    const key = relationshipKey(rel);
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, ...rel } : rel);
  }
  return [...byKey.values()];
}

/** Add or replace one relationship on a container (immutable). */
export function upsertContainerRelationship(
  container: ContainerCF,
  rel: CfRelationship,
): ContainerCF {
  const key = relationshipKey(rel);
  const rest = container.relationships.filter((r) => relationshipKey(r) !== key);
  return {
    ...container,
    relationships: [...rest, rel],
    updatedAt: rel.createdAt > container.updatedAt ? rel.createdAt : container.updatedAt,
  };
}

/** Remove every relationship pointing at `childId` (immutable). */
export function removeContainerRelationshipsForChild(
  container: ContainerCF,
  childId: string,
): ContainerCF {
  return {
    ...container,
    relationships: container.relationships.filter((r) => r.childId !== childId),
  };
}
