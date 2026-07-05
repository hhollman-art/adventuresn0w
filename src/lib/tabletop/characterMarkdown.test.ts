import { describe, expect, it } from "vitest";
import {
  characterFileName,
  characterToMarkdownFile,
  fileSlug,
  rosterToMarkdown,
} from "./characterMarkdown";
import { parseCharactersMarkdown } from "./parseCharactersMarkdown";
import type { PlayerCharacter } from "./types";

const PLAYER: Omit<PlayerCharacter, "tokenId"> = {
  id: "pc-1",
  name: "Aria Windrunner",
  playerName: "Sam",
  species: "Elf",
  className: "Wizard",
  subclass: "Evocation",
  background: "Sage",
  alignment: "Neutral Good",
  level: 4,
  abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
  ac: 13,
  maxHp: 24,
  speed: 30,
  notes: "Knows Fire Bolt and Shield\nAfraid of deep water",
  items: [
    {
      id: "i1",
      name: "Wand of the war mage",
      notes: "+1 spell attack",
      bonuses: {
        ac: 0,
        maxHp: 0,
        speed: 0,
        initiative: 0,
        passivePerception: 0,
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
      },
    },
  ],
  knownSpellIds: [],
  currentHp: 20,
};

describe("characterMarkdown", () => {
  it("round-trips a single character file through the parser", () => {
    const file = characterToMarkdownFile(PLAYER);
    const parsed = parseCharactersMarkdown(file);

    expect(parsed.rosterName).toBe("Aria Windrunner");
    expect(parsed.players).toHaveLength(1);
    const p = parsed.players[0]!;
    expect(p.name).toBe("Aria Windrunner");
    expect(p.className).toBe("Wizard");
    expect(p.level).toBe(4);
    expect(p.playerName).toBe("Sam");
    expect(p.species).toBe("Elf");
    expect(p.subclass).toBe("Evocation");
    expect(p.background).toBe("Sage");
    expect(p.alignment).toBe("Neutral Good");
    expect(p.ac).toBe(13);
    expect(p.maxHp).toBe(24);
    expect(p.speed).toBe(30);
    expect(p.abilities).toEqual(PLAYER.abilities);
    expect(p.notes).toContain("Wand of the war mage");
    expect(p.notes).toContain("Knows Fire Bolt and Shield");
  });

  it("round-trips a multi-character party document", () => {
    const second = { ...PLAYER, id: "pc-2", name: "Borin Stonehelm", className: "Fighter" };
    const md = rosterToMarkdown("The Company", [PLAYER, second]);
    const parsed = parseCharactersMarkdown(md);

    expect(parsed.rosterName).toBe("The Company");
    expect(parsed.players.map((p) => p.name)).toEqual([
      "Aria Windrunner",
      "Borin Stonehelm",
    ]);
  });

  it("builds safe file names", () => {
    expect(fileSlug("Aria Windrunner")).toBe("aria-windrunner");
    expect(fileSlug("Séraphine d'Été!")).toBe("seraphine-d-ete");
    expect(fileSlug("///")).toBe("character");
    expect(characterFileName(PLAYER)).toBe("aria-windrunner.md");
  });
});
