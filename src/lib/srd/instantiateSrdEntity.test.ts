import { describe, expect, it } from "vitest";
import {
  instantiateSrdEntity,
  isInstantiatedCF,
  isStaticSRDReference,
  isStaticSrdDragId,
  makeSrdInstanceId,
  toStaticSRDReference,
} from "./instantiateSrdEntity";
import { listSrdEntities } from "./corpus";

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
});
