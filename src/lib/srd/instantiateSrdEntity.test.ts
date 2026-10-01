import { describe, expect, it } from "vitest";
import {
  hasSrdInstanceProvenance,
  instanceRelationshipId,
  instantiateSrdEntity,
  isInstantiatedCF,
  isStaticSRDReference,
  isStaticSrdDragId,
  makeSrdInstanceId,
  relationKindForInstance,
  relationshipForInstance,
  toStaticSRDReference,
} from "./instantiateSrdEntity";
import { getSrdEntity, listSrdEntities } from "./corpus";
import { srdEntities } from "./srdAssets";

describe("instantiateSrdEntity", () => {
  it("builds StaticSRDReference type guards", () => {
    const weapons = listSrdEntities("weapon");
    const sample = weapons[0];
    if (!sample) {
      expect(isStaticSrdDragId("weapon:longsword")).toBe(true);
      return;
    }
    const ref = toStaticSRDReference(sample.id, sample.name);
    expect(ref).not.toBeNull();
    expect(isStaticSRDReference(ref)).toBe(true);
    expect(isInstantiatedCF(ref)).toBe(false);
  });

  it("makes unique instance ids with SRD kind + key", () => {
    const a = makeSrdInstanceId("feat:alert" as never);
    const b = makeSrdInstanceId("feat:alert" as never);
    expect(a).toMatch(/^instance_feat_alert_/);
    expect(a).not.toBe(b);
  });

  it("hydrates an item into a local CharacterItem with _source SRD", () => {
    const weapons = listSrdEntities("weapon");
    const sample = weapons[0];
    if (!sample) return;

    const inst = instantiateSrdEntity(sample.id, "character-item");
    expect(inst).not.toBeNull();
    expect(isInstantiatedCF(inst)).toBe(true);
    if (!inst || inst.payload.target !== "character-item") return;

    expect(inst._source).toBe("SRD");
    expect(inst.instanceId.startsWith("instance_")).toBe(true);
    expect(inst.payload.item._source).toBe("SRD");
    expect(inst.payload.item.sourceSrdEntityId).toBe(sample.id);
    expect(inst.payload.item.id).toBe(inst.instanceId);
    // Global entity id must not be used as the local row id.
    expect(inst.payload.item.id).not.toBe(sample.id);
  });

  it("hydrates a spell without linking the global entity id as knownSpell key alone", () => {
    const spells = listSrdEntities("spell");
    const sample = spells[0];
    if (!sample) return;

    const inst = instantiateSrdEntity(sample.id, "spell");
    expect(inst).not.toBeNull();
    if (!inst || inst.payload.target !== "spell") return;
    expect(inst.payload.spellKey).toBe(sample.key);
    expect(inst.instanceId).not.toBe(sample.id);
    expect(inst._source).toBe("SRD");
  });

  it("hydrates feats/conditions as local effect modifiers", () => {
    const feats = listSrdEntities("feat");
    const sample = feats[0];
    if (!sample) return;

    const inst = instantiateSrdEntity(sample.id, "effect");
    expect(inst).not.toBeNull();
    if (!inst || inst.payload.target !== "effect") return;
    expect(inst.payload.modifier.id).toBe(inst.instanceId);
    expect(inst.payload.modifier.sourceCfId).toBe(inst.instanceId);
    expect(inst.payload.modifier._source).toBe("SRD");
  });

  it("detects static SRD drag ids vs instance ids", () => {
    expect(isStaticSrdDragId("weapon:shortsword")).toBe(true);
    expect(isStaticSrdDragId("instance_weapon_shortsword_abc123")).toBe(false);
  });

  it("puts typed provenance on the Library item draft (campaign-item)", () => {
    const sample = listSrdEntities("weapon")[0];
    if (!sample) return;
    const inst = instantiateSrdEntity(sample.id, "campaign-item");
    expect(inst).not.toBeNull();
    if (!inst || inst.payload.target !== "campaign-item") return;
    expect(inst.payload.draft.instanceId).toBe(inst.instanceId);
    expect(inst.payload.draft._source).toBe("SRD");
    expect(inst.payload.draft.sourceSrdEntityId).toBe(sample.id);
    expect(hasSrdInstanceProvenance(inst.payload.draft)).toBe(true);
  });

  it("effects carry the full provenance triple", () => {
    const sample = listSrdEntities("feat")[0];
    if (!sample) return;
    const inst = instantiateSrdEntity(sample.id, "effect");
    if (!inst || inst.payload.target !== "effect") return;
    expect(hasSrdInstanceProvenance(inst.payload.modifier)).toBe(true);
    expect(inst.payload.modifier.sourceSrdEntityId).toBe(sample.id);
  });

  it("builds a container relationship row keyed by instanceId, not the global id", () => {
    const sample = listSrdEntities("weapon")[0];
    if (!sample) return;
    const inst = instantiateSrdEntity(sample.id, "character-item");
    if (!inst) return;

    const rel = relationshipForInstance(
      inst,
      { id: "hero-1", ciClass: "character.sheet" },
      "inventory",
      { createdAt: "2026-10-01T00:00:00.000Z" },
    );
    expect(rel.id).toBe(instanceRelationshipId("hero-1", "inventory", inst.instanceId));
    expect(rel.parentId).toBe("hero-1");
    expect(rel.parentCiClass).toBe("character.sheet");
    expect(rel.childId).toBe(inst.instanceId);
    expect(rel.childId).not.toBe(sample.id);
    expect(rel.kind).toBe("embed");
    expect(rel.slot).toBe("inventory");
    expect(rel._source).toBe("SRD");
    expect(rel.sourceSrdEntityId).toBe(sample.id);
    expect(rel.active).toBe(true);
    expect(hasSrdInstanceProvenance(rel)).toBe(true);
  });

  it("maps payload targets to container hold kinds", () => {
    const weapon = listSrdEntities("weapon")[0];
    const spell = listSrdEntities("spell")[0];
    const feat = listSrdEntities("feat")[0];
    if (!weapon || !spell || !feat) return;
    expect(relationKindForInstance(instantiateSrdEntity(weapon.id, "character-item")!)).toBe("embed");
    expect(relationKindForInstance(instantiateSrdEntity(weapon.id, "campaign-item")!)).toBe("park");
    expect(relationKindForInstance(instantiateSrdEntity(spell.id, "spell")!)).toBe("link");
    expect(relationKindForInstance(instantiateSrdEntity(feat.id, "effect")!)).toBe("modifier");
  });

  it("mutating an instance never touches the global SRD asset", () => {
    const sample = listSrdEntities("weapon")[0];
    if (!sample) return;
    const before = JSON.stringify(getSrdEntity(sample.id));
    const tableBefore = srdEntities();

    const inst = instantiateSrdEntity(sample.id, "character-item");
    if (!inst || inst.payload.target !== "character-item") return;

    // Local edit: turn the standard weapon into a custom magic item.
    inst.payload.item.name = "Blade of the Dawn (+1)";
    inst.payload.item.notes = "Glows at sunrise. Custom homebrew.";
    inst.payload.item.bonuses.ac = 1;
    inst.name = "Blade of the Dawn";

    expect(JSON.stringify(getSrdEntity(sample.id))).toBe(before);
    expect(srdEntities()).toBe(tableBefore);
    expect(getSrdEntity(sample.id)?.name).toBe(sample.name);
  });
});
