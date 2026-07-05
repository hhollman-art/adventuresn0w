import { describe, expect, it } from "vitest";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import {
  combineLabeledSeedMarkdown,
  combineSavedSeedMarkdown,
  pruneSeedIds,
} from "@/lib/seedReference";

const seedA: SavedRealmSeed = {
  id: "a",
  createdAt: "2026-01-01T00:00:00.000Z",
  kind: "realm",
  realmSize: "region",
  titleHint: "Ash Coast",
  briefDescription: "Salt marshes",
  markdown: "# Ash Coast\n\n## Factions\n\nSalt Merchants.",
};

const seedB: SavedRealmSeed = {
  id: "b",
  createdAt: "2026-01-02T00:00:00.000Z",
  kind: "adventure",
  titleHint: "Harbor Raid",
  briefDescription: "One-shot",
  markdown: "# Harbor Raid\n\n## Hook\n\nSmugglers at the docks.",
};

describe("seedReference", () => {
  it("returns a single seed unchanged", () => {
    expect(
      combineSavedSeedMarkdown([seedA, seedB], ["a"]),
    ).toBe("# Ash Coast\n\n## Factions\n\nSalt Merchants.");
  });

  it("combines multiple seeds with labeled sections", () => {
    const md = combineSavedSeedMarkdown([seedA, seedB], ["a", "b"]);
    expect(md).toContain("Attached sources (2 documents)");
    expect(md).toContain("### Source 1:");
    expect(md).toContain("Ash Coast");
    expect(md).toContain("### Source 2:");
    expect(md).toContain("Harbor Raid");
  });

  it("preserves selection order", () => {
    const md = combineSavedSeedMarkdown([seedA, seedB], ["b", "a"]);
    const first = md?.indexOf("Harbor Raid") ?? -1;
    const second = md?.indexOf("Ash Coast") ?? -1;
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it("prunes missing seed ids", () => {
    expect(pruneSeedIds(["a", "missing", "b"], [seedA, seedB])).toEqual([
      "a",
      "b",
    ]);
  });

  it("combines labeled parts directly", () => {
    const md = combineLabeledSeedMarkdown([
      { label: "Realm", markdown: "# One" },
      { label: "Adventure", markdown: "# Two" },
    ]);
    expect(md).toContain("Attached sources (2 documents)");
  });
});
