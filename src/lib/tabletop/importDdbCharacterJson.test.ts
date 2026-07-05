import { describe, expect, it } from "vitest";
import {
  parseDdbPartyImport,
  resetDdbImportIdsForTests,
} from "./importDdbCharacterJson";

const SAMPLE_CHARACTER = {
  name: "Thorin Stonehelm",
  classes: [
    {
      level: 5,
      definition: { name: "Fighter" },
      subclassDefinition: { name: "Champion" },
    },
  ],
  race: { fullName: "Mountain Dwarf" },
  background: { definition: { name: "Soldier" } },
  stats: [
    { id: 1, value: 16 },
    { id: 2, value: 12 },
    { id: 3, value: 15 },
    { id: 4, value: 10 },
    { id: 5, value: 11 },
    { id: 6, value: 9 },
  ],
  baseHitPoints: 32,
  bonusHitPoints: 5,
  armorClass: 18,
  speed: { walk: 25 },
};

describe("parseDdbPartyImport", () => {
  it("parses a single character object", () => {
    resetDdbImportIdsForTests();
    const result = parseDdbPartyImport(JSON.stringify(SAMPLE_CHARACTER));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.players).toHaveLength(1);
    expect(result.players[0]?.name).toBe("Thorin Stonehelm");
    expect(result.players[0]?.className).toBe("Fighter 5");
    expect(result.players[0]?.subclass).toBe("Champion");
    expect(result.players[0]?.maxHp).toBe(37);
    expect(result.markdown).toContain("### Thorin Stonehelm");
    expect(result.markdown).toContain("Mountain Dwarf");
  });

  it("parses wrapped data and character arrays", () => {
    resetDdbImportIdsForTests();
    const wrapped = parseDdbPartyImport(JSON.stringify({ data: SAMPLE_CHARACTER }));
    expect(wrapped.ok).toBe(true);

    resetDdbImportIdsForTests();
    const list = parseDdbPartyImport(
      JSON.stringify({ name: "Campaign party", characters: [SAMPLE_CHARACTER, SAMPLE_CHARACTER] }),
    );
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.rosterName).toBe("Campaign party");
      expect(list.players).toHaveLength(2);
    }
  });

  it("returns a helpful error for invalid JSON", () => {
    const result = parseDdbPartyImport("{ not json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/valid JSON/i);
  });
});
