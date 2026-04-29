import { describe, expect, it } from "vitest";
import { buildMapImagePrompt } from "@/lib/mapImagePrompt";
import { DEFAULT_BATTLE_GRID_NOTES_FALLBACK } from "@/lib/battleMapDirectives";

describe("buildMapImagePrompt", () => {
  it("includes graph-paper battle guidance for battle variant", () => {
    const p = buildMapImagePrompt(
      {
        mapKind: "battle",
        locationName: "X",
        levelRange: "3",
        partySize: "4",
        tone: "grey",
        context: "fight in a room",
        gridNotes: "",
        extraNotes: "",
      },
      "battle",
    );
    expect(p).toContain("graph-paper");
    expect(p).toContain(DEFAULT_BATTLE_GRID_NOTES_FALLBACK);
  });
});
