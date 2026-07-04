import { describe, expect, it } from "vitest";
import {
  buildBattleMapGridNotes,
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
});
