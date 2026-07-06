import { describe, expect, it } from "vitest";
import { FORGE_PRINCIPLES } from "./forgePrinciples";

describe("forgePrinciples", () => {
  it("lists unique product principles for the welcome hearth", () => {
    expect(FORGE_PRINCIPLES.length).toBeGreaterThanOrEqual(4);
    const ids = FORGE_PRINCIPLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(FORGE_PRINCIPLES.some((p) => p.id === "manual-first")).toBe(true);
    expect(FORGE_PRINCIPLES.some((p) => p.id === "library-heart")).toBe(true);
  });
});
