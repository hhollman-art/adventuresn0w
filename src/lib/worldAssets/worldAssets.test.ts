import { describe, expect, it } from "vitest";
import { fixSavedNpc } from "./npc";
import { fixSavedLocation } from "./location";
import { fixSavedSessionRecord } from "../sessions/record";

describe("fixSavedNpc", () => {
  it("accepts a minimal row", () => {
    const fixed = fixSavedNpc({ id: "n1", name: "Elara" });
    expect(fixed).toMatchObject({
      id: "n1",
      name: "Elara",
      briefDescription: "",
      tags: [],
      motivation: "",
      secrets: "",
      statBlockRef: null,
      locationId: null,
      factionIds: [],
      source: "import",
    });
  });

  it("rejects rows without id or name", () => {
    expect(fixSavedNpc(null)).toBeNull();
    expect(fixSavedNpc({ name: "Elara" })).toBeNull();
    expect(fixSavedNpc({ id: "n1", name: "  " })).toBeNull();
  });
});

describe("fixSavedLocation", () => {
  it("accepts a minimal row and defaults kind", () => {
    const fixed = fixSavedLocation({ id: "l1", name: "Whisperfen", locationKind: "city" });
    expect(fixed).toMatchObject({
      id: "l1",
      name: "Whisperfen",
      locationKind: "city",
      parentLocationId: null,
      inhabitantNpcIds: [],
      factionIds: [],
      source: "import",
    });
  });
});

describe("fixSavedSessionRecord", () => {
  it("accepts a minimal session log", () => {
    const fixed = fixSavedSessionRecord({
      id: "s1",
      campaignId: "c1",
      sessionNumber: 3,
      playedAt: "2026-07-01T00:00:00.000Z",
      summary: "The party found the vault.",
      events: [{ at: "21:00", kind: "clue", text: "A scratched rune on the door." }],
    });
    expect(fixed).toMatchObject({
      id: "s1",
      campaignId: "c1",
      sessionNumber: 3,
      summary: "The party found the vault.",
      events: [{ at: "21:00", kind: "clue", text: "A scratched rune on the door." }],
      followUpTasks: [],
      updatedCfIds: [],
    });
  });

  it("rejects invalid session numbers", () => {
    expect(
      fixSavedSessionRecord({
        id: "s1",
        campaignId: "c1",
        sessionNumber: 0,
        playedAt: "2026-07-01T00:00:00.000Z",
        summary: "",
        events: [],
      }),
    ).toBeNull();
  });
});
