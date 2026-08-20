import type { CiClass } from "@/lib/ciRegistry";

/**
 * Universal Creation File (CF) Card — workspace-facing card object.
 *
 * This is a **view / interchange model** layered on the CMDB (`CiClass` + storage
 * modules). Rows still live in their owning modules; cards never replace
 * `character.sheet`, `item.equipment`, etc. as persistence shapes.
 *
 * @see src/lib/ciRegistry.ts — authoritative taxonomy
 * @see schemas/creation-files/creation-file-card.json
 */

/** Workspace card kinds used across Fantasy Forge canvases. */
export type CFType =
  | "character"
  | "monster"
  | "item"
  | "spell"
  | "map"
  | "encounter"
  | "adventure";

export const CF_TYPES: readonly CFType[] = [
  "character",
  "monster",
  "item",
  "spell",
  "map",
  "encounter",
  "adventure",
] as const;

/**
 * Planned CMDB classes that map onto a CFType but are not yet in `CI_REGISTRY`
 * as shipped storage (see schemas/creation-files/planned/).
 */
export type PlannedCfCiClass = "encounter.record";

/** Any class a Universal CF Card may point at. */
export type CreationFileCiClass = CiClass | PlannedCfCiClass;

/**
 * Universal CF Card Object — one shape for Library tiles, Vault pieces,
 * Scrying headers, and future card UIs across workspaces.
 */
export interface CreationFile {
  id: string;
  type: CFType;
  /** Authoritative CMDB class — never assemble ad-hoc strings at call sites. */
  ciClass: CreationFileCiClass;
  title: string;
  /** e.g. "Level 5 Paladin", "CR 3 Fiend", "Wondrous Item" */
  subtitle?: string;
  tags: string[];
  /** Underlying sheet / stat block / markdown payload (class-specific). */
  data: Record<string, unknown>;
  /** Attached CF card ids (adventure contents, map pins, character gear CFs). */
  childIds?: string[];
  /** Parent container id (campaign, adventure, map, …). */
  parentId?: string;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds. */
  updatedAt: number;
}

export const CF_TYPE_LABEL: Record<CFType, string> = {
  character: "Character",
  monster: "Monster",
  item: "Item",
  spell: "Spell",
  map: "Map",
  encounter: "Encounter",
  adventure: "Adventure",
};
