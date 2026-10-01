import { describe, expect, it } from "vitest";
import {
  classifyCampaignChildId,
  mergeCampaignLinks,
  readAdventureChildIds,
  resolveAdventureChildren,
  detachLinkForCi,
  type CampaignBuilderCatalog,
} from "@/lib/campaignBuilder/cascade";
import { CAMPAIGN_BUILDER_ZONES } from "@/lib/campaignBuilder/zones";
import { fixSavedCampaign } from "@/lib/campaigns";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";

const emptyCatalog: CampaignBuilderCatalog = {
  characters: [],
  items: [],
  seeds: [],
  results: [],
  parties: [],
  npcs: [],
  locations: [],
};

describe("campaign builder zones", () => {
  it("defines the five Homebrew Campaign Builder drop zones", () => {
    expect(CAMPAIGN_BUILDER_ZONES.map((z) => z.id)).toEqual([
      "parties",
      "adventures",
      "locations",
      "encounters",
      "loot",
    ]);
  });

  it("resolves ciClass to the matching builder zone", async () => {
    const { resolveCampaignBuilderZoneForCiClass } = await import("@/lib/campaignBuilder/zones");
    expect(resolveCampaignBuilderZoneForCiClass("character.sheet")?.id).toBe("parties");
    expect(resolveCampaignBuilderZoneForCiClass("seed.adventure")?.id).toBe("adventures");
    expect(resolveCampaignBuilderZoneForCiClass("location.record")?.id).toBe("locations");
    expect(resolveCampaignBuilderZoneForCiClass("npc.record")?.id).toBe("encounters");
    expect(resolveCampaignBuilderZoneForCiClass("item.magic")?.id).toBe("loot");
  });
});

describe("adventure cascade", () => {
  it("reads childIds from adventure rows", () => {
    expect(readAdventureChildIds({ childIds: ["a", "a", "b"] })).toEqual(["a", "b"]);
    expect(readAdventureChildIds({})).toEqual([]);
  });

  it("resolves child ids against the Library catalog and cascades links", () => {
    const character: SavedCharacter = {
      id: "hero-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      source: "created",
      player: {
        id: "hero-1",
        name: "Aria",
        playerName: "",
        species: "Human",
        className: "Paladin",
        subclass: "",
        background: "",
        alignment: "",
        level: 5,
        abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
        ac: 18,
        maxHp: 40,
        speed: 30,
        notes: "",
        items: [],
        knownSpellIds: [],
        preparedSpellIds: [],
        linkedModifiers: [],
        currentHp: null,
        tokenId: null,
      },
    };
    const catalog: CampaignBuilderCatalog = {
      ...emptyCatalog,
      characters: [character],
      items: [
        {
          id: "item-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          kind: "equipment",
          name: "Lantern",
          itemType: "Adventuring gear",
          rarity: null,
          requiresAttunement: false,
          attunementNote: "",
          description: "",
          properties: "",
          charges: "",
          effects: "",
          bonuses: {
            ac: 0,
            maxHp: 0,
            speed: 0,
            initiative: 0,
            passivePerception: 0,
            str: 0,
            dex: 0,
            con: 0,
            int: 0,
            wis: 0,
            cha: 0,
          },
          source: "created",
          isHomebrew: false,
          createdBy: null,
          tags: [],
          settingTags: [],
          sourceNote: "",
          imageDataUrl: null,
          instanceId: null,
          _source: null,
          sourceSrdEntityId: null,
        },
      ],
      locations: [
        {
          id: "loc-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          name: "Phandalin",
          locationKind: "city",
          parentLocationId: null,
          inhabitantNpcIds: [],
          factionIds: [],
          timelineNotes: "",
          markdown: "",
          source: "created",
        },
      ],
    };

    const resolved = resolveAdventureChildren(
      ["hero-1", "item-1", "loc-1", "monster:goblin-warrior", "missing"],
      catalog,
    );
    expect(resolved.map((r) => r.id)).toEqual([
      "hero-1",
      "item-1",
      "loc-1",
      "monster:goblin-warrior",
    ]);

    const campaign = fixSavedCampaign({ id: "c1", name: "Test" })!;
    const patch = mergeCampaignLinks(campaign, [
      { seedId: "adv-1" },
      ...resolved.map((r) => r.link),
    ]);
    expect(patch.seedIds).toContain("adv-1");
    expect(patch.characterIds).toContain("hero-1");
    expect(patch.itemIds).toContain("item-1");
    expect(patch.locationIds).toContain("loc-1");
    expect(patch.monsterIds).toContain("monster:goblin-warrior");
  });

  it("classifies monster entity ids", () => {
    expect(classifyCampaignChildId("monster:owlbear", emptyCatalog)?.link).toEqual({
      monsterId: "monster:owlbear",
    });
  });

  it("builds detach patches without deleting source CFs", () => {
    expect(detachLinkForCi("character.sheet", "h1")).toEqual({ characterId: "h1" });
    expect(detachLinkForCi("seed.adventure", "s1")).toEqual({ seedId: "s1" });
    expect(detachLinkForCi("monster.srd-entry", "monster:x")).toEqual({ monsterId: "monster:x" });
    expect(detachLinkForCi("party.roster", "p1")).toEqual({ partyId: true });
  });
});

describe("fixSavedCampaign monsterIds", () => {
  it("defaults monsterIds to []", () => {
    expect(fixSavedCampaign({ id: "c1", name: "A" })?.monsterIds).toEqual([]);
  });
});
