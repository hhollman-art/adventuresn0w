import { describe, expect, it, beforeEach } from "vitest";
import { fixSavedRoster } from "./characterRoster";
import {
  parseCharactersMarkdown,
  resetParseCharacterIdsForTests,
} from "./parseCharactersMarkdown";
import { fixPlayer } from "./session";

const SAMPLE = `# The Ember Company

## Characters

### Theron Blackwood — Fighter (Level 3)
- **Race:** Human
- **AC:** 18
- **HP:** 28
- **Speed:** 30 ft
- **Ability scores:** STR 16 (+3), DEX 12 (+1), CON 14 (+2), INT 10 (+0), WIS 13 (+1), CHA 8 (-1)
`;

describe("characterRoster persistence shape", () => {
  beforeEach(() => {
    resetParseCharacterIdsForTests();
  });

  it("parsed players survive fixPlayer normalization", () => {
    const { players } = parseCharactersMarkdown(SAMPLE);
    expect(players.length).toBeGreaterThan(0);
    for (const p of players) {
      const fixed = fixPlayer({
        ...p,
        tokenId: null,
        currentHp: p.currentHp ?? null,
        items: p.items ?? [],
      });
      expect(fixed).not.toBeNull();
      expect(fixed!.name).toBeTruthy();
    }
  });

  it("fixSavedRoster accepts stored roster rows", () => {
    const { rosterName, players } = parseCharactersMarkdown(SAMPLE);
    const row = {
      id: "test-id",
      name: rosterName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "workshop",
      notes: "",
      markdown: SAMPLE,
      players: players.map((p) => ({ ...p, tokenId: null, currentHp: null })),
    };
    const fixed = fixSavedRoster(row);
    expect(fixed).not.toBeNull();
    expect(fixed!.players).toHaveLength(1);
  });

  it("fixSavedRoster upgrades legacy rows without updatedAt or source", () => {
    const fixed = fixSavedRoster({
      id: "legacy",
      name: "Old party",
      createdAt: "2026-01-01T00:00:00.000Z",
      markdown: "",
      players: [],
    });
    expect(fixed).toMatchObject({
      id: "legacy",
      name: "Old party",
      source: "import",
      notes: "",
    });
  });
});
