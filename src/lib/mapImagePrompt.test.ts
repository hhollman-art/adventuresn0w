import { describe, expect, it } from "vitest";
import { buildMapImagePrompt } from "@/lib/mapImagePrompt";
import { DEFAULT_BATTLE_GRID_NOTES_FALLBACK } from "@/lib/battleMapDirectives";

describe("buildMapImagePrompt", () => {
  it("includes full-color atlas guidance for locale variant", () => {
    const p = buildMapImagePrompt(
      {
        mapKind: "overland",
        locationName: "Y",
        levelRange: "",
        partySize: "",
        tone: "",
        context: "two continents and a sea",
        gridNotes: "",
        extraNotes: "",
      },
      "locale",
    );
    expect(p).toContain("full-color");
    expect(p).toContain("capital");
    expect(p).toMatch(/atlas|COLOR/i);
    expect(p).toMatch(/supercontinent|ocean gap/i);
    expect(p).toContain("route");
    expect(p).toMatch(/sans-serif|clean sans/i);
    expect(p).toMatch(/scale bar|Scale bar/i);
  });

  it("includes graph-paper battle guidance for battle variant (imperial default)", () => {
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
    expect(p).toContain("5 ft");
  });

  it("uses metric tactical grid when mapDistanceUnits is metric", () => {
    const p = buildMapImagePrompt(
      {
        mapKind: "battle",
        mapDistanceUnits: "metric",
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
    expect(p).toContain("1.5 m");
    expect(p).toMatch(/meter/);
  });

  it("uses metric scale bar wording for locale variant", () => {
    const p = buildMapImagePrompt(
      {
        mapKind: "overland",
        mapDistanceUnits: "metric",
        locationName: "Z",
        levelRange: "",
        partySize: "",
        tone: "",
        context: "archipelago trade",
        gridNotes: "",
        extraNotes: "",
      },
      "locale",
    );
    expect(p).toContain("kilometers");
    expect(p).toMatch(/continent|country/i);
  });
});
