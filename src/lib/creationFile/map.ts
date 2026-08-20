import type { CiClass } from "@/lib/ciRegistry";
import type { CFType, CreationFileCiClass, PlannedCfCiClass } from "@/lib/creationFile/types";

/**
 * Maps CMDB classes ↔ Universal CF Card `type`.
 * Classes with no card mapping (parties, campaigns, realm seeds, …) return null —
 * they stay first-class CFs in the registry; they just aren't one of the seven
 * workspace card types yet.
 */

const CF_TYPE_TO_CI_CLASSES: Record<CFType, readonly CreationFileCiClass[]> = {
  character: ["character.sheet"],
  monster: ["monster.srd-entry"],
  item: ["item.equipment", "item.magic", "item.srd-equipment", "item.srd-magic", "seed.props", "result.props"],
  spell: ["spell.srd-entry"],
  map: ["seed.maps", "result.maps"],
  encounter: ["encounter.record"],
  adventure: ["seed.adventure", "result.adventure"],
};

const CI_CLASS_TO_CF_TYPE = new Map<CreationFileCiClass, CFType>();
for (const [type, classes] of Object.entries(CF_TYPE_TO_CI_CLASSES) as [
  CFType,
  readonly CreationFileCiClass[],
][]) {
  for (const ciClass of classes) {
    CI_CLASS_TO_CF_TYPE.set(ciClass, type);
  }
}

export function ciClassesForCfType(type: CFType): readonly CreationFileCiClass[] {
  return CF_TYPE_TO_CI_CLASSES[type];
}

export function cfTypeForCiClass(ciClass: CreationFileCiClass | CiClass): CFType | null {
  return CI_CLASS_TO_CF_TYPE.get(ciClass as CreationFileCiClass) ?? null;
}

export function isPlannedCfCiClass(value: string): value is PlannedCfCiClass {
  return value === "encounter.record";
}

export function isCreationFileCiClass(value: string): value is CreationFileCiClass {
  return CI_CLASS_TO_CF_TYPE.has(value as CreationFileCiClass) || isPlannedCfCiClass(value);
}

/** Default CMDB class when minting a new card of this type (user-tier preferred). */
export function defaultCiClassForCfType(type: CFType): CreationFileCiClass {
  switch (type) {
    case "character":
      return "character.sheet";
    case "monster":
      return "monster.srd-entry";
    case "item":
      return "item.equipment";
    case "spell":
      return "spell.srd-entry";
    case "map":
      return "seed.maps";
    case "encounter":
      return "encounter.record";
    case "adventure":
      return "seed.adventure";
  }
}
