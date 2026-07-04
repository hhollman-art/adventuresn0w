import { describe, expect, it, beforeEach } from "vitest";
import {
  parseCharactersMarkdown,
  resetParseCharacterIdsForTests,
} from "./parseCharactersMarkdown";

const SAMPLE = `# The Ember Company

## One-paragraph pitch
A band of sellswords.

## Characters

### Theron Blackwood — Fighter (Level 3)
- **Race:** Human
- **Background:** Soldier
- **Alignment:** Lawful Good
- **Ability scores:** STR 16 (+3), DEX 12 (+1), CON 14 (+2), INT 10 (+0), WIS 13 (+1), CHA 8 (-1)
- **AC:** 18
- **HP:** 28
- **Speed:** 30 ft
- **Gear:** longsword, shield, chain mail

### Elara Moonwhisper — Cleric (Level 3)
- **Race:** Elf
- **Background:** Acolyte
- **Alignment:** Neutral Good
- **STR 10, DEX 14, CON 12, INT 13, WIS 16, CHA 11**
- **AC:** 16
- **HP:** 24
- **Speed:** 30 ft

## Party ties
They met in a tavern.

## DM note
Secret: Theron owes a debt.
`;

describe("parseCharactersMarkdown", () => {
  beforeEach(() => {
    resetParseCharacterIdsForTests();
  });

  it("extracts roster name and two characters", () => {
    const { rosterName, players } = parseCharactersMarkdown(SAMPLE);
    expect(rosterName).toBe("The Ember Company");
    expect(players).toHaveLength(2);
    expect(players[0]).toMatchObject({
      name: "Theron Blackwood",
      className: "Fighter",
      level: 3,
      species: "Human",
      background: "Soldier",
      alignment: "Lawful Good",
      ac: 18,
      maxHp: 28,
      speed: 30,
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
    });
    expect(players[1]).toMatchObject({
      name: "Elara Moonwhisper",
      className: "Cleric",
      species: "Elf",
      abilities: { wis: 16, dex: 14 },
    });
  });

  it("returns empty players when no character headings exist", () => {
    const { players } = parseCharactersMarkdown("# Empty\n\nNo PCs here.");
    expect(players).toHaveLength(0);
  });
});
