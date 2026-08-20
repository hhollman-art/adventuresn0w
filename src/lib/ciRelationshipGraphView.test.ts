import { describe, expect, it } from "vitest";
import { buildCampaignGraphRows } from "@/lib/ciRelationshipGraphView";
import type { SavedCampaign } from "@/lib/campaigns";
import type { CampaignRelationshipGraph } from "@/lib/ciRelationshipGraph";

const campaign: SavedCampaign = {
  id: "camp-1",
  name: "Test",
  description: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  partyId: "party-1",
  seedIds: ["seed-1"],
  resultIds: [],
  characterIds: ["char-1"],
  itemIds: [],
  unassignedLootIds: [],
  npcIds: [],
  locationIds: [],
  sessionRecordIds: [],
  monsterIds: [],
};

const data = {
  seeds: [
    {
      id: "seed-1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "adventure" as const,
      titleHint: "Hook",
      briefDescription: "",
      markdown: "# Hook",
    },
  ],
  results: [],
  characters: [
    {
      id: "char-1",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      source: "created" as const,
      player: {
        id: "char-1",
        name: "Aria",
        playerName: "",
        species: "Human",
        className: "Fighter",
        subclass: "",
        background: "",
        alignment: "",
        level: 1,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        ac: 10,
        maxHp: 10,
        speed: 30,
        notes: "",
        items: [],
        knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
        currentHp: null,
        tokenId: null,
      },
    },
  ],
  items: [],
  parties: [
    {
      id: "party-1",
      name: "The party",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      source: "workshop" as const,
      notes: "",
      markdown: "",
      players: [],
    },
  ],
};

describe("ciRelationshipGraphView", () => {
  it("builds membership and semantic rows with labels", () => {
    const graph: CampaignRelationshipGraph = {
      campaignId: campaign.id,
      version: 1,
      updatedAt: "2024-01-02T00:00:00.000Z",
      edges: [
        {
          id: "e1",
          rel: "involves",
          from: { kind: "cf", ciClass: "seed.adventure", id: "seed-1" },
          to: { kind: "cf", ciClass: "character.sheet", id: "char-1" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const all = buildCampaignGraphRows(campaign, graph, data, "all");
    expect(all.length).toBeGreaterThan(3);
    expect(all.some((row) => row.relLabel === "Involves" && row.fromLabel === "Hook")).toBe(
      true,
    );
    expect(all.some((row) => row.derived && row.relLabel === "Contains")).toBe(true);
  });
});
