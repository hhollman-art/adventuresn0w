import { describe, expect, it } from "vitest";
import { buildPremadeCharactersMessage } from "@/lib/characterPrompt";

describe("buildPremadeCharactersMessage", () => {
  it("includes per-PC class and race locks in the prompt", () => {
    const msg = buildPremadeCharactersMessage({
      partyConcept: "City watch",
      levelRange: "3",
      tone: "heroic",
      setting: "urban fantasy",
      characterCount: "2",
      extraNotes: "",
      characterSpecs: [
        { className: "Fighter", race: "Human" },
        { className: "Cleric", race: undefined },
      ],
    });
    expect(msg).toContain("PC 1: **Class** Fighter; **Race** Human");
    expect(msg).toContain("PC 2: **Class** Cleric; **Race** Any (your choice)");
  });
});
