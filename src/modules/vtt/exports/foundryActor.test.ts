import { describe, expect, it } from "vitest";
import type { PlayerCharacter } from "@/lib/tabletop/types";
import {
  exportFoundryActorFromPlayer,
  exportFoundryPartyBundle,
} from "./foundryActor";

const sampleHero: PlayerCharacter = {
  id: "hero-1",
  name: "Thornwick",
  playerName: "Alex",
  species: "Elf",
  className: "Wizard",
  subclass: "Evoker",
  background: "Sage",
  alignment: "Neutral Good",
  level: 5,
  abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 10, cha: 11 },
  ac: 13,
  maxHp: 28,
  speed: 30,
  notes: "Loves fireballs.",
  items: [
    {
      id: "item-1",
      name: "Robes of the Archmagi",
      notes: "Ceremonial",
      bonuses: { ac: 2, maxHp: 0, speed: 0, initiative: 0, passivePerception: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    },
  ],
  knownSpellIds: ["fireball"],
  preparedSpellIds: ["fireball"],
  linkedModifiers: [],
  currentHp: 22,
  tokenId: null,
};

describe("foundryActor export", () => {
  it("builds a dnd5e character actor with abilities, HP, and spells", () => {
    const actor = exportFoundryActorFromPlayer(sampleHero);
    expect(actor.name).toBe("Thornwick");
    expect(actor.type).toBe("character");
    expect(actor.system.abilities.int.value).toBe(18);
    expect(actor.system.attributes.hp.value).toBe(22);
    expect(actor.system.attributes.hp.max).toBe(28);
    expect(actor.system.attributes.ac.flat).toBe(15);
    expect(actor.system.details.race).toBe("Elf");
    expect(actor.system.details.level).toBe(5);
    expect(actor.items.some((item) => item.type === "class")).toBe(true);
    expect(actor.items.some((item) => item.name === "Fireball")).toBe(true);
    expect(actor.flags.ddeasy.characterId).toBe("hero-1");
  });

  it("wraps a party bundle with DMMS metadata", () => {
    const bundle = exportFoundryPartyBundle("Fellowship", [sampleHero]);
    expect(bundle.meta.platform).toBe("foundry");
    expect(bundle.data.partyName).toBe("Fellowship");
    expect(bundle.data.actors).toHaveLength(1);
    expect(bundle.data.actors[0]?.name).toBe("Thornwick");
  });
});
