import { describe, expect, it } from "vitest";
import {
  ciClassFilterOptions,
  filterBrowseEntries,
  LIBRARY_CI_FANTASY_LABEL,
  matchesBrowseSearch,
} from "./libraryBrowseFilters";
import { seedToLibraryEntry } from "./libraryCatalog";
import { srdItemRefFromApi } from "@/lib/srd/srdItemRef";
import { srdItemToLibraryEntry } from "@/lib/workplace/srdItemCatalog";

describe("libraryBrowseFilters", () => {
  it("searches titles and fantasy kind labels", () => {
    const entry = seedToLibraryEntry({
      id: "s1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "adventure",
      titleHint: "Lost mine",
      briefDescription: "",
      markdown: "",
    });
    expect(matchesBrowseSearch(entry, "lost")).toBe(true);
    expect(matchesBrowseSearch(entry, "adventure hook")).toBe(true);
    expect(matchesBrowseSearch(entry, "realm")).toBe(false);
  });

  it("builds kind chips only for classes present on the shelf", () => {
    const entries = [
      seedToLibraryEntry({
        id: "s1",
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "realm",
        titleHint: "World",
        briefDescription: "",
        markdown: "",
      }),
      srdItemToLibraryEntry(srdItemRefFromApi("equipment", "longsword", "Longsword")),
    ];
    const seedOptions = ciClassFilterOptions("seeds", entries);
    expect(seedOptions.some((o) => o.ciClass === "seed.realm")).toBe(true);
    expect(seedOptions.some((o) => o.ciClass === "item.srd-equipment")).toBe(false);

    const itemOptions = ciClassFilterOptions("items", entries);
    expect(itemOptions.some((o) => o.ciClass === "item.srd-equipment")).toBe(true);
  });

  it("filters by provenance and ci class together", () => {
    const user = seedToLibraryEntry({
      id: "s1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "realm",
      titleHint: "Mine",
      briefDescription: "",
      markdown: "",
    });
    const srd = srdItemToLibraryEntry(srdItemRefFromApi("equipment", "dagger", "Dagger"));
    const filtered = filterBrowseEntries([user, srd], {
      search: "",
      ciClass: "item.srd-equipment",
      provenance: "included",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.ciClass).toBe("item.srd-equipment");
  });

  it("covers every registered ci class with a fantasy label", () => {
    for (const label of Object.values(LIBRARY_CI_FANTASY_LABEL)) {
      expect(label.length).toBeGreaterThan(2);
    }
  });
});
