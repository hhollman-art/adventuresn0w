import { describe, expect, it } from "vitest";
import {
  parseSrdItemEntryId,
  srdItemEntryId,
  srdItemToLibraryEntry,
} from "./srdItemCatalog";
import { srdItemRefFromApi } from "@/lib/srd/srdItemRef";

describe("srdItemCatalog", () => {
  it("builds stable entry ids and round-trips them", () => {
    const ref = srdItemRefFromApi("equipment", "longsword", "Longsword");
    const id = srdItemEntryId(ref);
    expect(id).toBe("srd-item:equipment:longsword");
    expect(parseSrdItemEntryId(id)).toMatchObject({
      resource: "equipment",
      index: "longsword",
    });
  });

  it("maps SRD items to library entries with srd provenance", () => {
    const ref = srdItemRefFromApi("magic-items", "bag-of-holding", "Bag of Holding");
    const entry = srdItemToLibraryEntry(ref);
    expect(entry).toMatchObject({
      id: "srd-item:magic-items:bag-of-holding",
      ciClass: "item.srd-magic",
      category: "items",
      provenance: "srd",
      title: "Bag of Holding",
    });
    expect(entry.origin).toBeUndefined();
    expect(entry.srdItemRef).toEqual(ref);
  });
});
