export {
  SRD_ANCESTRY_ENTRIES,
  SRD_ANCESTRY_NAMES,
  SRD_RACES,
  type SrdAncestryName,
  type SrdRace,
} from "./ancestries";

export {
  findSrdClass,
  SRD_CLASS_ENTRIES,
  SRD_CLASS_NAMES,
  SRD_CLASSES,
  SRD_SUBCLASS_BY_CLASS,
  srdSubclassForClass,
  type SrdClass,
  type SrdClassName,
} from "./classes";

export {
  findSrdSpell,
  formatSpellLevel,
  formatSpellOption,
  SRD_SPELLS,
  srdClassSpellListKey,
  srdSpellsForClass,
} from "./spells";

export {
  SRD_MANIFEST,
  SRD_ATTRIBUTION_SHORT,
  SRD_ATTRIBUTION_MARKDOWN,
  SRD_CONTENT_POLICY,
  type SrdManifest,
} from "./manifest";

export type {
  SrdAncestryEntry,
  SrdCatalogue,
  SrdClassEntry,
  SrdContentSource,
  SrdSpellEntry,
} from "./types";

import { SRD_ANCESTRY_ENTRIES } from "./ancestries";
import { SRD_CLASS_ENTRIES } from "./classes";
import { SRD_MANIFEST } from "./manifest";
import { SRD_SPELLS } from "./spells";
import type { SrdCatalogue } from "./types";

/** Full bundled SRD snapshot referenced by the app. */
export const SRD_CATALOGUE: SrdCatalogue = {
  version: SRD_MANIFEST.version,
  classes: SRD_CLASS_ENTRIES,
  spells: SRD_SPELLS,
  ancestries: SRD_ANCESTRY_ENTRIES,
};

export { SRD_DOCUMENT_CHAPTERS, SRD_DOCUMENT_PDF_ID } from "./srdDocument.data";
export { buildSrdRulesMarkdown } from "./srdRulesMarkdown";
export {
  DND5E_API_ORIGIN,
  DND5E_API_VERSION,
  fetchDnd5eList,
  fetchDnd5eResource,
  SRD_API_CATEGORIES,
  type Dnd5eListItem,
  type SrdApiResource,
} from "./dnd5eApi";
export {
  dnd5eResourceToMarkdown,
  SRD_LIBRARY_INTRO_MARKDOWN,
} from "./dnd5eApiMarkdown";
