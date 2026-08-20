/**
 * Universal Creation File (CF) Card model — additive layer over the CMDB.
 *
 * Persistence remains in typed storage modules (`characterLibrary`, `itemLibrary`,
 * `realmSeeds`, …). Use these helpers to project rows into the shared card shape
 * for Vault / Library / Scrying UIs.
 */

export type {
  CFType,
  CreationFile,
  CreationFileCiClass,
  PlannedCfCiClass,
} from "@/lib/creationFile/types";
export { CF_TYPES, CF_TYPE_LABEL } from "@/lib/creationFile/types";

export {
  cfTypeForCiClass,
  ciClassesForCfType,
  defaultCiClassForCfType,
  isCreationFileCiClass,
  isPlannedCfCiClass,
} from "@/lib/creationFile/map";

export { createCreationFile, fixCreationFile, toEpochMs } from "@/lib/creationFile/normalize";

export type { CreationFileCardOptions } from "@/lib/creationFile/adapters";
export {
  characterToCreationFile,
  gameItemToCreationFile,
  libraryEntryToCreationFile,
  resultToCreationFile,
  seedToCreationFile,
} from "@/lib/creationFile/adapters";
