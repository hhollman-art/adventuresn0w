import { describe, expect, it } from "vitest";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import { exportRoll20CharacterFromPlayer } from "./roll20Character";

const sampleHero: PlayerCharacter = {
  id: "hero-2",
  name: "Mira",
  playerName: "Jordan",
  species: "Human",
  className: "Fighter",
  subclass: "",
  background: "Soldier",
  alignment: "Lawful Good",
  level: 3,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 9 },
  ac: 18,
  maxHp: 30,
  speed: 30,
  notes: "",
  items: [],
  knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
  currentHp: null,
  tokenId: null,
};

describe("roll20Character export", () => {
  it("maps hero stats to D&D 5E by Roll20 attribute rows", () => {
    const sheet = exportRoll20CharacterFromPlayer(sampleHero);
    expect(sheet.name).toBe("Mira");
    expect(sheet.inittoken).toBe(true);
    const byName = Object.fromEntries(sheet.attributes.map((a) => [a.name, a.current]));
    expect(byName.character_name).toBe("Mira");
    expect(byName.strength).toBe("16");
    expect(byName.strength_mod).toBe("+3");
    expect(byName.ac).toBe("18");
    expect(byName.hp_max).toBe("30");
    expect(byName.npc).toBe("0");
  });
});
