import { describe, expect, it } from "vitest";
import {
  previewAiHeroesFromMarkdown,
  structureAiHero,
} from "./instantiateAiHeroes";
import type { PlayerCharacter } from "./types";
import { emptyBonuses } from "./character";

const TWO_HERO_MD = `# Fellowship

## Characters

### Mira the Bright
- **Class:** Wizard
- **Race:** Elf
- **Level:** 1

### Torin Stonefist
- **Class:** Fighter
- **Race:** Dwarf
- **Level:** 2
`;

function baseHero(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    id: "hero-1",
    name: "Mira",
    playerName: "",
    species: "Elf",
    className: "Wizard",
    subclass: "",
    background: "Sage",
    alignment: "Neutral Good",
    level: 1,
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
    ac: 12,
    maxHp: 8,
    speed: 30,
    notes: "Spells: Fire Bolt, Magic Missile, Fireball\nGear: Quarterstaff — oak",
    items: [],
    knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
    currentHp: null,
    tokenId: null,
    ...overrides,
  };
}

describe("structureAiHero", () => {
  it("hydrates legal spells and strips illegal high-level ones", () => {
    const structured = structureAiHero(baseHero());
    expect(structured.knownSpellIds).toContain("fire-bolt");
    expect(structured.knownSpellIds).toContain("magic-missile");
    expect(structured.knownSpellIds).not.toContain("fireball");
    expect(structured.items.some((i) => i.name === "Quarterstaff")).toBe(true);
  });

  it("keeps empty bonuses shape on gear", () => {
    const structured = structureAiHero(baseHero());
    const staff = structured.items.find((i) => i.name === "Quarterstaff");
    expect(staff?.bonuses).toEqual(emptyBonuses());
  });
});

describe("previewAiHeroesFromMarkdown", () => {
  it("lists heroes with stable indices for Scry Window checkboxes", () => {
    const { heroes } = previewAiHeroesFromMarkdown(TWO_HERO_MD);
    expect(heroes).toHaveLength(2);
    expect(heroes[0]?.index).toBe(0);
    expect(heroes[0]?.name).toMatch(/Mira/i);
    expect(heroes[1]?.index).toBe(1);
    expect(heroes[1]?.name).toMatch(/Torin/i);
  });
});
