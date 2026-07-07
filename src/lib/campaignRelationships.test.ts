import { describe, expect, it } from "vitest";
import {
  fixCampaignRelationshipGraph,
  validateRelationshipEdge,
} from "@/lib/campaignRelationships";
import type { CfRelationshipEdge } from "@/lib/ciRelationshipGraph";

describe("campaignRelationships storage helpers", () => {
  it("fixes and validates a persisted graph document", () => {
    const fixed = fixCampaignRelationshipGraph({
      campaignId: "camp-1",
      version: 1,
      updatedAt: "2024-01-01T00:00:00.000Z",
      edges: [
        {
          id: "e1",
          rel: "linked_to",
          from: { kind: "cf", ciClass: "seed.adventure", id: "s1" },
          to: { kind: "cf", ciClass: "character.sheet", id: "c1" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(fixed?.edges).toHaveLength(1);
    expect(fixed?.campaignId).toBe("camp-1");
  });

  it("drops invalid edges during fix", () => {
    const fixed = fixCampaignRelationshipGraph({
      campaignId: "camp-1",
      version: 1,
      updatedAt: "2024-01-01T00:00:00.000Z",
      edges: [
        {
          id: "bad",
          rel: "contains",
          from: { kind: "cf", ciClass: "campaign.record", id: "camp-1" },
          to: { kind: "cf", ciClass: "party.roster", id: "p1" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(fixed?.edges).toHaveLength(0);
  });

  it("validates user edges through the public helper", () => {
    const edge: CfRelationshipEdge = {
      id: "e2",
      rel: "involves",
      from: { kind: "cf", ciClass: "result.adventure", id: "r1" },
      to: { kind: "cf", ciClass: "character.sheet", id: "c1" },
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(validateRelationshipEdge(edge)).toEqual({ ok: true });
  });
});
