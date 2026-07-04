import { describe, expect, it } from "vitest";
import {
  clampFeetPerCell,
  DEFAULT_FEET_PER_CELL,
  formatFeetPerCell,
  formatTokenSizeOption,
  tokenCellFootprint,
} from "./gridScale";

describe("gridScale", () => {
  it("defaults to 5 ft squares", () => {
    expect(DEFAULT_FEET_PER_CELL).toBe(5);
    expect(clampFeetPerCell(undefined)).toBe(5);
    expect(clampFeetPerCell(99)).toBe(5);
  });

  it("accepts supported square sizes", () => {
    expect(clampFeetPerCell(10)).toBe(10);
  });

  it("formats square labels", () => {
    expect(formatFeetPerCell(5)).toBe("5 ft squares");
  });

  it("scales token footprint to grid square size", () => {
    expect(tokenCellFootprint(1, 5)).toBe(1);
    expect(tokenCellFootprint(2, 5)).toBe(2);
    expect(tokenCellFootprint(1, 10)).toBe(0.5);
    expect(tokenCellFootprint(2, 10)).toBe(1);
    expect(tokenCellFootprint(4, 10)).toBe(2);
  });

  it("formats token size labels with grid context", () => {
    expect(formatTokenSizeOption(1, 5)).toContain("Medium");
    expect(formatTokenSizeOption(1, 5)).toContain("1 sq");
    expect(formatTokenSizeOption(1, 10)).toContain("0.5");
  });
});
