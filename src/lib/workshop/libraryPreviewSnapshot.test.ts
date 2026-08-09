import { describe, expect, it } from "vitest";
import { buildLibraryPreviewSnapshot } from "@/lib/workshop/libraryPreviewSnapshot";

describe("buildLibraryPreviewSnapshot", () => {
  it("builds an SRD loading snapshot before API text arrives", () => {
    const snapshot = buildLibraryPreviewSnapshot({
      selection: {
        kind: "srd",
        resource: "magic-items",
        index: "bag-of-holding",
        name: "Bag of Holding",
      },
      seeds: [],
      results: [],
      characters: [],
      items: [],
      parties: [],
      campaigns: [],
      npcs: [],
      locations: [],
      sessionRecords: [],
      srdPreviewLoading: true,
    });

    expect(snapshot?.isLibraryView).toBe(true);
    expect(snapshot?.isSrdPreview).toBe(true);
    expect(snapshot?.srdLoading).toBe(true);
    expect(snapshot?.viewingLabel).toContain("Bag of Holding");
    expect(snapshot?.ciClass).toBe("item.srd-magic");
    expect(snapshot?.markdown).toBe("");
  });

  it("builds markdown for a saved item selection", () => {
    const snapshot = buildLibraryPreviewSnapshot({
      selection: { kind: "item", id: "item-1" },
      seeds: [],
      results: [],
      characters: [],
      items: [
        {
          id: "item-1",
          name: "Sun Blade",
          kind: "magic",
          itemType: "martial weapon",
          source: "created",
          rarity: "rare",
          requiresAttunement: true,
          attunementNote: "",
          description: "A radiant sword.",
          properties: "",
          charges: "",
          effects: "",
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
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          isHomebrew: false,
          createdBy: null,
          tags: [],
          settingTags: [],
          sourceNote: "",
          imageDataUrl: null,
        },
      ],
      parties: [],
      campaigns: [],
      npcs: [],
      locations: [],
      sessionRecords: [],
    });

    expect(snapshot?.markdown).toContain("# Sun Blade");
    expect(snapshot?.markdown).toContain("radiant sword");
    expect(snapshot?.viewingLabel).toContain("Sun Blade");
    expect(snapshot?.ciClass).toBe("item.magic");
  });
});
