import { describe, expect, it } from "vitest";
import {
  addRevealed,
  allCells,
  brushCells,
  cellKey,
  clampTokenPosition,
  parseCellKey,
  removeRevealed,
} from "./grid";

describe("cell keys", () => {
  it("round-trips", () => {
    expect(parseCellKey(cellKey(3, 7))).toEqual({ x: 3, y: 7 });
  });

  it("rejects malformed keys", () => {
    expect(parseCellKey("3;7")).toBeNull();
    expect(parseCellKey("a,b")).toBeNull();
  });
});

describe("brushCells", () => {
  it("returns a single cell for radius 0", () => {
    expect(brushCells(2, 2, 0, 10, 10)).toEqual(["2,2"]);
  });

  it("returns a 3x3 square for radius 1", () => {
    expect(brushCells(2, 2, 1, 10, 10)).toHaveLength(9);
  });

  it("clips to the grid edges", () => {
    expect(brushCells(0, 0, 1, 10, 10)).toHaveLength(4);
    expect(brushCells(-5, -5, 1, 10, 10)).toHaveLength(0);
  });
});

describe("revealed set operations", () => {
  it("adds without duplicates and keeps identity when unchanged", () => {
    const base = ["0,0", "1,0"];
    expect(addRevealed(base, ["1,0", "2,0"])).toEqual(["0,0", "1,0", "2,0"]);
    expect(addRevealed(base, ["0,0"])).toBe(base);
  });

  it("removes keys and keeps identity when unchanged", () => {
    const base = ["0,0", "1,0"];
    expect(removeRevealed(base, ["1,0"])).toEqual(["0,0"]);
    expect(removeRevealed(base, ["9,9"])).toBe(base);
  });

  it("allCells covers the grid", () => {
    expect(allCells(3, 2)).toHaveLength(6);
  });
});

describe("clampTokenPosition", () => {
  it("keeps the footprint on the grid", () => {
    expect(clampTokenPosition(29.7, 5, 2, 30, 20, false)).toEqual({ x: 28, y: 5 });
    expect(clampTokenPosition(-3, -3, 1, 30, 20, false)).toEqual({ x: 0, y: 0 });
  });

  it("snaps to whole cells when requested", () => {
    expect(clampTokenPosition(4.6, 2.4, 1, 30, 20, true)).toEqual({ x: 5, y: 2 });
  });
});
