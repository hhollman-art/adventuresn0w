import { describe, expect, it } from "vitest";
import {
  deriveCampaignMembershipEdges,
  mergeCampaignGraph,
  validateCfRelationshipEdge,
  type CampaignRelationshipGraph,
  type CfRelationshipEdge,
} from "@/lib/ciRelationshipGraph";
import type { SavedCampaign } from "@/lib/campaigns";

const campaign: SavedCampaign = {
  id: "camp-1",
  name: "Test",
  description: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  partyId: "party-1",
  seedIds: ["seed-1"],
  resultIds: ["result-1"],
  characterIds: ["char-1"],
  itemIds: ["item-1"],
  unassignedLootIds: [],
  npcIds: [],
  locationIds: [],
  sessionRecordIds: [],
};

describe("ciRelationshipGraph", () => {
  it("derives contains edges from campaign membership fields", () => {
    const edges = deriveCampaignMembershipEdges(campaign);
    expect(edges).toHaveLength(5);
    expect(edges.map((e) => e.derivedFrom).sort()).toEqual(
      ["characterIds", "itemIds", "partyId", "resultIds", "seedIds"].sort(),
    );
    expect(edges.every((e) => e.rel === "contains")).toBe(true);
  });

  it("rejects persisting contains edges", () => {
    const edge: CfRelationshipEdge = {
      id: "e1",
      rel: "contains",
      from: { kind: "cf", ciClass: "campaign.record", id: "camp-1" },
      to: { kind: "cf", ciClass: "party.roster", id: "party-1" },
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const result = validateCfRelationshipEdge(edge);
    expect(result.ok).toBe(false);
  });

  it("accepts typed adventure → npc involves edge", () => {
    const edge: CfRelationshipEdge = {
      id: "e2",
      rel: "involves",
      from: { kind: "cf", ciClass: "seed.adventure", id: "seed-adv" },
      to: { kind: "cf", ciClass: "npc.record", id: "npc-1" },
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(validateCfRelationshipEdge(edge)).toEqual({ ok: true });
  });

  it("accepts references edges to SRD targets", () => {
    const edge: CfRelationshipEdge = {
      id: "e3",
      rel: "references",
      from: { kind: "cf", ciClass: "seed.adventure", id: "seed-adv" },
      to: { kind: "srd", entityId: "spell:fireball", name: "Fireball" },
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(validateCfRelationshipEdge(edge)).toEqual({ ok: true });
  });

  it("merges derived membership with persisted graph edges", () => {
    const graph: CampaignRelationshipGraph = {
      campaignId: campaign.id,
      version: 1,
      updatedAt: "2024-01-02T00:00:00.000Z",
      edges: [
        {
          id: "e4",
          rel: "linked_to",
          from: { kind: "cf", ciClass: "seed.realm", id: "seed-1" },
          to: { kind: "cf", ciClass: "result.realm", id: "result-1" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };
    const merged = mergeCampaignGraph(campaign, graph);
    expect(merged).toHaveLength(6);
  });
});
