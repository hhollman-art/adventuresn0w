import { describe, expect, it } from "vitest";
import { parseSrdItemRefFromNotes } from "@/lib/srd/srdItemRef";

describe("parseSrdItemRefFromNotes", () => {
  it("parses gear notes written by character sheets", () => {
    expect(
      parseSrdItemRefFromNotes("srd-ref:equipment:longsword", "Longsword"),
    ).toEqual({
      resource: "equipment",
      index: "longsword",
      name: "Longsword",
    });
  });

  it("returns null for non-SRD notes", () => {
    expect(parseSrdItemRefFromNotes("requires attunement")).toBeNull();
  });
});
