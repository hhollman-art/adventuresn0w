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
  canKnowSpellAtLevel,
  casterKindForClass,
  clampCharacterLevel,
  maxSpellLevelForCharacter,
  proficiencyBonusForLevel,
  spellSlotsForCharacter,
  summarizeLevelProgression,
  type CasterKind,
  type LevelProgressionSummary,
  type SpellSlotRow,
} from "./classProgression";

export {
  SRD_MANIFEST,
  SRD_ATTRIBUTION_SHORT,
  SRD_ATTRIBUTION_MARKDOWN,
  SRD_CONTENT_POLICY,
  type SrdManifest,
} from "./manifest";

export {
  ciClassForSrdEntity,
  findSrdEntityByName,
  getSrdEntity,
  listSrdEntities,
  parseSrdEntityId,
  searchSrdEntities,
  srdEntityKindLabel,
  srdEntityToItemRef,
  srdEntityToLibraryEntry,
  srdEntityToPreviewMarkdown,
  SRD_ENTITIES,
} from "./corpus";

export {
  instantiateSrdEntity,
  instantiateTargetForSlot,
  isInstantiatedCF,
  isStaticSRDReference,
  isStaticSrdDragId,
  isSrdInstantiatedItem,
  makeSrdInstanceId,
  toStaticSRDReference,
  type InstantiatedCF,
  type InstantiatedPayload,
  type StaticSRDReference,
  type SrdInstanceSource,
} from "./instantiateSrdEntity";
export { SRD_ENTITY_COUNTS, SRD_TAXONOMY_COUNTS } from "./srdEntities.data";
export { SRD_ORPHANS, SRD_ORPHAN_COUNT } from "./srdOrphans.data";
export { SRD_SPELL_INDEX } from "./spellIndex.data";
export { findSpellIndexEntry, searchSpellIndex } from "./spellIndex";
export type {
  SrdEntityId,
  SrdEntityKind,
  SrdEntitySummary,
  SrdOrphanRecord,
  SrdSpellIndexEntry,
  SrdTaxonomyCategory,
} from "./types";
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
export {
  openSrdItemPreview,
  openSrdPreview,
  openSrdSpellPreview,
  type SrdPreviewRef,
} from "./openSrdPreview";
export {
  buildSrdPreviewMarkdown,
  fetchSrdPreviewMarkdown,
} from "./srdPreviewMarkdown";
export {
  hasSrdDocumentEntry,
  lookupSrdDocumentMarkdown,
  normalizeSrdDocumentKey,
  type SrdDocumentChapterId,
} from "./srdDocumentLookup";
export { SRD_DOCUMENT_INDEX, type SrdDocumentIndexEntry } from "./srdDocumentIndex.data";
