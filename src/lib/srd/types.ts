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
