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

  it("embeds optional source seed markdown as reference context", () => {
    const msg = buildPremadeCharactersMessage({
      partyConcept: "Harbor guild",
      levelRange: "5",
      tone: "gritty",
      setting: "",
      characterCount: "4",
      extraNotes: "",
      sourceSeedMarkdown: "# Ash Coast\n\n## Factions\n\nSalt Merchants Guild.",
    });
    expect(msg).toContain("Source material (saved D&DEasy seed)");
    expect(msg).toContain("Salt Merchants Guild");
  });

  it("accepts combined multi-seed reference markdown", () => {
    const msg = buildPremadeCharactersMessage({
      partyConcept: "Mixed party",
      levelRange: "3",
      tone: "heroic",
      setting: "",
      characterCount: "3",
      extraNotes: "",
      sourceSeedMarkdown:
        "## Attached sources (2 documents)\n\n---\n\n### Source 1: Realm\n\n# Coast\n\n---\n\n### Source 2: Adventure\n\n# Raid",
    });
    expect(msg).toContain("one or more saved seeds");
    expect(msg).toContain("Attached sources (2 documents)");
  });
});
