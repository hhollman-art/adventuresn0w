/** Provenance tag for bundled rules data. Only `"srd"` may ship in app builds. */
export type SrdContentSource = "srd" | "original";

/** One SRD-open class (subclass populated in a later phase). */
export type SrdClassEntry = {
  id: string;
  name: string;
  source: SrdContentSource;
  /** The one SRD subclass for this class, when catalogued. */
  srdSubclass: string | null;
};

/** One SRD-open spell (catalogue populated in a later phase). */
export type SrdSpellEntry = {
  id: string;
  name: string;
  level: number;
  school: string;
  source: SrdContentSource;
  /** Lowercase SRD class keys this spell appears on (e.g. wizard, cleric). */
  classes: readonly string[];
};

/** One SRD-open ancestry / species. */
export type SrdAncestryEntry = {
  id: string;
  name: string;
  source: SrdContentSource;
};

export type SrdCatalogue = {
  version: string;
  classes: readonly SrdClassEntry[];
  spells: readonly SrdSpellEntry[];
  ancestries: readonly SrdAncestryEntry[];
};

/** SRD rules edition for bundled catalogue rows. */
export type SrdEdition = "5.2.1" | "2014";

/** Where structured fields were sourced at build time. */
export type SrdDataSource = "document" | "open5e" | "api";

/** DMMS canonical taxonomy keys assigned at build time. */
export type SrdTaxonomyCategory =
  | "races"
  | "classes"
  | "class_features"
  | "subclasses"
  | "spells"
  | "spell_index"
  | "equipment"
  | "weapons"
  | "armor"
  | "magic_items"
  | "monsters"
  | "conditions"
  | "skills"
  | "feats"
  | "backgrounds"
  | "rules";

/** Entity kinds extracted from the bundled SRD document (SRD_CC_v5.2.x). */
export type SrdEntityKind =
  | "spell"
  | "magic-item"
  | "equipment"
  | "weapon"
  | "armor"
  | "monster"
  | "class"
  | "class-feature"
  | "species"
  | "feat"
  | "background"
  | "condition"
  | "skill"
  | "glossary-term"
  | "rule";

/** Stable id for one read-only SRD Creation File (CF), e.g. `spell:fireball`. */
export type SrdEntityId = `${SrdEntityKind}:${string}`;

/** Consolidated high-level SRD rule groupings for Library browse. */
export type SrdRuleBundleId = "create_a_character" | "combat_rules" | "adventuring_rules";

/** Lightweight catalogue row — full text loaded on demand from the document body. */
export type SrdEntitySummary = {
  id: SrdEntityId;
  kind: SrdEntityKind;
  name: string;
  /** Normalized lookup key (matches document index). */
  key: string;
  chapter: string;
  /** First metadata line when present (level/school, rarity, CR, etc.). */
  subtitle: string | null;
  /** Byte range in `SRD_DOCUMENT_BODY`. */
  start: number;
  end: number;
  /** Assigned DMMS taxonomy category (`_category` in build output). */
  taxonomyCategory: SrdTaxonomyCategory;
  /** Original index path (`_source_file` in build output). */
  sourceFile: string;
  /** Rules document edition (5.2.1 bundled text vs 2014 API supplements). */
  edition: SrdEdition;
  /** Build-time data origin for structured fields. */
  dataSource: SrdDataSource;
};

/** Unclassified or ambiguous index row kept for manual review. */
export type SrdOrphanRecord = {
  key: string;
  title: string;
  chapter: string;
  level?: number;
  start?: number;
  end?: number;
  reason: string;
  fields?: string[];
  guess: string;
};

/** Master flat spell index row — structured fields + document offsets when available. */
export type SrdSpellIndexEntry = {
  id: string;
  key: string;
  entityId: SrdEntityId;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialDescription: string | null;
  };
  duration: string;
  classes: readonly string[];
  source: string;
  sourcePage: string | null;
  description: string;
  higherLevel: string | null;
  documentKey: string;
  sourceFile: string;
  taxonomyCategory: "spell_index";
  start: number | null;
  end: number | null;
  subtitle: string | null;
  edition: SrdEdition;
  dataSource: SrdDataSource;
};

/** Chapter ids of the bundled SRD_CC_v5.2.1 document. */
export type SrdDocumentChapterId =
  | "playing-the-game"
  | "character-creation"
  | "character-origins"
  | "classes"
  | "feats"
  | "equipment"
  | "spells"
  | "rules-glossary"
  | "gameplay-toolbox"
  | "magic-items"
  | "monsters"
  | "monsters-a-z"
  | "animals"
  | "unknown";

/** One heading in the bundled SRD document — byte range into `SRD_DOCUMENT_BODY`. */
export type SrdDocumentIndexEntry = {
  key: string;
  title: string;
  start: number;
  end: number;
  level: number;
  chapter: SrdDocumentChapterId;
};

/** One top-level chapter of the bundled SRD document. */
export type SrdDocumentChapter = { id: string; title: string };

/**
 * Shape of `public/srd/document.json` — mirrors the three exports of the
 * generated `srdDocument.data.ts` module (`SRD_DOCUMENT_PDF_ID`,
 * `SRD_DOCUMENT_CHAPTERS`, `SRD_DOCUMENT_BODY`).
 */
export type SrdDocumentAsset = {
  /** Source document id, e.g. `SRD_CC_v5.2.1`. */
  pdfId: string;
  chapters: readonly SrdDocumentChapter[];
  /** Full markdown body; entity and index rows hold byte ranges into it. */
  body: string;
};

/**
 * Shape of `public/srd/entities.json` — mirrors the three exports of the
 * generated `srdEntities.data.ts` module.
 */
export type SrdEntitiesAsset = {
  entityCounts: Record<string, number>;
  taxonomyCounts: Record<string, number>;
  entities: readonly SrdEntitySummary[];
};
