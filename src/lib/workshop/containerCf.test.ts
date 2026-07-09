import { describe, expect, it } from "vitest";
import {
  campaignToContainerCF,
  characterToContainerCF,
  emptyContainerCF,
  isContainerCiClass,
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
});
