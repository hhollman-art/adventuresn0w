import { describe, expect, it } from "vitest";
import {
  buildPremadeCharactersMessage,
  buildSingleCharacterMessage,
} from "@/lib/characterPrompt";

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

describe("buildSingleCharacterMessage", () => {
  it("marks hand-set fields as locked and lists them", () => {
    const msg = buildSingleCharacterMessage({
      flavor: "A gruff ex-guard turned treasure hunter.",
      locks: {
        name: "Borin",
        className: "Fighter",
        level: 4,
        abilities: { str: 16, dex: 12, con: 15, int: 10, wis: 11, cha: 9 },
        gear: ["Longsword", "Company banner"],
        notes: "Owes a debt to a smuggler.",
      },
    });
    expect(msg).toContain("A gruff ex-guard turned treasure hunter.");
    expect(msg).toContain("- Name: **Borin** (locked — reproduce exactly)");
    expect(msg).toContain("- Class: **Fighter** (locked — reproduce exactly)");
    expect(msg).toContain("- Level: **4** (locked — reproduce exactly)");
    expect(msg).toContain("STR 16, DEX 12, CON 15, INT 10, WIS 11, CHA 9");
    expect(msg).toContain("Longsword; Company banner");
    expect(msg).toContain("do NOT repeat them");
  });

  it("says everything is open when nothing is locked and no flavor given", () => {
    const msg = buildSingleCharacterMessage({ flavor: "", locks: {} });
    expect(msg).toContain("(none — invent a compelling, playable character)");
    expect(msg).toContain("(nothing locked — every field is yours to fill)");
  });

  it("keeps the portable character markdown output format", () => {
    const msg = buildSingleCharacterMessage({ flavor: "x", locks: {} });
    expect(msg).toContain("## Characters");
    expect(msg).toContain("### <character name> — <class> (Level <n>)");
    expect(msg).toContain("- STR <n>, DEX <n>, CON <n>, INT <n>, WIS <n>, CHA <n>");
  });
});
