import { describe, expect, it } from "vitest";
import { playerCharacterSchema } from "./handshake";
import { emptyBonuses } from "@/lib/tabletop/character";

function validCharacter() {
  return {
    id: "hero-1",
    name: "Aria",
    playerName: "Alex",
    species: "Elf",
    className: "Rogue",
    subclass: "Thief",
    background: "Urchin",
    alignment: "Chaotic Good",
    level: 5,
    abilities: { str: 8, dex: 18, con: 12, int: 14, wis: 13, cha: 10 },
    ac: 16,
    maxHp: 38,
    speed: 30,
    notes: "",
    items: [
      {
        id: "item-1",
        name: "Rapier",
        notes: "",
        bonuses: emptyBonuses(),
        equipped: true,
        _source: "SRD" as const,
        sourceSrdEntityId: "equipment:rapier",
      },
    ],
    knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
    currentHp: 32,
    tokenId: null,
    experiencePoints: 6500,
    inspiration: true,
    proficientSavingThrows: ["dex", "int"],
    skillProficiencies: ["acrobatics", "stealth"],
    otherProficiencies: "Thieves' tools; Elvish",
    temporaryHp: 4,
    hitDice: "5d8",
    deathSaveSuccesses: 1,
    deathSaveFailures: 0,
    attacks: [
      {
        id: "attack-1",
        name: "Rapier",
        attackBonus: "+7",
        damageType: "1d8+4 piercing",
      },
    ],
    currency: { cp: 1, sp: 2, ep: 3, gp: 40, pp: 5 },
    personalityTraits: "Always has a plan.",
    ideals: "Freedom",
    bonds: "My old crew",
    flaws: "Too curious",
    features: "Sneak Attack",
  };
}

describe("playerCharacterSchema", () => {
  it("preserves extended character-sheet fields for BYOD joins", () => {
    const parsed = playerCharacterSchema.parse(validCharacter());
    expect(parsed.skillProficiencies).toEqual(["acrobatics", "stealth"]);
    expect(parsed.attacks?.[0]?.name).toBe("Rapier");
    expect(parsed.currency?.gp).toBe(40);
    expect(parsed.items[0]?._source).toBe("SRD");
    expect(parsed.features).toBe("Sneak Attack");
  });

  it("uses the same level cap as PlayerCharacter normalization", () => {
    expect(() => playerCharacterSchema.parse({ ...validCharacter(), level: 21 })).toThrow();
  });
});
