import { describe, expect, it } from "vitest";
import { findSrdSpell, srdSpellsForClass } from "@/lib/srd";

describe("SRD spells", () => {
  it("finds spells by id", () => {
    expect(findSrdSpell("fire-bolt")?.name).toBe("Fire Bolt");
  });

  it("filters wizard spells", () => {
    const wizardSpells = srdSpellsForClass("Wizard");
    expect(wizardSpells.length).toBeGreaterThan(20);
    expect(wizardSpells.every((s) => s.classes.includes("wizard"))).toBe(true);
  });

  it("returns no spells for non-caster martial classes", () => {
    expect(srdSpellsForClass("Fighter")).toEqual([]);
  });
});
