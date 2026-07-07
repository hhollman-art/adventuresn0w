import { describe, expect, it } from "vitest";
import {
  buildRecentSessions,
  pickRecentCreations,
} from "@/lib/workshop/dmDashboard";

describe("dmDashboard", () => {
  it("picks the newest creations across shelves", () => {
    const rows = pickRecentCreations(
      [
        {
          id: "s1",
          kind: "realm",
          titleHint: "Old realm",
          briefDescription: "",
          markdown: "# Old",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "s2",
          kind: "adventure",
          titleHint: "Fresh hook",
          briefDescription: "",
          markdown: "# New",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      [],
      [],
      [],
      2,
    );
    expect(rows[0]?.id).toBe("s2");
    expect(rows[0]?.ciClass).toBe("seed.adventure");
  });

  it("merges live and shelved table sessions by recency", () => {
    const sessions = buildRecentSessions(
      [{ id: "c1", name: "Curse of Fog", description: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", partyId: null, seedIds: [], resultIds: [], characterIds: [], itemIds: [] }],
      "c1",
      "2026-07-05T12:00:00.000Z",
      "Tavern brawl",
      "Initiative rolled",
      [
        {
          campaignId: "c1",
          mapName: "Old map",
          updatedAt: "2026-06-01T00:00:00.000Z",
          logPreview: "Older note",
        },
      ],
    );
    expect(sessions[0]?.mapName).toBe("Tavern brawl");
    expect(sessions[0]?.label).toBe("Curse of Fog");
  });
});
