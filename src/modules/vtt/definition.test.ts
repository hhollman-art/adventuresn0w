import { describe, expect, it } from "vitest";
import { VTT_MODULE, VTT_LIBRARY_READ_CI_CLASSES } from "@/modules/vtt/definition";

describe("VTT module", () => {
  it("declares library CMDB read classes for prep integration", () => {
    expect(VTT_MODULE.id).toBe("vtt");
    expect(VTT_MODULE.route).toBe("/table");
    expect(VTT_LIBRARY_READ_CI_CLASSES).toContain("party.roster");
    expect(VTT_LIBRARY_READ_CI_CLASSES).toContain("character.sheet");
    expect(VTT_LIBRARY_READ_CI_CLASSES).toContain("result.maps");
  });
});
