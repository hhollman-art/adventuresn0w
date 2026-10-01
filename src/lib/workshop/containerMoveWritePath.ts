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
  unlinkFromCampaign,
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
import { removeFileFromVault } from "@/lib/vault/removeFileFromVault";
import {
  findParkedLoreVaultInstance,
  parkInLoreVault,
  reassignLoreVaultInstance,
  removeLoreVaultRow,
  staticPayloadForParkedInstance,
} from "@/lib/vault/loreVaultContainer";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { newId } from "@/lib/tabletop/session";
import type { CharacterItem, ModifierSourceKind } from "@/lib/tabletop/types";
import {
  instantiateSrdEntity,
  instantiateTargetForSlot,
  isStaticSrdDragId,
  relationshipForInstance,
  type InstantiatedCF,
} from "@/lib/srd/instantiateSrdEntity";
import {
  loadContainerRelationshipsFor,
  recordContainerRelationship,
  removeContainerRelationship,
  removeContainerRelationshipsForChild,
} from "@/lib/workshop/containerRelationships";
import {
  characterToContainerCF,
  containerHoldsSpell,
  extractLegacySpellInstanceLines,
  type CfRelationship,
} from "@/lib/workshop/containerCf";

export type ContainerMoveResult =
  | {
      ok: true;
      message: string;
      instanceId?: string;
      /** Relationship row written to the target container's index on drop. */
      relationship?: CfRelationship;
    }
  | { ok: false; error: string };

/**
 * Index an instantiated CF on its target container. Fire-and-forget safe:
 * membership (Tier-1 ids / embedded rows) is already persisted by the caller,
 * so a failed index write never loses the drop itself.
 */
async function indexInstance(
  inst: InstantiatedCF,
  parent: { id: string; ciClass: CiClass },
  slot: ContainerSlot,
  opts?: { libraryId?: string | null; active?: boolean },
): Promise<CfRelationship> {
  const rel = relationshipForInstance(inst, parent, slot, opts);
  try {
    await recordContainerRelationship(rel);
  } catch {
    /* index is a convenience view — membership already saved */
  }
  return rel;
}

/** Backfill index rows for spell instances older builds recorded in notes. */
async function indexLegacySpellLines(
  characterId: string,
  entries: { instanceId: string; spellKey: string }[],
  preparedSpellIds: readonly string[],
): Promise<void> {
  const createdAt = new Date().toISOString();
  const rows: CfRelationship[] = entries.map(({ instanceId, spellKey }) => ({
    id: `${characterId}:spells:${instanceId}`,
    parentId: characterId,
    parentCiClass: "character.sheet",
    childId: instanceId,
    childCiClass: "spell.srd-entry",
    kind: "link",
    slot: "spells",
    label: spellKey,
    active: preparedSpellIds.includes(spellKey),
    createdAt,
    sourceLibraryId: null,
    instanceId,
    _source: "SRD",
    sourceSrdEntityId: `spell:${spellKey}`,
  }));
  try {
    await recordContainerRelationship(rows);
  } catch {
    /* index is a convenience view — the sheet save already succeeded */
  }
}

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

const CAMPAIGN_PARENT = (campaignId: string) =>
  ({ id: campaignId, ciClass: "campaign.record" }) as const;

/**
 * Hydrate a static SRD spell / rule / monster into a campaign-owned instance.
 * The relationship row *is* the membership here (SavedCampaign has no field for
 * these), so unlike `indexInstance` a failed write is reported, not swallowed.
 */
async function instantiateSrdReferenceOnCampaign(
  campaignId: string,
  payload: VaultDragPayload,
  slot: ContainerSlot,
): Promise<ContainerMoveResult> {
  const target = payload.ciClass === "spell.srd-entry" ? "spell" : "rules";
  const inst = instantiateSrdEntity(payload.id, target, { name: payload.title });
  if (!inst) return { ok: false, error: `Could not instantiate “${payload.title}” from the SRD.` };
  const relationship = relationshipForInstance(inst, CAMPAIGN_PARENT(campaignId), slot);
  try {
    await recordContainerRelationship(relationship);
  } catch {
    return { ok: false, error: `Could not save “${inst.name}” to this campaign — storage is full or blocked.` };
  }
  scheduleLibrarySnapshot();
  return {
    ok: true,
    message: `${inst.name} added to the campaign as its own copy of the SRD entry.`,
    instanceId: inst.instanceId,
    relationship,
  };
}

/**
 * Remove an SRD instance card from a campaign. Drops the relationship row and,
 * for monsters, the legacy `monsterIds` ref once no instance of it remains.
 */
export async function unlinkSrdInstanceFromCampaign(
  campaignId: string,
  relationship: Pick<CfRelationship, "id" | "sourceSrdEntityId" | "label">,
): Promise<ContainerMoveResult> {
  try {
    const remaining = await removeContainerRelationship(relationship.id);
    const sourceId = relationship.sourceSrdEntityId;
    if (sourceId?.startsWith("monster:")) {
      const stillHeld = remaining.some(
        (r) => r.parentId === campaignId && r.sourceSrdEntityId === sourceId,
      );
      if (!stillHeld) await unlinkFromCampaign(campaignId, { monsterId: sourceId });
    }
  } catch {
    return { ok: false, error: `Could not remove “${relationship.label}” — storage is blocked.` };
  }
  scheduleLibrarySnapshot();
  return { ok: true, message: `${relationship.label} removed from this campaign.` };
}

/**
 * Drop a CF into a campaign container slot (party / adventure / loot / members).
 * A parked Lore Vault SRD instance is re-parented onto the campaign (same
 * instance id); SRD items still go through the Library-backed loot path.
 */
export async function dropIntoCampaignContainer(options: {
  campaignId: string;
  payload: VaultDragPayload;
  slot: ContainerSlot;
}): Promise<ContainerMoveResult> {
  const parked = await findParkedLoreVaultInstance(options.payload);
  if (!parked) return placeOnCampaign(options);

  const { campaignId, payload, slot } = options;
  if (slot === "loot" || isSrdItemClass(payload.ciClass)) {
    const result = await placeOnCampaign({
      campaignId,
      slot,
      payload: staticPayloadForParkedInstance(payload, parked.sourceSrdEntityId),
    });
    if (result.ok) await removeLoreVaultRow(parked.id);
    return result;
  }

  let relationship: CfRelationship;
  try {
    relationship = await reassignLoreVaultInstance({
      row: parked,
      parent: CAMPAIGN_PARENT(campaignId),
      slot,
    });
  } catch {
    return { ok: false, error: `Could not move “${parked.label}” — storage is full or blocked.` };
  }
  if (parked.sourceSrdEntityId.startsWith("monster:")) {
    await linkToCampaign(campaignId, { monsterId: parked.sourceSrdEntityId });
  }
  scheduleLibrarySnapshot();
  return {
    ok: true,
    message: `${parked.label} moved from the Lore Vault to this campaign.`,
    instanceId: parked.instanceId,
    relationship,
  };
}

async function placeOnCampaign(options: {
  campaignId: string;
  payload: VaultDragPayload;
  slot: ContainerSlot;
}): Promise<ContainerMoveResult> {
  const { campaignId, payload, slot } = options;

  // Hydrate static SRD items into a local Library CF, then park in loot.
  if (slot === "loot" && isSrdItemClass(payload.ciClass)) {
    const inst = instantiateSrdEntity(payload.id, "campaign-item", { name: payload.title });
    if (!inst || inst.payload.target !== "campaign-item") {
      return { ok: false, error: "Could not instantiate that SRD item." };
    }
    const list = await saveGameItem(inst.payload.draft);
    const created =
      list.find((row) => row.instanceId === inst.instanceId) ??
      list.find((row) => row.description.includes(inst.sourceSrdEntityId)) ??
      list[0];
    if (!created) return { ok: false, error: "Failed to save instantiated SRD item." };

    const result = await cloneLibraryItemToCampaignLoot(created.id, campaignId);
    if (!result.ok) return { ok: false, error: result.error };
    const relationship = await indexInstance(
      inst,
      { id: campaignId, ciClass: "campaign.record" },
      "loot",
      { libraryId: created.id },
    );
    return {
      ok: true,
      message: `${payload.title} instantiated from SRD and parked in Unassigned Loot.`,
      instanceId: inst.instanceId,
      relationship,
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
      if (needsSrdHydration(payload)) {
        // Each drop is its own instance (three goblins = three cards); `monsterIds`
        // keeps the deduped catalogue ref older readers and the encounter cascade use.
        const result = await instantiateSrdReferenceOnCampaign(campaignId, payload, "encounters");
        if (!result.ok) return result;
        const monsterId = result.relationship?.sourceSrdEntityId ?? payload.id;
        await linkToCampaign(campaignId, { monsterId });
        return { ...result, message: `${payload.title} added to Monsters & Encounters.` };
      }
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
        // Entity missing from the loaded corpus — keep a provenance-tagged reference instead.
        return instantiateSrdReferenceOnCampaign(campaignId, payload, slot);
      }
      // SavedCampaign has no field for rule effects — the relationship index is
      // the container state here, so the instance id is recorded on the campaign.
      const relationship = await indexInstance(
        inst,
        { id: campaignId, ciClass: "campaign.record" },
        "scene",
      );
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${payload.title} instantiated (${inst.instanceId}) — drop onto a hero sheet to attach as an effect.`,
        instanceId: inst.instanceId,
        relationship,
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
    if (isSrdItemClass(payload.ciClass)) {
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

  // Any other static SRD reference (spells, rules, monsters outside Encounters)
  // becomes a campaign-owned instance in the bucket the DM chose.
  if (needsSrdHydration(payload) && !isSrdItemClass(payload.ciClass)) {
    return instantiateSrdReferenceOnCampaign(campaignId, payload, slot);
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

type CharacterDropOptions = {
  characterId: string;
  payload: VaultDragPayload;
  slot: ContainerSlot;
  fromCharacterId?: string | null;
  fromEmbeddedItemId?: string | null;
};

/**
 * Drop a CF into a character sheet container slot. A parked Lore Vault SRD
 * instance is embedded under its existing instance id, then leaves the vault.
 */
export async function dropIntoCharacterContainer(
  options: CharacterDropOptions,
): Promise<ContainerMoveResult> {
  const parked = await findParkedLoreVaultInstance(options.payload);
  if (!parked) return placeOnCharacter(options);
  const result = await placeOnCharacter(
    {
      ...options,
      payload: staticPayloadForParkedInstance(options.payload, parked.sourceSrdEntityId),
    },
    parked.instanceId,
  );
  if (result.ok) await removeLoreVaultRow(parked.id);
  return result;
}

async function placeOnCharacter(
  options: CharacterDropOptions,
  reuseInstanceId?: string,
): Promise<ContainerMoveResult> {
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
      // Move the index row with the embed so neither sheet holds a phantom.
      let relationship: CfRelationship | undefined;
      if (moving._source === "SRD" && moving.instanceId) {
        try {
          await removeContainerRelationshipsForChild(from.id, moving.instanceId);
          relationship = {
            id: `${saved.id}:inventory:${moved.id}`,
            parentId: saved.id,
            parentCiClass: "character.sheet",
            childId: moved.id,
            childCiClass: payload.ciClass,
            kind: "embed",
            slot: "inventory",
            label: moved.name,
            active: moved.equipped !== false,
            createdAt: new Date().toISOString(),
            sourceLibraryId: moved.libraryItemId ?? null,
            instanceId: moving.instanceId,
            _source: "SRD",
            sourceSrdEntityId: moving.sourceSrdEntityId ?? null,
          };
          await recordContainerRelationship(relationship);
        } catch {
          /* index is a convenience view — the embed move already saved */
        }
      }
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `Moved ${moving.name} from ${from.player.name} to ${saved.player.name}.`,
        instanceId: moved.instanceId ?? moved.id,
        relationship,
      };
    }

    // Hydrate static SRD → local embed (never link global entity id).
    if (isSrdItemClass(payload.ciClass) || needsSrdHydration(payload)) {
      const inst = instantiateSrdEntity(payload.id, "character-item", {
        name: payload.title,
        equipped: true,
        instanceId: reuseInstanceId,
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
      const relationship = await indexInstance(
        inst,
        { id: saved.id, ciClass: "character.sheet" },
        "inventory",
        { active: embedded.equipped !== false },
      );
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD into inventory.`,
        instanceId: inst.instanceId,
        relationship,
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
      const inst = instantiateSrdEntity(payload.id, "spell", {
        name: payload.title,
        instanceId: reuseInstanceId,
      });
      if (!inst || inst.payload.target !== "spell") {
        return { ok: false, error: "Could not instantiate that SRD spell." };
      }
      const spellKey = inst.payload.spellKey;
      const container = characterToContainerCF({
        id: saved.id,
        name: saved.player.name,
        updatedAt: saved.updatedAt,
        items: saved.player.items,
        knownSpellIds: saved.player.knownSpellIds ?? [],
        preparedSpellIds: saved.player.preparedSpellIds ?? [],
        linkedModifiers: saved.player.linkedModifiers ?? [],
        persisted: await loadContainerRelationshipsFor(saved.id),
      });
      if (containerHoldsSpell(container, spellKey)) {
        return { ok: false, error: "Spell already known." };
      }
      // Catalogue key stays on the sheet (SRD picker, level rules); the instance
      // id lives only in the relationship index. Notes are never written here —
      // lines left by older builds are moved into the index on this save.
      const legacy = extractLegacySpellInstanceLines(saved.player.notes);
      await updateCharacterInLibrary(saved.id, {
        ...saved.player,
        knownSpellIds: [...(saved.player.knownSpellIds ?? []), spellKey],
        notes: legacy.notes,
      });
      if (legacy.entries.length > 0) {
        await indexLegacySpellLines(saved.id, legacy.entries, saved.player.preparedSpellIds ?? []);
      }
      const relationship = await indexInstance(
        inst,
        { id: saved.id, ciClass: "character.sheet" },
        "spells",
        { active: (saved.player.preparedSpellIds ?? []).includes(spellKey) },
      );
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD into known spells.`,
        instanceId: inst.instanceId,
        relationship,
      };
    }
  }

  // —— Effects ——
  if (slot === "effects" && (isEffectClass(payload.ciClass) || needsSrdHydration(payload))) {
    if (needsSrdHydration(payload)) {
      const inst = instantiateSrdEntity(
        payload.id,
        instantiateTargetForSlot("effects"),
        { name: payload.title, instanceId: reuseInstanceId },
      );
      if (!inst || inst.payload.target !== "effect") {
        // Fallback: rules → effect modifier stub
        const fallback = instantiateSrdEntity(payload.id, "effect", {
          name: payload.title,
          instanceId: reuseInstanceId,
        });
        if (!fallback || fallback.payload.target !== "effect") {
          return { ok: false, error: "Could not instantiate that SRD effect." };
        }
        const next = linkModifierToCharacter(saved.player, fallback.payload.modifier);
        await updateCharacterInLibrary(saved.id, next);
        const relationship = await indexInstance(
          fallback,
          { id: saved.id, ciClass: "character.sheet" },
          "effects",
        );
        scheduleLibrarySnapshot();
        return {
          ok: true,
          message: `${fallback.name} instantiated from SRD as an active effect.`,
          instanceId: fallback.instanceId,
          relationship,
        };
      }
      const next = linkModifierToCharacter(saved.player, inst.payload.modifier);
      await updateCharacterInLibrary(saved.id, next);
      const relationship = await indexInstance(
        inst,
        { id: saved.id, ciClass: "character.sheet" },
        "effects",
      );
      scheduleLibrarySnapshot();
      return {
        ok: true,
        message: `${inst.name} instantiated from SRD as an active effect.`,
        instanceId: inst.instanceId,
        relationship,
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

/**
 * Park a CF in the Lore Vault parking lot (drag-in). SRD entities become a
 * local instance on `LORE_VAULT_CONTAINER` — never a raw global id, and never
 * a new row in the master Library.
 */
export async function dropIntoVaultParking(
  payload: VaultDragPayload,
): Promise<ContainerMoveResult> {
  return parkInLoreVault(payload);
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
