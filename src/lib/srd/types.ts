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

/** Entity kinds extracted from the bundled SRD document (SRD_CC_v5.2.x). */
export type SrdEntityKind =
  | "spell"
  | "magic-item"
  | "equipment"
  | "monster"
  | "class"
  | "species"
  | "feat"
  | "background"
  | "condition"
  | "rule";

/** Stable id for one read-only SRD Creation File (CF), e.g. `spell:fireball`. */
export type SrdEntityId = `${SrdEntityKind}:${string}`;

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
};
