import { describe, expect, it } from "vitest";
import { allSpellsValid, validateSpellReference } from "@/lib/srd/spellValidation";

describe("spellValidation", () => {
  it("accepts bundled spell ids", () => {
    const result = validateSpellReference("fireball");
    expect(result.valid).toBe(true);
    expect(result.name).toBe("Fireball");
    expect(result.entityId).toBe("spell:fireball");
  });

  it("accepts spell entity ids", () => {
    const result = validateSpellReference("spell:fireball");
    expect(result.valid).toBe(true);
    expect(result.normalizedId).toBe("fireball");
  });

  it("rejects unknown spells", () => {
    const result = validateSpellReference("not-a-real-spell-xyz");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("not in the bundled SRD");
  });

  it("validates hero spell lists", () => {
    expect(allSpellsValid(["fireball", "shield"])).toBe(true);
    expect(allSpellsValid(["fireball", "fake-spell"])).toBe(false);
  });
});
