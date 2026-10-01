import { describe, expect, it } from "vitest";
import { fixSavedCampaign } from "@/lib/campaigns";
import type { CfRelationship } from "@/lib/workshop/containerCf";
import {
  buildCampaignZoneCards,
  campaignInstanceRelationships,
  mergeRelationshipRows,
  type CampaignZoneCatalog,
} from "./zoneCards";
import { sessionZoneCards } from "@/lib/tabletop/sessionZones";
import { linkDropEffectFor } from "@/lib/vault/cfDragDrop";

const EMPTY_CATALOG: CampaignZoneCatalog = {
  characters: [],
  parties: [],
  items: [],
  seeds: [],
  results: [],
  npcs: [],
  locations: [],
};

function instanceRow(partial: Partial<CfRelationship> & Pick<CfRelationship, "slot">): CfRelationship {
  const instanceId = partial.instanceId ?? `instance_x_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: `camp-1:${partial.slot}:${instanceId}`,
    parentId: "camp-1",
    parentCiClass: "campaign.record",
    childId: instanceId,
    childCiClass: "spell.srd-entry",
    kind: "link",
    label: "Fireball",
    active: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    sourceLibraryId: null,
    instanceId,
    _source: "SRD",
    sourceSrdEntityId: "spell:fireball",
    ...partial,
  };
}

const campaign = fixSavedCampaign({
  id: "camp-1",
  name: "Test",
  monsterIds: ["monster:goblin-warrior", "monster:owlbear"],
})!;

describe("buildCampaignZoneCards", () => {
  it("shows SRD instance rows in the bucket for their slot", () => {
    const rows = [
      instanceRow({ slot: "encounters", instanceId: "instance_spell_fireball_a" }),
      instanceRow({ slot: "members", instanceId: "instance_spell_bless_b", label: "Bless" }),
    ];
    const cards = buildCampaignZoneCards(campaign, EMPTY_CATALOG, rows);
    const fireball = cards.encounters.find((c) => c.id === "instance_spell_fireball_a");
    expect(fireball?.relationship?.sourceSrdEntityId).toBe("spell:fireball");
    expect(fireball?.subtitle).toBe("Spell · your copy (SRD)");
    expect(cards.parties.map((c) => c.title)).toContain("Bless");
  });

  it("replaces a legacy monster ref with its instance cards (one per drop)", () => {
    const goblin = (id: string) =>
      instanceRow({
        slot: "encounters",
        instanceId: id,
        childCiClass: "monster.srd-entry",
        label: "Goblin Warrior",
        sourceSrdEntityId: "monster:goblin-warrior",
      });
    const cards = buildCampaignZoneCards(campaign, EMPTY_CATALOG, [
      goblin("instance_monster_goblin_1"),
      goblin("instance_monster_goblin_2"),
    ]);
    const titles = cards.encounters.map((c) => c.title);
    expect(titles.filter((t) => t === "Goblin Warrior")).toHaveLength(2);
    expect(titles).not.toContain("goblin warrior");
    // Owlbear has no instance yet, so its legacy catalogue card stays.
    expect(titles).toContain("owlbear");
  });

  it("skips Library-backed SRD loot rows and other campaigns' rows", () => {
    const rows = [
      instanceRow({ slot: "loot", sourceLibraryId: "item_1", childCiClass: "item.srd-equipment" }),
      instanceRow({ slot: "encounters", parentId: "other-campaign" }),
    ];
    expect(campaignInstanceRelationships("camp-1", rows)).toHaveLength(0);
    const cards = buildCampaignZoneCards(campaign, EMPTY_CATALOG, rows);
    expect(cards.loot).toHaveLength(0);
  });

  it("merges optimistic rows by id without duplicating", () => {
    const a = instanceRow({ slot: "encounters", instanceId: "instance_a" });
    const merged = mergeRelationshipRows([a], [{ ...a, label: "Renamed" }, instanceRow({ slot: "scene" })]);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === a.id)?.label).toBe("Renamed");
  });
});

describe("sessionZoneCards", () => {
  it("regroups campaign buckets into the four Live Session containers", () => {
    const rows = [
      instanceRow({ slot: "scene", instanceId: "instance_rule_prone", childCiClass: "rules.srd-entry", label: "Prone" }),
      instanceRow({ slot: "encounters", instanceId: "instance_spell_fireball" }),
    ];
    const withNpc = fixSavedCampaign({ ...campaign, npcIds: ["npc-1"] })!;
    const catalog: CampaignZoneCatalog = {
      ...EMPTY_CATALOG,
      npcs: [{ id: "npc-1", name: "Mira", briefDescription: "" } as CampaignZoneCatalog["npcs"][number]],
    };
    const session = sessionZoneCards(buildCampaignZoneCards(withNpc, catalog, rows));
    expect(session.npcs.map((c) => c.title).sort()).toEqual(["Mira", "Prone"]);
    expect(session.quests.map((c) => c.title)).toContain("Fireball");
    expect(session.quests.map((c) => c.title)).not.toContain("Mira");
  });
});

describe("linkDropEffectFor", () => {
  it("prefers link, then falls back to what the drag source allows", () => {
    expect(linkDropEffectFor("all")).toBe("link");
    expect(linkDropEffectFor("copyLink")).toBe("link");
    expect(linkDropEffectFor("uninitialized")).toBe("link");
    expect(linkDropEffectFor(undefined)).toBe("link");
    expect(linkDropEffectFor("copyMove")).toBe("copy");
    expect(linkDropEffectFor("copy")).toBe("copy");
    expect(linkDropEffectFor("move")).toBe("move");
    expect(linkDropEffectFor("none")).toBe("none");
  });
});
