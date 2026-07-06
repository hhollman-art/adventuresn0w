import { describe, expect, it } from "vitest";
import {
  filterLibraryEntries,
  partyToLibraryEntry,
  resultToLibraryEntry,
  seedToLibraryEntry,
  sortLibraryEntries,
  srdCatalogueSummary,
} from "@/lib/workshop/libraryCatalog";
import { srdItemRefFromApi } from "@/lib/srd/srdItemRef";
import { srdItemToLibraryEntry } from "@/lib/workplace/srdItemCatalog";
import type { LibraryItem } from "@/lib/generationLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";

describe("libraryCatalog", () => {
  it("maps seeds to user-owned entries", () => {
    const seed: SavedRealmSeed = {
      id: "s1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "realm",
      realmSize: "region",
      seedName: "My realm",
      titleHint: "My realm",
      briefDescription: "A test seed",
      markdown: "# Realm",
    };
    expect(seedToLibraryEntry(seed)).toMatchObject({
      ciClass: "seed.realm",
      category: "seeds",
      provenance: "user",
      origin: "creation",
      title: "My realm",
    });
  });

  it("maps generation results as user-owned creations", () => {
    const item: LibraryItem = {
      id: "r1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "adventure",
      title: "Dungeon",
      markdown: "# Adventure",
      textModel: "claude",
      imageModel: null,
      images: [],
    };
    expect(resultToLibraryEntry(item)).toMatchObject({
      ciClass: "result.adventure",
      provenance: "user",
      origin: "creation",
    });
  });

  it("maps imported parties as user-owned", () => {
    const roster = {
      id: "p1",
      name: "Party",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      source: "import",
      notes: "",
      markdown: "",
      players: [],
    } satisfies SavedCharacterRoster;
    expect(partyToLibraryEntry(roster)).toMatchObject({
      ciClass: "party.roster",
      provenance: "user",
      origin: "import",
    });
  });

  it("maps workshop-made parties as creations in the same tier", () => {
    const roster = {
      id: "p3",
      name: "Generated party",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      source: "workshop",
      notes: "",
      markdown: "",
      players: [],
    } satisfies SavedCharacterRoster;
    expect(partyToLibraryEntry(roster)).toMatchObject({
      provenance: "user",
      origin: "creation",
    });
  });

  it("maps D&D Beyond imports as user-owned", () => {
    const roster = {
      id: "p2",
      name: "Beyond party",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
      source: "dndbeyond",
      notes: "",
      markdown: "",
      players: [],
    } satisfies SavedCharacterRoster;
    expect(partyToLibraryEntry(roster)).toMatchObject({
      provenance: "user",
      origin: "import",
      kindLabel: "Your D&D Beyond import",
    });
  });

  it("filters by category", () => {
    const entries = [
      seedToLibraryEntry({
        id: "s1",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "realm",
        titleHint: "A",
        briefDescription: "",
        markdown: "x",
      }),
      resultToLibraryEntry({
        id: "r1",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "maps",
        title: "Map",
        markdown: "",
        textModel: null,
        imageModel: null,
        images: [],
      }),
    ];
    expect(filterLibraryEntries(entries, "seeds")).toHaveLength(1);
    expect(filterLibraryEntries(entries, "all")).toHaveLength(2);
  });

  it("reports bundled SRD counts", () => {
    const summary = srdCatalogueSummary();
    expect(summary.version).toBe("5.2.1");
    expect(summary.documentPdfId).toBe("SRD_CC_v5.2.1");
    expect(summary.apiCategoryCount).toBeGreaterThan(0);
    expect(summary.classCount).toBeGreaterThan(0);
    expect(summary.spellCount).toBeGreaterThan(100);
  });

  it("sorts user items newest first and SRD items alphabetically", () => {
    const sorted = sortLibraryEntries([
      srdItemToLibraryEntry(
        srdItemRefFromApi("equipment", "zweihander", "Zweihander"),
      ),
      seedToLibraryEntry({
        id: "new",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "realm",
        titleHint: "New",
        briefDescription: "",
        markdown: "",
      }),
      srdItemToLibraryEntry(
        srdItemRefFromApi("equipment", "abacus", "Abacus"),
      ),
    ]);
    expect(sorted[0]?.provenance).toBe("user");
    expect(sorted[1]?.title).toBe("Abacus");
    expect(sorted[2]?.title).toBe("Zweihander");
  });
});
