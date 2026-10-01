import { describe, expect, it } from "vitest";
import type { CfRelationship } from "./containerCf";
import {
  fixCfRelationship,
  MAX_CONTAINER_RELATIONSHIPS,
  reconcileContainerRelationships,
  upsertRelationshipRows,
} from "./containerRelationships";

function rel(over: Partial<CfRelationship> = {}): CfRelationship {
  return {
    id: "hero-1:inventory:instance_weapon_longsword_abc123",
    parentId: "hero-1",
    parentCiClass: "character.sheet",
    childId: "instance_weapon_longsword_abc123",
    childCiClass: "item.srd-equipment",
    kind: "embed",
    slot: "inventory",
    label: "Longsword",
    active: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    sourceLibraryId: null,
    instanceId: "instance_weapon_longsword_abc123",
    _source: "SRD",
    sourceSrdEntityId: "weapon:longsword",
    ...over,
  };
}

describe("containerRelationships — fixCfRelationship", () => {
  it("round-trips a full SRD instance row", () => {
    const fixed = fixCfRelationship(JSON.parse(JSON.stringify(rel())));
    expect(fixed).toEqual(rel());
  });

  it("drops rows with unknown slot / kind or missing ids", () => {
    expect(fixCfRelationship({ ...rel(), slot: "nowhere" })).toBeNull();
    expect(fixCfRelationship({ ...rel(), kind: "teleport" })).toBeNull();
    expect(fixCfRelationship({ ...rel(), childId: "" })).toBeNull();
    expect(fixCfRelationship(null)).toBeNull();
    expect(fixCfRelationship("nope")).toBeNull();
  });

  it("only keeps provenance when _source is SRD and instanceId is present", () => {
    const noSource = fixCfRelationship({ ...rel(), _source: undefined });
    expect(noSource?._source).toBeUndefined();
    expect(noSource?.instanceId).toBeUndefined();
    expect(noSource?.sourceSrdEntityId).toBeUndefined();

    const legacy = fixCfRelationship({
      id: "camp-1:members:hero-1",
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: "hero-1",
      childCiClass: "character.sheet",
      kind: "link",
      slot: "members",
    });
    expect(legacy?.label).toBe("hero-1");
    expect(legacy?.active).toBe(true);
    expect(typeof legacy?.createdAt).toBe("string");
  });
});

describe("containerRelationships — upsertRelationshipRows", () => {
  it("dedupes by (parent, slot, child) and keeps the original row id", () => {
    const first = rel({ id: "orig", label: "Longsword" });
    const again = rel({ id: "newer", label: "Longsword (renamed)", active: false });
    const merged = upsertRelationshipRows([first], [again]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("orig");
    expect(merged[0]?.label).toBe("Longsword (renamed)");
    expect(merged[0]?.active).toBe(false);
  });

  it("keeps distinct instances of the same SRD entity apart", () => {
    const a = rel();
    const b = rel({
      id: "hero-1:inventory:instance_weapon_longsword_zzz999",
      childId: "instance_weapon_longsword_zzz999",
      instanceId: "instance_weapon_longsword_zzz999",
    });
    expect(upsertRelationshipRows([a], [b])).toHaveLength(2);
  });

  it("respects the hard cap by keeping newest rows", () => {
    const rows: CfRelationship[] = [];
    for (let i = 0; i < MAX_CONTAINER_RELATIONSHIPS + 5; i += 1) {
      rows.push(
        rel({
          id: `r${i}`,
          childId: `instance_x_${i}`,
          instanceId: `instance_x_${i}`,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        }),
      );
    }
    const merged = upsertRelationshipRows([], rows);
    expect(merged).toHaveLength(MAX_CONTAINER_RELATIONSHIPS);
    expect(merged.some((r) => r.id === "r0")).toBe(false);
    expect(merged.some((r) => r.id === `r${MAX_CONTAINER_RELATIONSHIPS + 4}`)).toBe(true);
  });
});

describe("containerRelationships — reconcileContainerRelationships", () => {
  it("drops rows whose child left the parent, keeps slots it was not told about", () => {
    const inventory = rel();
    const gone = rel({
      id: "hero-1:inventory:instance_armor_shield_q1",
      childId: "instance_armor_shield_q1",
      instanceId: "instance_armor_shield_q1",
      sourceSrdEntityId: "armor:shield",
    });
    const scene = rel({
      id: "camp-1:scene:instance_feat_alert_x",
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: "instance_feat_alert_x",
      instanceId: "instance_feat_alert_x",
      slot: "scene",
      kind: "modifier",
    });
    const kept = reconcileContainerRelationships([inventory, gone, scene], {
      inventory: new Set([inventory.childId]),
    });
    expect(kept.map((r) => r.id)).toEqual([inventory.id, scene.id]);
  });

  it("matches spell instances by catalogue key on the sheet", () => {
    const spell = rel({
      id: "hero-1:spells:instance_spell_fireball_a1",
      childId: "instance_spell_fireball_a1",
      instanceId: "instance_spell_fireball_a1",
      childCiClass: "spell.srd-entry",
      slot: "spells",
      kind: "link",
      sourceSrdEntityId: "spell:fireball",
    });
    expect(
      reconcileContainerRelationships([spell], { spells: new Set(["fireball"]) }),
    ).toHaveLength(1);
    expect(
      reconcileContainerRelationships([spell], { spells: new Set(["magic-missile"]) }),
    ).toHaveLength(0);
  });

  it("matches loot instances by the Library row id they were saved as", () => {
    const loot = rel({
      id: "camp-1:loot:instance_magic-item_bag-of-holding_b2",
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: "instance_magic-item_bag-of-holding_b2",
      instanceId: "instance_magic-item_bag-of-holding_b2",
      slot: "loot",
      kind: "park",
      sourceLibraryId: "lib-uuid-1",
    });
    expect(
      reconcileContainerRelationships([loot], { loot: new Set(["lib-uuid-1"]) }),
    ).toHaveLength(1);
  });
});
