import { describe, expect, it } from "vitest";
import {
  buildCampaignTree,
  campaignAdventureResults,
  campaignAdventureSeeds,
  campaignsLinkingCi,
  srdItemRefKey,
} from "./ciRelationships";
import type { SavedCampaign } from "./campaigns";
import type { LibraryItem } from "./generationLibrary";
import type { SavedGameItem } from "./itemLibrary";
import type { SavedRealmSeed } from "./realmSeeds";
import type { SavedCharacter } from "./tabletop/characterLibrary";
import type { SavedCharacterRoster } from "./tabletop/characterRoster";

const campaign: SavedCampaign = {
  id: "c1",
  name: "Test campaign",
  description: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  partyId: "party-1",
  seedIds: ["seed-adv", "seed-realm"],
  resultIds: ["result-adv"],
  characterIds: ["char-2"],
  itemIds: ["item-1"],
  unassignedLootIds: [],
  npcIds: [],
  locationIds: [],
  sessionRecordIds: [],
};

describe("ciRelationships", () => {
  it("finds adventure seeds and results linked to a campaign", () => {
    const seeds: SavedRealmSeed[] = [
      {
        id: "seed-adv",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "adventure",
        titleHint: "Dungeon",
        briefDescription: "",
        markdown: "",
      },
      {
        id: "seed-realm",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "realm",
        titleHint: "World",
        briefDescription: "",
        markdown: "",
      },
    ];
    expect(campaignAdventureSeeds(campaign, seeds)).toHaveLength(1);
    expect(campaignAdventureSeeds(campaign, seeds)[0]?.id).toBe("seed-adv");

    const results: LibraryItem[] = [
      {
        id: "result-adv",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "adventure",
        title: "Adventure result",
        markdown: "",
        textModel: null,
        imageModel: null,
        images: [],
      },
    ];
    expect(campaignAdventureResults(campaign, results)).toHaveLength(1);
  });

  it("reverse-looks up campaigns linking a Creation File (CF) id", () => {
    const campaigns = [campaign];
    expect(campaignsLinkingCi(campaigns, "char-2")).toHaveLength(1);
    expect(campaignsLinkingCi(campaigns, "missing")).toHaveLength(0);
    expect(
      campaignsLinkingCi(campaigns, "item-1", { field: "itemIds" }),
    ).toHaveLength(1);
  });

  it("builds a campaign-rooted tree", () => {
    const tree = buildCampaignTree(campaign, {
      seeds: [],
      results: [],
      parties: [
        {
          id: "party-1",
          name: "Heroes",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          source: "workshop",
          notes: "",
          markdown: "",
          players: [{ id: "char-1", name: "Aria", className: "Wizard", level: 3 } as never],
        } satisfies SavedCharacterRoster,
      ],
      characters: [
        {
          id: "char-2",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          source: "created",
          player: { id: "char-2", name: "Bob", className: "Fighter", level: 1 } as never,
        } satisfies SavedCharacter,
      ],
      items: [
        {
          id: "item-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          source: "created",
          kind: "magic",
          name: "Ring",
          itemType: "Ring",
          rarity: "rare",
          requiresAttunement: true,
          description: "",
          bonuses: {} as never,
        } satisfies SavedGameItem,
      ],
    });
    expect(tree.ciClass).toBe("campaign.record");
    expect(tree.children?.some((n) => n.ciClass === "party.roster")).toBe(true);
    expect(tree.children?.some((n) => n.id === "char-2")).toBe(true);
  });

  it("formats stable SRD item ref keys", () => {
    expect(srdItemRefKey({ resource: "equipment", index: "longsword", name: "Longsword" })).toBe(
      "equipment:longsword",
    );
  });
});
