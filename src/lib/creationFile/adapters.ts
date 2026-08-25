import type { CiClass } from "@/lib/ciRegistry";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedGameItem } from "@/lib/itemLibrary";
import { seedDisplayName, type SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import type { CreationFile, CreationFileCiClass } from "@/lib/creationFile/types";
import { cfTypeForCiClass } from "@/lib/creationFile/map";
import { toEpochMs } from "@/lib/creationFile/normalize";

export type CreationFileCardOptions = {
  parentId?: string;
  childIds?: string[];
  /** Extra / full payload when the list entry alone is not enough. */
  data?: Record<string, unknown>;
  /** Override subtitle when detail is not the right line. */
  subtitle?: string;
};

/**
 * Project a Library browse row into a Universal CF Card when the row's
 * `ciClass` maps to a workspace CFType. Returns null for parties, campaigns,
 * realm seeds, sessions, etc. (still CFs — just not one of the seven card types).
 */
export function libraryEntryToCreationFile(
  entry: LibraryListEntry,
  options: CreationFileCardOptions = {},
): CreationFile | null {
  const type = cfTypeForCiClass(entry.ciClass);
  if (!type) return null;

  const createdAt = toEpochMs(entry.createdAt);
  const tags = [...(entry.tags ?? [])];
  if (entry.challengeRating) tags.push(`CR ${entry.challengeRating}`);
  if (entry.spellLevel != null) {
    tags.push(entry.spellLevel === 0 ? "Cantrip" : `Level ${entry.spellLevel}`);
  }

  return {
    id: entry.id,
    type,
    ciClass: entry.ciClass as CreationFileCiClass,
    title: entry.title,
    subtitle: options.subtitle ?? (entry.detail.trim() || entry.kindLabel),
    tags: Array.from(new Set(tags.filter(Boolean))),
    data: {
      provenance: entry.provenance,
      origin: entry.origin,
      category: entry.category,
      kindLabel: entry.kindLabel,
      ...(entry.srdEntityId ? { srdEntityId: entry.srdEntityId } : {}),
      ...(entry.srdItemRef ? { srdItemRef: entry.srdItemRef } : {}),
      ...(entry.spellLevel != null ? { spellLevel: entry.spellLevel } : {}),
      ...(entry.challengeRating ? { challengeRating: entry.challengeRating } : {}),
      ...options.data,
    },
    ...(options.childIds?.length ? { childIds: options.childIds } : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
    createdAt,
    updatedAt: createdAt,
  };
}

export function characterToCreationFile(
  character: SavedCharacter,
  options: CreationFileCardOptions = {},
): CreationFile {
  const p = character.player;
  const classLabel = p.className.trim() || "Adventurer";
  const species = p.species.trim();
  const defaultSubtitle = species
    ? `${classLabel} Level ${p.level} · ${species}`
    : `${classLabel} Level ${p.level}`;
  const subtitle = options.subtitle ?? defaultSubtitle;
  return {
    id: character.id,
    type: "character",
    ciClass: "character.sheet",
    title: p.name,
    ...(subtitle ? { subtitle } : {}),
    tags: [classLabel, species, `Level ${p.level}`].filter(Boolean),
    data: {
      source: character.source,
      player: p as unknown as Record<string, unknown>,
      ...options.data,
    },
    ...(options.childIds?.length ? { childIds: options.childIds } : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
    createdAt: toEpochMs(character.createdAt),
    updatedAt: toEpochMs(character.updatedAt, toEpochMs(character.createdAt)),
  };
}

export function gameItemToCreationFile(
  item: SavedGameItem,
  options: CreationFileCardOptions = {},
): CreationFile {
  const ciClass: CiClass = item.kind === "magic" ? "item.magic" : "item.equipment";
  const subtitleBits = [item.itemType.trim(), item.rarity].filter(Boolean);
  const subtitle = options.subtitle ?? subtitleBits.join(" · ");
  return {
    id: item.id,
    type: "item",
    ciClass,
    title: item.name,
    ...(subtitle ? { subtitle } : {}),
    tags: Array.from(new Set([...item.tags, ...item.settingTags].filter(Boolean))),
    data: {
      kind: item.kind,
      itemType: item.itemType,
      rarity: item.rarity,
      requiresAttunement: item.requiresAttunement,
      attunementNote: item.attunementNote,
      description: item.description,
      properties: item.properties,
      charges: item.charges,
      effects: item.effects,
      bonuses: item.bonuses,
      source: item.source,
      isHomebrew: item.isHomebrew,
      sourceNote: item.sourceNote,
      ...options.data,
    },
    ...(options.childIds?.length ? { childIds: options.childIds } : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
    createdAt: toEpochMs(item.createdAt),
    updatedAt: toEpochMs(item.updatedAt, toEpochMs(item.createdAt)),
  };
}

export function seedToCreationFile(
  seed: SavedRealmSeed,
  options: CreationFileCardOptions = {},
): CreationFile | null {
  const ciClass = `seed.${seed.kind}` as CiClass;
  const type = cfTypeForCiClass(ciClass);
  if (!type) return null;
  const subtitle = options.subtitle ?? (seed.briefDescription.trim() || undefined);
  return {
    id: seed.id,
    type,
    ciClass,
    title: seedDisplayName(seed),
    ...(subtitle ? { subtitle } : {}),
    tags: [...(seed.tags ?? [])],
    data: {
      kind: seed.kind,
      titleHint: seed.titleHint,
      briefDescription: seed.briefDescription,
      markdown: seed.markdown,
      realmSize: seed.realmSize,
      seedName: seed.seedName,
      ...(seed.childIds?.length ? { childIds: seed.childIds } : {}),
      ...options.data,
    },
    ...(options.childIds?.length
      ? { childIds: options.childIds }
      : seed.childIds?.length
        ? { childIds: seed.childIds }
        : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
    createdAt: toEpochMs(seed.createdAt),
    updatedAt: toEpochMs(seed.createdAt),
  };
}

export function resultToCreationFile(
  item: LibraryItem,
  options: CreationFileCardOptions = {},
): CreationFile | null {
  const ciClass = `result.${item.kind}` as CiClass;
  const type = cfTypeForCiClass(ciClass);
  if (!type) return null;
  return {
    id: item.id,
    type,
    ciClass,
    title: item.title,
    ...(options.subtitle ? { subtitle: options.subtitle } : {}),
    tags: [],
    data: {
      kind: item.kind,
      markdown: item.markdown,
      images: item.images,
      textModel: item.textModel,
      imageModel: item.imageModel,
      ...(item.childIds?.length ? { childIds: item.childIds } : {}),
      ...options.data,
    },
    ...(options.childIds?.length
      ? { childIds: options.childIds }
      : item.childIds?.length
        ? { childIds: item.childIds }
        : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
    createdAt: toEpochMs(item.createdAt),
    updatedAt: toEpochMs(item.createdAt),
  };
}
