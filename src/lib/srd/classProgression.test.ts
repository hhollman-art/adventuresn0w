import { describe, expect, it } from "vitest";
import {
  canKnowSpellAtLevel,
  casterKindForClass,
  maxSpellLevelForCharacter,
  proficiencyBonusForLevel,
  spellSlotsForCharacter,
} from "./classProgression";

describe("classProgression", () => {
  it("matches SRD proficiency bonus column", () => {
    expect(proficiencyBonusForLevel(1)).toBe(2);
    expect(proficiencyBonusForLevel(5)).toBe(3);
    expect(proficiencyBonusForLevel(9)).toBe(4);
    expect(proficiencyBonusForLevel(17)).toBe(6);
  });

  it("blocks higher-tier spells for level 1 full casters", () => {
    expect(maxSpellLevelForCharacter(1, "Wizard")).toBe(1);
    expect(canKnowSpellAtLevel(1, "Wizard", "", 0)).toBe(true);
    expect(canKnowSpellAtLevel(1, "Wizard", "", 1)).toBe(true);
    expect(canKnowSpellAtLevel(1, "Wizard", "", 2)).toBe(false);
    expect(canKnowSpellAtLevel(1, "Wizard", "", 9)).toBe(false);
  });

  it("gives fighters without caster subclass no spellcasting", () => {
    expect(casterKindForClass("Fighter", "Champion")).toBe("none");
    expect(maxSpellLevelForCharacter(5, "Fighter", "Champion")).toBe(-1);
    expect(canKnowSpellAtLevel(5, "Fighter", "Champion", 1)).toBe(false);
  });

  it("unlocks Eldritch Knight third-caster slots at level 3", () => {
    expect(casterKindForClass("Fighter", "Eldritch Knight")).toBe("third");
    expect(maxSpellLevelForCharacter(2, "Fighter", "Eldritch Knight")).toBe(-1);
    expect(maxSpellLevelForCharacter(3, "Fighter", "Eldritch Knight")).toBe(1);
    expect(spellSlotsForCharacter(3, "Fighter", "Eldritch Knight")[1]).toBe(2);
  });

  it("half casters start slots at level 2", () => {
    expect(maxSpellLevelForCharacter(1, "Paladin")).toBe(-1);
    expect(maxSpellLevelForCharacter(2, "Paladin")).toBe(1);
    expect(spellSlotsForCharacter(5, "Ranger")[2]).toBe(2);
  });
});
