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
  | "general";

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
};

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
    push(id, "npc.record", "scene", "link", id);
  }
  for (const id of input.locationIds) {
    push(id, "location.record", "scene", "link", id);
  }

  return {
    id: input.id,
    ciClass: "campaign.record",
    title: input.name,
    relationships: rels,
    updatedAt: input.updatedAt,
  };
}

/** Project a character sheet into a ContainerCF (inventory / spells / effects). */
export function characterToContainerCF(input: {
  id: string;
  name: string;
  updatedAt: string;
  items: { id: string; name: string; libraryItemId?: string | null; equipped?: boolean }[];
  knownSpellIds: string[];
  preparedSpellIds: string[];
  linkedModifiers: { id: string; sourceLabel: string; sourceCfId: string | null; active: boolean }[];
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
    });
  }
  for (const spellId of input.knownSpellIds) {
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
    });
  }

  return {
    id: input.id,
    ciClass: "character.sheet",
    title: input.name,
    relationships: rels,
    updatedAt: input.updatedAt,
  };
}
