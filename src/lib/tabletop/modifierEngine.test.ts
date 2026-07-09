import { describe, expect, it } from "vitest";
import { computeCharacterStats, modifiersFromItems } from "./modifierEngine";
import type { PlayerCharacter } from "./types";
import { emptyBonuses } from "./character";

function baseHero(overrides?: Partial<PlayerCharacter>): PlayerCharacter {
  return {
    id: "hero-1",
    name: "Test",
    playerName: "DM",
    species: "Human",
    className: "Fighter",
    subclass: "",
    background: "",
    alignment: "",
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 12, cha: 10 },
    ac: 16,
    maxHp: 12,
    speed: 30,
    notes: "",
    items: [],
    knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
    currentHp: null,
    tokenId: null,
    ...overrides,
  };
}

describe("modifierEngine", () => {
  it("applies equipped item ability penalties (curse)", () => {
    const hero = baseHero({
      items: [
        {
          id: "cursed-blade",
          name: "Cursed Blade",
          notes: "curse",
          bonuses: { ...emptyBonuses(), wis: -2 },
          equipped: true,
          sourceKind: "curse",
        },
      ],
    });
    const stats = computeCharacterStats(hero);
    expect(stats.abilities.wis.base).toBe(12);
    expect(stats.abilities.wis.bonus).toBe(-2);
    expect(stats.abilities.wis.score).toBe(10);
    expect(stats.abilities.wis.mod).toBe(0);
  });

  it("ignores unequipped items", () => {
    const hero = baseHero({
      items: [
        {
          id: "ring",
          name: "Ring of Protection",
          notes: "",
          bonuses: { ...emptyBonuses(), ac: 1 },
          equipped: false,
        },
      ],
    });
    expect(computeCharacterStats(hero).ac.total).toBe(16);
    expect(modifiersFromItems(hero.items)).toHaveLength(0);
  });

  it("stacks linked Creation File modifiers", () => {
    const hero = baseHero({
      linkedModifiers: [
        {
          id: "blessing-1",
          sourceKind: "blessing",
          sourceLabel: "Temple Blessing",
          sourceCfId: null,
          target: "str",
          value: 2,
          active: true,
        },
      ],
    });
    const stats = computeCharacterStats(hero);
    expect(stats.abilities.str.score).toBe(12);
    expect(stats.abilities.str.mod).toBe(1);
  });
});
