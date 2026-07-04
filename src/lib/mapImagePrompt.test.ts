import { describe, expect, it } from "vitest";
import { buildMapImagePrompt } from "@/lib/mapImagePrompt";
import { defaultBattleGridNotesFallback } from "@/lib/tabletop/gridPresets";

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

  it("uses no printed grid for battle variant by default", () => {
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
    expect(p).toContain("No visible grid lines");
    expect(p).toContain("without a printed grid");
    expect(p).toContain(defaultBattleGridNotesFallback("imperial"));
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

  it("uses exact VTT grid dimensions when provided", () => {
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
        battleGridCols: 30,
        battleGridRows: 20,
      },
      "battle",
    );
    expect(p).toContain("30 columns × 20 rows");
    expect(p).toContain("draw no grid lines");
    expect(p).not.toContain("12–22 cells");
  });
});
