import { describe, expect, it } from "vitest";
import {
  campaignToContainerCF,
  characterToContainerCF,
  emptyContainerCF,
  isContainerCiClass,
  containerHoldsSpell,
  extractLegacySpellInstanceLines,
  mergeContainerRelationships,
  removeContainerRelationshipsForChild,
  spellKeyFromSrdEntityId,
  spellRelationships,
  upsertContainerRelationship,
  type CfRelationship,
} from "./containerCf";

describe("containerCf", () => {
  it("recognizes container CI classes", () => {
    expect(isContainerCiClass("campaign.record")).toBe(true);
    expect(isContainerCiClass("character.sheet")).toBe(true);
    expect(isContainerCiClass("item.equipment")).toBe(false);
  });

  it("projects a campaign into ContainerCF relationships", () => {
    const container = campaignToContainerCF({
      id: "camp-1",
      name: "Curse of Strahd",
      updatedAt: "2026-07-09T00:00:00.000Z",
      partyId: "party-1",
      seedIds: ["seed-1"],
      resultIds: [],
      characterIds: ["hero-1"],
      itemIds: ["item-1"],
      unassignedLootIds: ["loot-1"],
      npcIds: ["npc-1"],
      locationIds: [],
    });
    expect(container.ciClass).toBe("campaign.record");
    expect(container.relationships.some((r) => r.slot === "party")).toBe(true);
    expect(container.relationships.some((r) => r.slot === "loot" && r.kind === "park")).toBe(
      true,
    );
    expect(container.relationships.some((r) => r.slot === "members")).toBe(true);
  });

  it("projects a character into inventory / spells / effects slots", () => {
    const container = characterToContainerCF({
      id: "hero-1",
      name: "Aria",
      updatedAt: "2026-07-09T00:00:00.000Z",
      items: [{ id: "emb-1", name: "Sun Blade", libraryItemId: "lib-1", equipped: true }],
      knownSpellIds: ["fire-bolt"],
      preparedSpellIds: ["fire-bolt"],
      linkedModifiers: [
        {
          id: "mod-1",
          sourceLabel: "Curse of Weakness",
          sourceCfId: "cf-curse",
          active: true,
        },
      ],
    });
    expect(container.relationships.filter((r) => r.slot === "inventory")).toHaveLength(1);
    expect(container.relationships.filter((r) => r.slot === "spells")[0]?.active).toBe(true);
    expect(container.relationships.filter((r) => r.slot === "effects")[0]?.kind).toBe(
      "modifier",
    );
  });

  it("builds an empty container shell", () => {
    const c = emptyContainerCF("x", "campaign.record", "Test");
    expect(c.relationships).toEqual([]);
  });

  it("carries SRD instance provenance from embedded gear and modifiers", () => {
    const container = characterToContainerCF({
      id: "hero-1",
      name: "Aria",
      updatedAt: "2026-10-01T00:00:00.000Z",
      items: [
        {
          id: "instance_weapon_longsword_abc",
          name: "Longsword",
          instanceId: "instance_weapon_longsword_abc",
          _source: "SRD",
          sourceSrdEntityId: "weapon:longsword",
        },
        { id: "plain", name: "Rope", libraryItemId: "lib-rope" },
      ],
      knownSpellIds: [],
      preparedSpellIds: [],
      linkedModifiers: [
        {
          id: "instance_feat_alert_x",
          sourceLabel: "Alert",
          sourceCfId: "instance_feat_alert_x",
          active: true,
          instanceId: "instance_feat_alert_x",
          _source: "SRD",
          sourceSrdEntityId: "feat:alert",
        },
      ],
    });
    const sword = container.relationships.find((r) => r.childId === "instance_weapon_longsword_abc");
    expect(sword?._source).toBe("SRD");
    expect(sword?.sourceSrdEntityId).toBe("weapon:longsword");
    const rope = container.relationships.find((r) => r.childId === "plain");
    expect(rope?._source).toBeUndefined();
    const alert = container.relationships.find((r) => r.slot === "effects");
    expect(alert?.instanceId).toBe("instance_feat_alert_x");
    expect(alert?.kind).toBe("modifier");
  });

  it("merges persisted spell instances and collapses the bare catalogue link", () => {
    const persisted: CfRelationship = {
      id: "hero-1:spells:instance_spell_fireball_a1",
      parentId: "hero-1",
      parentCiClass: "character.sheet",
      childId: "instance_spell_fireball_a1",
      childCiClass: "spell.srd-entry",
      kind: "link",
      slot: "spells",
      label: "Fireball",
      active: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      instanceId: "instance_spell_fireball_a1",
      _source: "SRD",
      sourceSrdEntityId: "spell:fireball",
    };
    const container = characterToContainerCF({
      id: "hero-1",
      name: "Aria",
      updatedAt: "2026-10-01T00:00:00.000Z",
      items: [],
      knownSpellIds: ["fireball", "shield"],
      preparedSpellIds: ["fireball"],
      linkedModifiers: [],
      persisted: [persisted],
    });
    const spells = container.relationships.filter((r) => r.slot === "spells");
    expect(spells).toHaveLength(2);
    expect(spells.some((r) => r.childId === "fireball")).toBe(false);
    expect(spells.some((r) => r.childId === "instance_spell_fireball_a1")).toBe(true);
    expect(spells.some((r) => r.childId === "shield")).toBe(true);
  });

  it("merges persisted campaign rows (scene effects, loot instances) into the projection", () => {
    const scene: CfRelationship = {
      id: "camp-1:scene:instance_condition_blinded_q",
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: "instance_condition_blinded_q",
      childCiClass: "rules.srd-entry",
      kind: "modifier",
      slot: "scene",
      label: "Blinded",
      active: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      instanceId: "instance_condition_blinded_q",
      _source: "SRD",
      sourceSrdEntityId: "condition:blinded",
    };
    const container = campaignToContainerCF({
      id: "camp-1",
      name: "Test",
      updatedAt: "2026-10-01T00:00:00.000Z",
      partyId: null,
      seedIds: [],
      resultIds: [],
      characterIds: [],
      itemIds: [],
      unassignedLootIds: ["lib-1"],
      npcIds: [],
      locationIds: [],
      persisted: [scene],
    });
    expect(container.relationships.some((r) => r.slot === "scene" && r._source === "SRD")).toBe(true);
    expect(container.relationships.some((r) => r.slot === "loot" && r.childId === "lib-1")).toBe(true);
  });

  it("mergeContainerRelationships lets persisted rows win on the same membership key", () => {
    const derived: CfRelationship = {
      id: "camp-1:loot:lib-1",
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: "lib-1",
      childCiClass: "item.equipment",
      kind: "park",
      slot: "loot",
      label: "lib-1",
      active: true,
      createdAt: "2026-10-01T00:00:00.000Z",
    };
    const persisted: CfRelationship = { ...derived, label: "Bag of Holding", _source: "SRD", instanceId: "instance_magic-item_bag_1", sourceSrdEntityId: "magic-item:bag-of-holding" };
    const merged = mergeContainerRelationships([derived], [persisted]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.label).toBe("Bag of Holding");
    expect(merged[0]?.instanceId).toBe("instance_magic-item_bag_1");
  });

  it("answers spell containment from the projection (instance rows and bare links)", () => {
    const persisted: CfRelationship = {
      id: "hero-1:spells:instance_spell_fireball_a1",
      parentId: "hero-1",
      parentCiClass: "character.sheet",
      childId: "instance_spell_fireball_a1",
      childCiClass: "spell.srd-entry",
      kind: "link",
      slot: "spells",
      label: "Fireball",
      active: false,
      createdAt: "2026-10-01T00:00:00.000Z",
      instanceId: "instance_spell_fireball_a1",
      _source: "SRD",
      sourceSrdEntityId: "spell:fireball",
    };
    const container = characterToContainerCF({
      id: "hero-1",
      name: "Aria",
      updatedAt: "2026-10-01T00:00:00.000Z",
      items: [],
      knownSpellIds: ["fireball", "shield"],
      preparedSpellIds: [],
      linkedModifiers: [],
      persisted: [persisted],
    });
    expect(containerHoldsSpell(container, "fireball")).toBe(true);
    expect(containerHoldsSpell(container, "shield")).toBe(true);
    expect(containerHoldsSpell(container, "magic-missile")).toBe(false);
    expect(spellRelationships(container, "fireball")).toHaveLength(1);
    expect(spellRelationships(container, "fireball")[0]?.instanceId).toBe(
      "instance_spell_fireball_a1",
    );
    expect(spellKeyFromSrdEntityId("spell:fireball")).toBe("fireball");
    expect(spellKeyFromSrdEntityId(null)).toBe("");
  });

  it("strips only legacy spell instance lines from notes and reports them", () => {
    const notes = [
      "Owes the innkeeper 5 gp.",
      "[instance:instance_spell_fireball_a1b2c3 _source:SRD spell:fireball]",
      "Fears spiders.",
      "  [instance:instance_spell_shield_zz9 _source:SRD spell:shield]  ",
      "[instance: this is the DM's own bracket note]",
    ].join("\n");
    const out = extractLegacySpellInstanceLines(notes);
    expect(out.entries).toEqual([
      { instanceId: "instance_spell_fireball_a1b2c3", spellKey: "fireball" },
      { instanceId: "instance_spell_shield_zz9", spellKey: "shield" },
    ]);
    expect(out.notes).toBe(
      "Owes the innkeeper 5 gp.\nFears spiders.\n[instance: this is the DM's own bracket note]",
    );
  });

  it("leaves notes byte-identical when there are no legacy lines", () => {
    const notes = "  Keeps a lucky coin.\n\n";
    expect(extractLegacySpellInstanceLines(notes)).toEqual({ notes, entries: [] });
  });

  it("upsert / remove reducers are immutable drop-state updates", () => {
    const base = emptyContainerCF("hero-1", "character.sheet", "Aria");
    const rel: CfRelationship = {
      id: "hero-1:inventory:instance_weapon_dagger_1",
      parentId: "hero-1",
      parentCiClass: "character.sheet",
      childId: "instance_weapon_dagger_1",
      childCiClass: "item.srd-equipment",
      kind: "embed",
      slot: "inventory",
      label: "Dagger",
      active: true,
      createdAt: "2099-01-01T00:00:00.000Z",
      instanceId: "instance_weapon_dagger_1",
      _source: "SRD",
      sourceSrdEntityId: "weapon:dagger",
    };
    const withRel = upsertContainerRelationship(base, rel);
    expect(base.relationships).toHaveLength(0);
    expect(withRel.relationships).toHaveLength(1);
    expect(withRel.updatedAt).toBe(rel.createdAt);

    const replaced = upsertContainerRelationship(withRel, { ...rel, active: false });
    expect(replaced.relationships).toHaveLength(1);
    expect(replaced.relationships[0]?.active).toBe(false);

    const removed = removeContainerRelationshipsForChild(replaced, rel.childId);
    expect(removed.relationships).toHaveLength(0);
    expect(replaced.relationships).toHaveLength(1);
  });
});
