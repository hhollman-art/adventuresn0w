/**
 * Single write path for cloning Creation Files between repositories:
 *   Library (vault) → Campaign (unassigned loot / links) → Character sheet (embed)
 *
 * Campaigns still link by id for shared CFs. Character sheets always embed a
 * deep copy of item JSON so sheet edits never mutate the Library original.
 */

import { newId } from "@/lib/tabletop/session";
import type {
  CharacterItem,
  CharacterModifier,
  PlayerCharacter,
} from "@/lib/tabletop/types";
import { emptyBonuses } from "@/lib/tabletop/character";
import {
  loadSavedGameItems,
  saveGameItem,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import {
  getActiveCampaignId,
  linkToCampaign,
  loadCampaigns,
  updateCampaign,
  type SavedCampaign,
} from "@/lib/campaigns";
import {
  loadSavedCharacters,
  updateCharacterInLibrary,
} from "@/lib/tabletop/characterLibrary";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

export type CfCloneContext =
  | { repository: "library" }
  | { repository: "campaign"; campaignId: string; asUnassignedLoot?: boolean }
  | { repository: "character"; characterId: string; equipped?: boolean };

export type CfCloneResult =
  | { ok: true; kind: "item"; libraryItemId: string; characterItemId?: string; campaignId?: string }
  | { ok: false; error: string };

function deepCopyItemBonuses(item: SavedGameItem): CharacterItem["bonuses"] {
  return { ...emptyBonuses(), ...item.bonuses };
}

/** Embed a Library item onto a character sheet (deep JSON copy). */
export function embedLibraryItemOnCharacter(
  libraryItem: SavedGameItem,
  options?: { equipped?: boolean },
): CharacterItem {
  return {
    id: newId(),
    name: libraryItem.name,
    notes: [
      libraryItem.itemType,
      libraryItem.rarity ? `Rarity: ${libraryItem.rarity}` : null,
      libraryItem.requiresAttunement ? "Requires attunement" : null,
      libraryItem.description,
    ]
      .filter(Boolean)
      .join("\n"),
    bonuses: deepCopyItemBonuses(libraryItem),
    equipped: options?.equipped ?? true,
    libraryItemId: libraryItem.id,
    sourceKind: "equipped-item",
  };
}

/**
 * Clone a Library item into a campaign's unassigned loot list (link by id).
 * Does not remove the Library original.
 */
export async function cloneLibraryItemToCampaignLoot(
  libraryItemId: string,
  campaignId?: string,
): Promise<CfCloneResult> {
  const items = await loadSavedGameItems();
  const item = items.find((row) => row.id === libraryItemId);
  if (!item) return { ok: false, error: "Item not found in Library." };

  const targetId = campaignId ?? (await getActiveCampaignId());
  if (!targetId) return { ok: false, error: "No active campaign — open Campaign first." };

  const campaigns = await loadCampaigns();
  const campaign = campaigns.find((c) => c.id === targetId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const unassigned = campaign.unassignedLootIds ?? [];
  if (!unassigned.includes(item.id)) {
    await updateCampaign(targetId, {
      unassignedLootIds: [...unassigned, item.id],
    });
  }
  // Also keep a soft link in itemIds for campaign inventory visibility.
  await linkToCampaign(targetId, { itemId: item.id });
  scheduleLibrarySnapshot();

  return { ok: true, kind: "item", libraryItemId: item.id, campaignId: targetId };
}

/**
 * Assign an unassigned loot item from a campaign onto a character sheet
 * (deep embed copy), then remove it from the unassigned list.
 */
export async function assignCampaignLootToCharacter(options: {
  campaignId: string;
  libraryItemId: string;
  characterId: string;
  equipped?: boolean;
}): Promise<CfCloneResult> {
  const [items, characters, campaigns] = await Promise.all([
    loadSavedGameItems(),
    loadSavedCharacters(),
    loadCampaigns(),
  ]);

  const item = items.find((row) => row.id === options.libraryItemId);
  if (!item) return { ok: false, error: "Loot item not found in Library." };

  const saved = characters.find((c) => c.id === options.characterId);
  if (!saved) return { ok: false, error: "Character not found." };

  const campaign = campaigns.find((c) => c.id === options.campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const embedded = embedLibraryItemOnCharacter(item, { equipped: options.equipped ?? true });
  const nextPlayer: PlayerCharacter = {
    ...saved.player,
    items: [...saved.player.items, embedded],
  };

  await updateCharacterInLibrary(saved.id, nextPlayer);

  const remaining = (campaign.unassignedLootIds ?? []).filter((id) => id !== item.id);
  await updateCampaign(options.campaignId, { unassignedLootIds: remaining });
  scheduleLibrarySnapshot();

  return {
    ok: true,
    kind: "item",
    libraryItemId: item.id,
    characterItemId: embedded.id,
    campaignId: options.campaignId,
  };
}

/** Duplicate a Library item as a new homebrew Library CF (explicit homebrew path). */
export async function cloneLibraryItemAsHomebrew(
  libraryItemId: string,
  nameSuffix = " (Homebrew)",
): Promise<CfCloneResult> {
  const items = await loadSavedGameItems();
  const item = items.find((row) => row.id === libraryItemId);
  if (!item) return { ok: false, error: "Item not found in Library." };

  const list = await saveGameItem({
    kind: item.kind,
    name: `${item.name}${nameSuffix}`,
    itemType: item.itemType,
    rarity: item.rarity,
    requiresAttunement: item.requiresAttunement,
    attunementNote: item.attunementNote,
    description: item.description,
    properties: item.properties,
    charges: item.charges,
    effects: item.effects,
    bonuses: { ...item.bonuses },
    source: "created",
    isHomebrew: true,
    tags: item.tags,
    settingTags: item.settingTags.includes("Homebrew")
      ? item.settingTags
      : ["Homebrew", ...item.settingTags],
    sourceNote: item.sourceNote,
    imageDataUrl: item.imageDataUrl,
  });
  const created = list[0];
  if (!created) return { ok: false, error: "Failed to save homebrew copy." };
  scheduleLibrarySnapshot();
  return { ok: true, kind: "item", libraryItemId: created.id };
}

export function listUnassignedLoot(
  campaign: SavedCampaign,
  allItems: SavedGameItem[],
): SavedGameItem[] {
  const ids = new Set(campaign.unassignedLootIds ?? []);
  return allItems.filter((item) => ids.has(item.id));
}

/** Attach a reactive CF modifier (curse / blessing) onto a character. */
export function linkModifierToCharacter(
  character: PlayerCharacter,
  modifier: Omit<CharacterModifier, "id"> & { id?: string },
): PlayerCharacter {
  const entry: CharacterModifier = {
    id: modifier.id ?? newId(),
    sourceKind: modifier.sourceKind,
    sourceLabel: modifier.sourceLabel,
    sourceCfId: modifier.sourceCfId ?? null,
    target: modifier.target,
    value: modifier.value,
    active: modifier.active,
    notes: modifier.notes,
  };
  // Carry SRD instantiation provenance so the local copy stays traceable.
  if (modifier.instanceId) entry.instanceId = modifier.instanceId;
  if (modifier._source) entry._source = modifier._source;
  if (modifier.sourceSrdEntityId !== undefined) {
    entry.sourceSrdEntityId = modifier.sourceSrdEntityId;
  }
  return {
    ...character,
    linkedModifiers: [...(character.linkedModifiers ?? []), entry],
  };
}
