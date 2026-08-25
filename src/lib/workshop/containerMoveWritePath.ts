/**
 * Single write path for moving CFs between ContainerCF parents.
 *
 * Rules:
 * - Campaign membership = link by id (no duplicate Library rows).
 * - Character inventory = deep embed (local mutability).
 * - Lore Vault parking = park membership (staging only).
 * - Static SRD drags are hydrated via `instantiateSrdEntity` before link/embed
 *   so containers never hold a global SRD entity id as a relationship child.
 */

import type { CiClass } from "@/lib/ciRegistry";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";
import { vaultPayloadIsStaticSrd } from "@/lib/vault/cfDragDrop";
import type { ContainerSlot } from "@/lib/workshop/containerCf";
import {
  linkToCampaign,
  loadCampaigns,
  getActiveCampaignId,
  updateCampaign,
} from "@/lib/campaigns";
import {
  loadSavedCharacters,
  updateCharacterInLibrary,
} from "@/lib/tabletop/characterLibrary";
import { loadSavedGameItems, saveGameItem } from "@/lib/itemLibrary";
import { loadRealmSeeds } from "@/lib/realmSeeds";
import { loadGenerationLibraryItems } from "@/lib/generationLibrary";
import { loadSavedCharacterRosters } from "@/lib/tabletop/characterRoster";
import { loadSavedNpcs } from "@/lib/worldAssets/npc";
import { loadSavedLocations } from "@/lib/worldAssets/location";
import { attachAdventureToCampaign } from "@/lib/campaignBuilder/attach";
import type { CampaignBuilderCatalog } from "@/lib/campaignBuilder/cascade";
import { resolveCampaignBuilderZoneForCiClass, CAMPAIGN_BUILDER_ZONES } from "@/lib/campaignBuilder/zones";
import {
  assignCampaignLootToCharacter,
  cloneLibraryItemToCampaignLoot,
  embedLibraryItemOnCharacter,
  linkModifierToCharacter,
} from "@/lib/workshop/cfCloneWritePath";
import { parkCfInVault } from "@/lib/vault/vaultParking";
import { removeFileFromVault } from "@/lib/vault/removeFileFromVault";
import { resolveSrdDragForVaultPark } from "@/lib/vault/vaultSrdPark";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { newId } from "@/lib/tabletop/session";
import type { CharacterItem, ModifierSourceKind } from "@/lib/tabletop/types";
import {
  instantiateSrdEntity,
  instantiateTargetForSlot,
  isStaticSrdDragId,
} from "@/lib/srd/instantiateSrdEntity";

export type ContainerMoveResult =
  | { ok: true; message: string; instanceId?: string }
  | { ok: false; error: string };

async function loadCampaignBuilderCatalog(): Promise<CampaignBuilderCatalog> {
  const [characters, items, seeds, results, parties, npcs, locations] = await Promise.all([
    loadSavedCharacters(),
    loadSavedGameItems(),
    loadRealmSeeds(),
    loadGenerationLibraryItems(),
    loadSavedCharacterRosters(),
    loadSavedNpcs(),
    loadSavedLocations(),
  ]);
  return { characters, items, seeds, results, parties, npcs, locations };
}

function isUserItemClass(ciClass: CiClass): boolean {
  return ciClass === "item.equipment" || ciClass === "item.magic";
}

function isSrdItemClass(ciClass: CiClass): boolean {
  return ciClass === "item.srd-equipment" || ciClass === "item.srd-magic";
}

function isItemClass(ciClass: CiClass): boolean {
  return isUserItemClass(ciClass) || isSrdItemClass(ciClass);
}

function isCharacterClass(ciClass: CiClass): boolean {
  return ciClass === "character.sheet";
}

function isSpellClass(ciClass: CiClass): boolean {
  return ciClass === "spell.srd-entry" || ciClass === "rules.srd-entry";
}

function isEffectClass(ciClass: CiClass): boolean {
  return (
    ciClass === "rules.custom-entry" ||
    ciClass === "rules.srd-entry" ||
    ciClass === "monster.srd-entry"
  );
}

function needsSrdHydration(payload: VaultDragPayload): boolean {
  return vaultPayloadIsStaticSrd(payload) || isStaticSrdDragId(payload.id);
}

/** Drop a CF into a campaign container slot (party / adventure / loot / members). */
export async function dropIntoCampaignContainer(options: {
  campaignId: string;
  payload: VaultDragPayload;
  slot: ContainerSlot;
}): Promise<ContainerMoveResult> {
  const { campaignId, payload, slot } = options;

  // Hydrate static SRD items into a local Library CF, then park in loot.
  if (slot === "loot" && (isSrdItemClass(payload.ciClass) || needsSrdHydration(payload))) {
    const inst = instantiateSrdEntity(payload.id, "campaign-item", { name: payload.title });
    if (!inst || inst.payload.target !== "campaign-item") {
      return { ok: false, error: "Could not instantiate that SRD item." };
    }
    const list = await saveGameItem(inst.payload.draft);
    const created =
      list.find((row) => row.description.includes(inst.sourceSrdEntityId)) ?? list[0];
    if (!created) return { ok: false, error: "Failed to save instantiated SRD item." };

    const result = await cloneLibraryItemToCampaignLoot(created.id, campaignId);
    if (!result.ok) return { ok: false, error: result.error };
    return {
      ok: true,
      message: `${payload.title} instantiated from SRD and parked in Unassigned Loot.`,
      instanceId: inst.instanceId,
    };
  }

  if (slot === "loot" && isUserItemClass(payload.ciClass)) {
    const result = await cloneLibraryItemToCampaignLoot(payload.id, campaignId);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, message: `${payload.title} parked in Unassigned Loot.` };
  }

  if (slot === "members" && isCharacterClass(payload.ciClass)) {
    await linkToCampaign(campaignId, { characterId: payload.id });
    scheduleLibrarySnapshot();
    return { ok: true, message: `${payload.title} linked to campaign party roster.` };
  }

  if (slot === "members" && payload.ciClass === "party.roster") {
    await linkToCampaign(campaignId, { partyId: payload.id });
    scheduleLibrarySnapshot();
    return { ok: true, message: `${payload.title} set as campaign party.` };
  }

  if (slot === "adventure") {
    // Always cascade childIds for any seed/result dropped into Quests & Cascading Adventures.
    const catalog = await loadCampaignBuilderCatalog();
    if (payload.ciClass.startsWith("seed.")) {
      const seed = catalog.seeds.find((s) => s.id === payload.id);
      if (seed) {
        const result = await attachAdventureToCampaign({
          campaignId,
          adventure: seed,
          kind: "seed",
          catalog,
        });
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true, message: result.message };
      }
      await linkToCampaign(campaignId, { seedId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as adventure CF.` };
    }
    if (payload.ciClass.startsWith("result.")) {
      const item = catalog.results.find((r) => r.id === payload.id);
      if (item) {
        const result = await attachAdventureToCampaign({
          campaignId,
          adventure: item,
          kind: "result",
          catalog,
        });
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true, message: result.message };
      }
      await linkToCampaign(campaignId, { resultId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as adventure result.` };
    }
  }

  if (slot === "locations") {
    if (payload.ciClass === "location.record") {
      await linkToCampaign(campaignId, { locationId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to Locations & Maps.` };
    }
    if (payload.ciClass === "seed.maps") {
      await linkToCampaign(campaignId, { seedId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as a map CF.` };
    }
    if (payload.ciClass === "result.maps") {
      await linkToCampaign(campaignId, { resultId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as a map result.` };
    }
  }

  if (slot === "encounters") {
    if (payload.ciClass === "npc.record") {
      await linkToCampaign(campaignId, { npcId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to Monsters & Encounters.` };
    }
    if (payload.ciClass === "monster.srd-entry" || payload.id.startsWith("monster:")) {
      await linkToCampaign(campaignId, { monsterId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as a monster encounter ref.` };
    }
    if (payload.ciClass.startsWith("seed.")) {
      await linkToCampaign(campaignId, { seedId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked as encounter notes.` };
    }
    if (payload.ciClass.startsWith("result.")) {
      await linkToCampaign(campaignId, { resultId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to Monsters & Encounters.` };
    }
  }

  if (slot === "scene") {
    if (needsSrdHydration(payload) && isEffectClass(payload.ciClass)) {
      const inst = instantiateSrdEntity(payload.id, "effect", { name: payload.title });
      if (!inst || inst.payload.target !== "effect") {
        return { ok: false, error: "Could not instantiate that SRD rule." };
      }
      // Park the instance id in vault-style detail on campaign via custom note link —
      // scene membership for rules uses npc/location; store as session-adjacent item link.
      await linkToCampaign(campaignId, {});
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${payload.title} instantiated (${inst.instanceId}) — drop onto a hero sheet to attach as an effect.`,
        instanceId: inst.instanceId,
      };
    }
    if (payload.ciClass === "npc.record") {
      await linkToCampaign(campaignId, { npcId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign scene.` };
    }
    if (payload.ciClass === "location.record") {
      await linkToCampaign(campaignId, { locationId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign scene.` };
    }
  }

  if (slot === "general" || slot === "party") {
    if (isUserItemClass(payload.ciClass)) {
      await linkToCampaign(campaignId, { itemId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign.` };
    }
    if (isSrdItemClass(payload.ciClass) || needsSrdHydration(payload)) {
      // Instantiating into general → same as loot park for linkability.
      return dropIntoCampaignContainer({
        campaignId,
        payload,
        slot: "loot",
      });
    }
    if (isCharacterClass(payload.ciClass)) {
      await linkToCampaign(campaignId, { characterId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign.` };
    }
    if (payload.ciClass.startsWith("seed.")) {
      await linkToCampaign(campaignId, { seedId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign.` };
    }
    if (payload.ciClass.startsWith("result.")) {
      await linkToCampaign(campaignId, { resultId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} linked to campaign.` };
    }
    if (payload.ciClass === "party.roster") {
      await linkToCampaign(campaignId, { partyId: payload.id });
      scheduleLibrarySnapshot();
      return { ok: true, message: `${payload.title} set as campaign party.` };
    }
  }

  return {
    ok: false,
    error: `Cannot drop ${payload.ciClass} into campaign slot “${slot}”.`,
  };
}

/**
 * Link a vault CF payload into a campaign — prefers the zone the DM hovered,
 * otherwise auto-routes by `ciClass` so Library → Campaign drops always write.
 * Adventure cards cascade nested `childIds` via `attachAdventureToCampaign`.
 */
export async function linkVaultPayloadToCampaign(options: {
  campaignId: string;
  payload: VaultDragPayload;
  /** Slot from the drop zone under the pointer; ignored when incompatible. */
  preferredSlot?: ContainerSlot | null;
}): Promise<ContainerMoveResult> {
  const { campaignId, payload, preferredSlot } = options;
  if (!payload.id || !payload.ciClass) {
    return { ok: false, error: "That Creation File card is missing an id or type." };
  }

  const resolved = resolveCampaignBuilderZoneForCiClass(payload.ciClass);
  const preferredZone = preferredSlot
    ? CAMPAIGN_BUILDER_ZONES.find((z) => z.slot === preferredSlot) ?? null
    : null;
  const preferredOk = Boolean(
    preferredZone?.accepts.includes(payload.ciClass as (typeof preferredZone.accepts)[number]),
  );

  const slot: ContainerSlot = preferredOk
    ? (preferredSlot as ContainerSlot)
    : (resolved?.slot ?? preferredSlot ?? "general");

  return dropIntoCampaignContainer({ campaignId, payload, slot });
}

/** Drop a CF into a character sheet container slot. */
export async function dropIntoCharacterContainer(options: {
  characterId: string;
  payload: VaultDragPayload;
  slot: ContainerSlot;
  fromCharacterId?: string | null;
  fromEmbeddedItemId?: string | null;
}): Promise<ContainerMoveResult> {
  const { characterId, payload, slot } = options;
  const characters = await loadSavedCharacters();
  const saved = characters.find((c) => c.id === characterId);
  if (!saved) return { ok: false, error: "Character not found." };

  // —— Inventory ——
  if (slot === "inventory" && isItemClass(payload.ciClass)) {
    if (options.fromCharacterId && options.fromEmbeddedItemId) {
      const from = characters.find((c) => c.id === options.fromCharacterId);
      if (!from) return { ok: false, error: "Source character not found." };
      const moving = from.player.items.find((i) => i.id === options.fromEmbeddedItemId);
      if (!moving) return { ok: false, error: "Source item not found on character." };

      const moved: CharacterItem = { ...moving, id: newId() };
      await updateCharacterInLibrary(from.id, {
        ...from.player,
        items: from.player.items.filter((i) => i.id !== moving.id),
      });
      await updateCharacterInLibrary(saved.id, {
        ...saved.player,
        items: [...saved.player.items, moved],
      });
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `Moved ${moving.name} from ${from.player.name} to ${saved.player.name}.`,
        instanceId: moved.instanceId ?? moved.id,
      };
    }

    // Hydrate static SRD → local embed (never link global entity id).
    if (isSrdItemClass(payload.ciClass) || needsSrdHydration(payload)) {
      const inst = instantiateSrdEntity(payload.id, "character-item", {
        name: payload.title,
        equipped: true,
      });
      if (!inst || inst.payload.target !== "character-item") {
        return { ok: false, error: "Could not instantiate that SRD item." };
      }
      const embedded = inst.payload.item;
      if (
        saved.player.items.some(
          (i) =>
            i.sourceSrdEntityId === inst.sourceSrdEntityId ||
            i.instanceId === inst.instanceId,
        )
      ) {
        return {
          ok: false,
          error: `${inst.name} is already on this sheet (SRD instance).`,
        };
      }
      await updateCharacterInLibrary(saved.id, {
        ...saved.player,
        items: [...saved.player.items, embedded],
      });
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD into inventory.`,
        instanceId: inst.instanceId,
      };
    }

    const items = await loadSavedGameItems();
    const libraryItem = items.find((row) => row.id === payload.id);
    if (!libraryItem) return { ok: false, error: "Item not found in Library." };

    if (saved.player.items.some((i) => i.libraryItemId === libraryItem.id)) {
      return {
        ok: false,
        error: `${libraryItem.name} is already on this sheet.`,
      };
    }

    const embedded = embedLibraryItemOnCharacter(libraryItem, { equipped: true });
    await updateCharacterInLibrary(saved.id, {
      ...saved.player,
      items: [...saved.player.items, embedded],
    });
    scheduleLibrarySnapshot();
    return { ok: true, message: `${libraryItem.name} added to inventory.` };
  }

  // —— Spells ——
  if (slot === "spells" && (isSpellClass(payload.ciClass) || needsSrdHydration(payload))) {
    if (needsSrdHydration(payload) || payload.ciClass === "spell.srd-entry") {
      const inst = instantiateSrdEntity(payload.id, "spell", { name: payload.title });
      if (!inst || inst.payload.target !== "spell") {
        return { ok: false, error: "Could not instantiate that SRD spell." };
      }
      const spellKey = inst.payload.spellKey;
      const known = new Set(saved.player.knownSpellIds ?? []);
      if (known.has(spellKey)) {
        return { ok: false, error: "Spell already known." };
      }
      known.add(spellKey);
      // Track instance in notes for relationship index (catalogue key stays for SRD picker).
      const noteLine = `\n[instance:${inst.instanceId} _source:SRD spell:${spellKey}]`;
      await updateCharacterInLibrary(saved.id, {
        ...saved.player,
        knownSpellIds: [...known],
        notes: `${saved.player.notes.trim()}${noteLine}`.trim(),
      });
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD into known spells.`,
        instanceId: inst.instanceId,
      };
    }
  }

  // —— Effects ——
  if (slot === "effects" && (isEffectClass(payload.ciClass) || needsSrdHydration(payload))) {
    if (needsSrdHydration(payload)) {
      const inst = instantiateSrdEntity(
        payload.id,
        instantiateTargetForSlot("effects"),
        { name: payload.title },
      );
      if (!inst || inst.payload.target !== "effect") {
        // Fallback: rules → effect modifier stub
        const fallback = instantiateSrdEntity(payload.id, "effect", { name: payload.title });
        if (!fallback || fallback.payload.target !== "effect") {
          return { ok: false, error: "Could not instantiate that SRD effect." };
        }
        const next = linkModifierToCharacter(saved.player, fallback.payload.modifier);
        await updateCharacterInLibrary(saved.id, next);
        scheduleLibrarySnapshot();
        return {
          ok: true,
          message: `${fallback.name} instantiated from SRD as an active effect.`,
          instanceId: fallback.instanceId,
        };
      }
      const next = linkModifierToCharacter(saved.player, inst.payload.modifier);
      await updateCharacterInLibrary(saved.id, next);
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD as an active effect.`,
        instanceId: inst.instanceId,
      };
    }

    const next = linkModifierToCharacter(saved.player, {
      sourceKind: "creation-file" as ModifierSourceKind,
      sourceLabel: payload.title,
      sourceCfId: payload.id,
      target: "wis",
      value: 0,
      active: true,
      notes: `Linked from ${payload.ciClass}`,
    });
    await updateCharacterInLibrary(saved.id, next);
    scheduleLibrarySnapshot();
    return { ok: true, message: `${payload.title} linked as an active effect.` };
  }

  return {
    ok: false,
    error: `Cannot drop ${payload.ciClass} into character slot “${slot}”.`,
  };
}

/** Park a CF in the Lore Vault parking lot (drag-in). */
export async function dropIntoVaultParking(
  payload: VaultDragPayload,
): Promise<ContainerMoveResult> {
  // Never park a raw global SRD entity id — hydrate (or reuse) a Library CF first.
  if (needsSrdHydration(payload)) {
    const lib = await resolveSrdDragForVaultPark({
      id: payload.id,
      title: payload.title,
      detail: payload.detail,
    });
    if (!lib) {
      return { ok: false, error: `Could not stage “${payload.title}” from the SRD.` };
    }
    await parkCfInVault({
      id: lib.id,
      ciClass: lib.ciClass,
      title: lib.title,
      detail: lib.detail,
    });
    return {
      ok: true,
      message: `${lib.title} staged in the Lore Vault (Library copy).`,
      instanceId: lib.instanceId,
    };
  }

  await parkCfInVault({
    id: payload.id,
    ciClass: payload.ciClass,
    title: payload.title,
    detail: payload.detail,
  });
  return { ok: true, message: `${payload.title} parked in the Lore Vault.` };
}

/** Assign campaign loot → character via the existing clone path. */
export async function dropLootOntoCharacter(options: {
  campaignId: string;
  libraryItemId: string;
  characterId: string;
}): Promise<ContainerMoveResult> {
  const result = await assignCampaignLootToCharacter({
    campaignId: options.campaignId,
    libraryItemId: options.libraryItemId,
    characterId: options.characterId,
    equipped: true,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: "Loot assigned to character sheet." };
}

/** Unlink / remove from vault parking (context menu — soft eviction). */
export async function unlinkFromVaultParking(id: string): Promise<ContainerMoveResult> {
  const result = await removeFileFromVault(id, false);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: result.message };
}

/** Hard purge from vault parking (context menu / trash zone). */
export async function purgeFromVaultParking(id: string): Promise<ContainerMoveResult> {
  const result = await removeFileFromVault(id, true);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: result.message };
}

export async function resolveActiveCampaignId(): Promise<string | null> {
  return getActiveCampaignId();
}

export async function campaignExists(id: string): Promise<boolean> {
  const list = await loadCampaigns();
  return list.some((c) => c.id === id);
}

/** @deprecated — kept for callers that imported updateCampaign via this module. */
export { updateCampaign };
