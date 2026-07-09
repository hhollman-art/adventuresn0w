import { describe, expect, it } from "vitest";
import {
  pruneSpellsForLevel,
  validateCharacterSpellLevels,
} from "./characterLevelValidation";

describe("characterLevelValidation", () => {
  it("rejects level-3 spells on a level-1 wizard", () => {
    const result = validateCharacterSpellLevels({
      level: 1,
      className: "Wizard",
      knownSpellIds: ["fire-bolt", "magic-missile", "fireball"],
      preparedSpellIds: ["fireball"],
    });
    expect(result.ok).toBe(false);
    expect(result.allowedKnownIds).toContain("fire-bolt");
    expect(result.allowedKnownIds).toContain("magic-missile");
    expect(result.allowedKnownIds).not.toContain("fireball");
    expect(result.allowedPreparedIds).not.toContain("fireball");
  });

  it("prunes when level drops", () => {
    const pruned = pruneSpellsForLevel({
      level: 1,
      className: "Cleric",
      subclass: "",
      knownSpellIds: ["cure-wounds", "revivify"],
      preparedSpellIds: ["revivify"],
    });
    expect(pruned.knownSpellIds).toEqual(["cure-wounds"]);
    expect(pruned.preparedSpellIds).toEqual([]);
    expect(pruned.removed.length).toBeGreaterThan(0);
  });
});
