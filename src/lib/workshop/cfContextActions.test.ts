import { describe, expect, it } from "vitest";
import { campaignLinkForTarget, type CfContextTarget } from "./cfContextActions";

function target(partial: Partial<CfContextTarget> & Pick<CfContextTarget, "ciClass" | "category">): CfContextTarget {
  return {
    id: "id-1",
    title: "Thorgar",
    provenance: "user",
    ...partial,
  };
}

describe("campaignLinkForTarget", () => {
  it("links a hero sheet by character id", () => {
    expect(
      campaignLinkForTarget(target({ ciClass: "character.sheet", category: "characters" })),
    ).toEqual({ characterId: "id-1" });
  });

  it("links a seed even if the category metadata is wrong", () => {
    expect(
      campaignLinkForTarget(target({ ciClass: "seed.adventure", category: "results" })),
    ).toEqual({ seedId: "id-1" });
  });

  it("refuses bundled SRD rows", () => {
    expect(
      campaignLinkForTarget(
        target({ ciClass: "spell.srd-entry", category: "rules", provenance: "srd" }),
      ),
    ).toBeNull();
  });
});
