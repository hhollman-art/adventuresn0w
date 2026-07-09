import { describe, expect, it } from "vitest";
import {
  abilityMod,
  effectiveAc,
  effectiveInitiative,
  effectiveMaxHp,
  effectivePassivePerception,
  emptyBonuses,
  formatMod,
  passivePerception,
  proficiencyBonus,
  sumItemBonuses,
} from "./character";
import type { PlayerCharacter } from "./types";
describe("abilityMod", () => {
  it("matches the 5.2 modifier table", () => {
    expect(abilityMod(1)).toBe(-5);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(9)).toBe(-1);
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(11)).toBe(0);
    expect(abilityMod(12)).toBe(1);
    expect(abilityMod(15)).toBe(2);
    expect(abilityMod(20)).toBe(5);
    expect(abilityMod(30)).toBe(10);
  });
});

describe("formatMod", () => {
  it("adds an explicit sign", () => {
    expect(formatMod(3)).toBe("+3");
    expect(formatMod(0)).toBe("+0");
    expect(formatMod(-2)).toBe("-2");
  });
});

describe("proficiencyBonus", () => {
  it("steps every 4 levels", () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(8)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });

  it("clamps out-of-range levels", () => {
    expect(proficiencyBonus(0)).toBe(2);
    expect(proficiencyBonus(99)).toBe(6);
  });
});

describe("passivePerception", () => {
  it("is 10 plus the Wisdom modifier", () => {
    expect(
      passivePerception({ str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 }),
    ).toBe(12);
    expect(
      passivePerception({ str: 10, dex: 10, con: 10, int: 10, wis: 8, cha: 10 }),
    ).toBe(9);
  });
});

const basePlayer = (): PlayerCharacter => ({
  id: "p1",
  name: "Test",
  playerName: "",
  species: "",
  className: "",
  subclass: "",
  background: "",
  alignment: "",
  level: 5,
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 13, cha: 10 },
  ac: 14,
  maxHp: 32,
  speed: 30,
  notes: "",
  items: [],
  knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
  currentHp: null,
  tokenId: null,
});

describe("item bonuses", () => {
  it("stacks modifiers from multiple items", () => {
    const items = [
      {
        id: "i1",
        name: "Shield",
        notes: "",
        bonuses: { ...emptyBonuses(), ac: 2 },
      },
      {
        id: "i2",
        name: "Ring of Protection",
        notes: "",
        bonuses: { ...emptyBonuses(), ac: 1, maxHp: -2 },
      },
    ];
    expect(sumItemBonuses(items).ac).toBe(3);
    expect(sumItemBonuses(items).maxHp).toBe(-2);
  });

  it("applies item bonuses to effective combat stats", () => {
    const player = {
      ...basePlayer(),
      items: [
        {
          id: "i1",
          name: "Studded leather + shield",
          notes: "",
          bonuses: { ...emptyBonuses(), ac: 3, maxHp: 6, dex: 2, initiative: 1 },
        },
      ],
    };
    expect(effectiveAc(player)).toBe(17);
    expect(effectiveMaxHp(player)).toBe(38);
    expect(effectiveInitiative(player)).toBe(abilityMod(16) + 1);
    expect(effectivePassivePerception(player)).toBe(passivePerception(player.abilities));
  });

  it("supports negative item modifiers", () => {
    const player = {
      ...basePlayer(),
      items: [
        {
          id: "i1",
          name: "Exhaustion",
          notes: "",
          bonuses: { ...emptyBonuses(), maxHp: -5, speed: -10, dex: -2 },
        },
      ],
    };
    expect(effectiveMaxHp(player)).toBe(27);
    expect(formatMod(effectiveInitiative(player))).toBe(formatMod(abilityMod(12)));
  });
});