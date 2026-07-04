import { describe, expect, it } from "vitest";
import {
  buildBattleMapGridNotes,
  buildBattleMapScenePromptLead,
  clampVttGridSize,
  imageSizeForVttGrid,
  VTT_GRID_PRESETS,
} from "@/lib/tabletop/gridPresets";

describe("gridPresets", () => {
  it("lists VTT presets including the session default", () => {
    expect(VTT_GRID_PRESETS.some((p) => p.cols === 30 && p.rows === 20)).toBe(true);
  });

  it("builds grid notes without printed lines", () => {
    const notes = buildBattleMapGridNotes(30, 20, "imperial");
    expect(notes).toContain("30 columns × 20 rows");
    expect(notes).toContain("No visible grid lines");
  });

  it("clamps custom grid dimensions", () => {
    expect(clampVttGridSize(2, 200).cols).toBe(4);
    expect(clampVttGridSize(2, 200).rows).toBe(100);
  });

  it("picks the closest image aspect for a VTT grid", () => {
    expect(imageSizeForVttGrid(30, 20)).toBe("1536x1024"); // 1.5 exact
    expect(imageSizeForVttGrid(20, 15)).toBe("1536x1024"); // 1.33 → closer to 1.5
    expect(imageSizeForVttGrid(22, 20)).toBe("1024x1024"); // 1.1 → closer to 1.0
    expect(imageSizeForVttGrid(20, 20)).toBe("1024x1024");
    expect(imageSizeForVttGrid(20, 30)).toBe("1024x1536"); // 0.67 exact
    expect(imageSizeForVttGrid(20, 24)).toBe("1024x1024"); // 0.83 → closer to 1.0
  });

  it("scene prompt lead enforces object scale and no borders", () => {
    const lead = buildBattleMapScenePromptLead(30, 20, "imperial");
    expect(lead).toContain("5 ft × 5 ft");
    expect(lead).toContain("human fills one square");
    expect(lead).toContain("bleed to all four edges");
  });
});
