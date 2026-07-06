import type { LibraryKind } from "@/lib/generationLibrary";
import type { SeedKind } from "@/lib/realmSeeds";

/**
 * Creation File (CF) registry — the CMDB of D&D Easy's data components.
 *
 * Every data component the app stores is a Creation File (CF) with exactly
 * one CLASS (the most specific type, `category.kind`) and one CATEGORY (the
 * management grouping). The registry is the single source of truth for the
 * taxonomy: what classes exist, which storage module owns them, and what
 * legal provenance they carry. New data types must register a class here
 * before they ship — ad-hoc string kinds are not allowed.
 *
 * This is a typed catalogue, not a data store: rows still live in their
 * storage modules (scale-portability rule). The registry describes them.
 */

/** Management grouping — how the Library organizes and backs up Creation Files (CFs). */
export type CiCategory =
  | "seeds"
  | "results"
  | "characters"
  | "items"
  | "parties"
  | "campaigns"
  | "sessions"
  | "rules";

/** Most specific type of a Creation File (CF): `category.kind`. */
export type CiClass =
  | "seed.realm"
  | "seed.adventure"
  | "seed.characters"
  | "seed.maps"
  | "seed.props"
  | "result.realm"
  | "result.adventure"
  | "result.characters"
  | "result.maps"
  | "result.props"
  | "character.sheet"
  | "item.equipment"
  | "item.magic"
  | "item.srd-equipment"
  | "item.srd-magic"
  | "party.roster"
  | "campaign.record"
  | "session.tabletop"
  | "session.snapshot"
  | "rules.srd-entry";

export type CiDefinition = {
  ciClass: CiClass;
  category: CiCategory;
  /** Human label for UI. */
  label: string;
  /** Module that owns rows of this class (see scale-portability rule). */
  storageModule: string;
  /** Legal tier (see workshop-library rule). */
  provenance: "srd" | "user";
  /** Included in the portable library backup / auto-save snapshot? */
  inBackup: boolean;
};

export const CI_CATEGORY_LABEL: Record<CiCategory, string> = {
  seeds: "Creation Files (CFs)",
  results: "Results",
  characters: "Heroes",
  items: "Items",
  parties: "Parties",
  campaigns: "Campaigns",
  sessions: "Sessions",
  rules: "Rules (SRD)",
};

export const CI_REGISTRY: Record<CiClass, CiDefinition> = {
  "seed.realm": {
    ciClass: "seed.realm",
    category: "seeds",
    label: "Realm Creation File (CF)",
    storageModule: "src/lib/realmSeeds.ts",
    provenance: "user",
    inBackup: true,
  },
  "seed.adventure": {
    ciClass: "seed.adventure",
    category: "seeds",
    label: "Adventure Creation File (CF)",
    storageModule: "src/lib/realmSeeds.ts",
    provenance: "user",
    inBackup: true,
  },
  "seed.characters": {
    ciClass: "seed.characters",
    category: "seeds",
    label: "Heroes Creation File (CF)",
    storageModule: "src/lib/realmSeeds.ts",
    provenance: "user",
    inBackup: true,
  },
  "seed.maps": {
    ciClass: "seed.maps",
    category: "seeds",
    label: "Maps Creation File (CF)",
    storageModule: "src/lib/realmSeeds.ts",
    provenance: "user",
    inBackup: true,
  },
  "seed.props": {
    ciClass: "seed.props",
    category: "seeds",
    label: "Item handout Creation File (CF)",
    storageModule: "src/lib/realmSeeds.ts",
    provenance: "user",
    inBackup: true,
  },
  "result.realm": {
    ciClass: "result.realm",
    category: "results",
    label: "Realm result",
    storageModule: "src/lib/generationLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "result.adventure": {
    ciClass: "result.adventure",
    category: "results",
    label: "Adventure result",
    storageModule: "src/lib/generationLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "result.characters": {
    ciClass: "result.characters",
    category: "results",
    label: "Heroes result",
    storageModule: "src/lib/generationLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "result.maps": {
    ciClass: "result.maps",
    category: "results",
    label: "Maps result",
    storageModule: "src/lib/generationLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "result.props": {
    ciClass: "result.props",
    category: "results",
    label: "Item handout result",
    storageModule: "src/lib/generationLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "character.sheet": {
    ciClass: "character.sheet",
    category: "characters",
    label: "Hero sheet",
    storageModule: "src/lib/tabletop/characterLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "item.equipment": {
    ciClass: "item.equipment",
    category: "items",
    label: "Equipment",
    storageModule: "src/lib/itemLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "item.magic": {
    ciClass: "item.magic",
    category: "items",
    label: "Magic item",
    storageModule: "src/lib/itemLibrary.ts",
    provenance: "user",
    inBackup: true,
  },
  "item.srd-equipment": {
    ciClass: "item.srd-equipment",
    category: "items",
    label: "SRD equipment",
    storageModule: "src/lib/srd/dnd5eApi.ts",
    provenance: "srd",
    inBackup: false,
  },
  "item.srd-magic": {
    ciClass: "item.srd-magic",
    category: "items",
    label: "SRD magic item",
    storageModule: "src/lib/srd/dnd5eApi.ts",
    provenance: "srd",
    inBackup: false,
  },
  "party.roster": {
    ciClass: "party.roster",
    category: "parties",
    label: "Party roster",
    storageModule: "src/lib/tabletop/characterRoster.ts",
    provenance: "user",
    inBackup: true,
  },
  "campaign.record": {
    ciClass: "campaign.record",
    category: "campaigns",
    label: "Campaign",
    storageModule: "src/lib/campaigns.ts",
    provenance: "user",
    inBackup: true,
  },
  "session.tabletop": {
    ciClass: "session.tabletop",
    category: "sessions",
    label: "Virtual Table session",
    storageModule: "src/lib/tabletop/store.ts",
    provenance: "user",
    inBackup: false,
  },
  "session.snapshot": {
    ciClass: "session.snapshot",
    category: "sessions",
    label: "Shelved campaign table",
    storageModule: "src/lib/tabletop/store.ts",
    provenance: "user",
    inBackup: false,
  },
  "rules.srd-entry": {
    ciClass: "rules.srd-entry",
    category: "rules",
    label: "SRD reference entry",
    storageModule: "src/lib/srd/",
    provenance: "srd",
    inBackup: false,
  },
};

export const CI_CLASSES = Object.keys(CI_REGISTRY) as CiClass[];

export function ciDefinition(ciClass: CiClass): CiDefinition {
  return CI_REGISTRY[ciClass];
}

/** All classes in a management category. */
export function ciClassesForCategory(category: CiCategory): CiClass[] {
  return CI_CLASSES.filter((c) => CI_REGISTRY[c].category === category);
}

/* ---- Class resolution for existing typed kinds ---- */

export function ciClassForSeed(kind: SeedKind): CiClass {
  return `seed.${kind}` as CiClass;
}

export function ciClassForResult(kind: LibraryKind): CiClass {
  return `result.${kind}` as CiClass;
}

export const CI_CLASS_FOR_CHARACTER: CiClass = "character.sheet";

/** Resolve an item library row to its Creation File (CF) class. */
export function ciClassForGameItem(kind: "equipment" | "magic"): CiClass {
  return kind === "magic" ? "item.magic" : "item.equipment";
}

export const CI_CLASS_FOR_PARTY: CiClass = "party.roster";

export const CI_CLASS_FOR_CAMPAIGN: CiClass = "campaign.record";

/** Short label for a Creation File (CF) class (CMDB badge in the Library). */
export function ciClassLabel(ciClass: CiClass): string {
  return CI_REGISTRY[ciClass].label;
}
