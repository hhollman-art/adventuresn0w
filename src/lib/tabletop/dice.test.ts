import { describe, expect, it } from "vitest";
import { parseDiceExpression, rollDice } from "./dice";

/** Deterministic random source returning the given values in order. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("parseDiceExpression", () => {
  it("parses simple dice", () => {
    expect(parseDiceExpression("2d6")).toEqual([
      { kind: "dice", sign: 1, count: 2, sides: 6 },
    ]);
  });

  it("defaults omitted count to 1", () => {
    expect(parseDiceExpression("d20")).toEqual([
      { kind: "dice", sign: 1, count: 1, sides: 20 },
    ]);
  });

  it("parses mixed dice and flat modifiers with signs and spaces", () => {
    expect(parseDiceExpression("1d8 + 2d4 - 1")).toEqual([
      { kind: "dice", sign: 1, count: 1, sides: 8 },
      { kind: "dice", sign: 1, count: 2, sides: 4 },
      { kind: "flat", sign: -1, value: 1 },
    ]);
  });

  it("rejects garbage", () => {
    expect(parseDiceExpression("")).toBeNull();
    expect(parseDiceExpression("hello")).toBeNull();
    expect(parseDiceExpression("2d")).toBeNull();
    expect(parseDiceExpression("2d6+")).toBeNull();
    expect(parseDiceExpression("d1")).toBeNull(); // fewer than 2 sides
    expect(parseDiceExpression("101d6")).toBeNull(); // too many dice
  });
});

describe("rollDice", () => {
  it("totals dice and modifiers", () => {
    // random() -> 0 makes every die roll a 1.
    const result = rollDice("2d6+3", () => 0);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(5);
    expect(result!.expression).toBe("2d6 + 3");
    expect(result!.detail).toBe("2d6 [1, 1] + 3");
  });

  it("respects the random source", () => {
    // 0.999... -> max face value.
    const result = rollDice("1d20", seq(0.9999));
    expect(result!.total).toBe(20);
  });

  it("handles subtraction", () => {
    const result = rollDice("1d4-2", () => 0);
    expect(result!.total).toBe(-1);
  });

  it("returns null for invalid input", () => {
    expect(rollDice("nope")).toBeNull();
  });
});
