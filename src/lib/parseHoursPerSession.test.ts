import { describe, expect, it } from "vitest";
import {
  normalizeHoursPerSession,
  parseHoursPerSession,
} from "./parseHoursPerSession";

describe("parseHoursPerSession", () => {
  it("defaults on non-finite input", () => {
    expect(parseHoursPerSession(undefined)).toBe(3);
    expect(parseHoursPerSession("nope")).toBe(3);
    expect(parseHoursPerSession(Number.NaN)).toBe(3);
  });

  it("snaps to half-hour steps without IEEE artifacts", () => {
    expect(parseHoursPerSession(3.5)).toBe(3.5);
    expect(parseHoursPerSession(3.5000000000000004)).toBe(3.5);
    expect(parseHoursPerSession(2.74)).toBe(2.5);
    expect(parseHoursPerSession(2.76)).toBe(3);
    expect(Object.is(parseHoursPerSession(3.5), 3.5)).toBe(true);
    // String form must not retain trailing binary noise.
    expect(String(parseHoursPerSession(1.15 * 3))).not.toMatch(/000000/);
  });

  it("clamps to 0.5–12", () => {
    expect(parseHoursPerSession(0)).toBe(0.5);
    expect(parseHoursPerSession(0.1)).toBe(0.5);
    expect(parseHoursPerSession(99)).toBe(12);
  });

  it("accepts numeric strings", () => {
    expect(parseHoursPerSession("4")).toBe(4);
    expect(parseHoursPerSession("3.5")).toBe(3.5);
  });
});

describe("normalizeHoursPerSession", () => {
  it("matches parseHoursPerSession for numbers", () => {
    expect(normalizeHoursPerSession(3.5000000000000004)).toBe(3.5);
  });
});
