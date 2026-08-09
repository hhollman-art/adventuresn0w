import { describe, expect, it } from "vitest";
import {
  fixSavedGameItem,
  sortSavedGameItems,
  type SavedGameItem,
} from "./itemLibrary";
import { emptyBonuses } from "./tabletop/character";

function sample(over: {
  id: string;
  name: string;
  kind?: "equipment" | "magic";
  rarity?: SavedGameItem["rarity"];
  updatedAt?: string;
}): SavedGameItem {
  return {
    id: over.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: over.updatedAt ?? "2026-01-01T00:00:00.000Z",
    kind: over.kind ?? "equipment",
    name: over.name,
    itemType: "",
    rarity: over.kind === "magic" ? (over.rarity ?? null) : null,
    requiresAttunement: false,
    attunementNote: "",
    description: "",
    properties: "",
    charges: "",
    effects: "",
    bonuses: emptyBonuses(),
    source: "created",
    isHomebrew: false,
    createdBy: null,
    tags: [],
    settingTags: [],
    sourceNote: "",
    imageDataUrl: null,
  };
}

describe("fixSavedGameItem", () => {
  it("accepts a valid row and fills defaults", () => {
    const fixed = fixSavedGameItem({ id: "i1", name: "Rope (50 ft)" });
    expect(fixed).not.toBeNull();
    expect(fixed!.kind).toBe("equipment");
    expect(fixed!.rarity).toBeNull();
    expect(fixed!.requiresAttunement).toBe(false);
    expect(fixed!.bonuses).toEqual(emptyBonuses());
    expect(fixed!.source).toBe("import");
    expect(fixed!.isHomebrew).toBe(false);
    expect(fixed!.tags).toEqual([]);
    expect(fixed!.imageDataUrl).toBeNull();
  });

  it("keeps homebrew metadata and artwork", () => {
    const fixed = fixSavedGameItem({
      id: "i1",
      name: "Ember Crown",
      kind: "magic",
      rarity: "legendary",
      isHomebrew: true,
      createdBy: "dm1",
      tags: ["fire"],
      settingTags: ["Homebrew", "Realm"],
      sourceNote: "My codex",
      properties: "+1 AC",
      charges: "3",
      effects: "Burst of flame",
      imageDataUrl: "data:image/png;base64,abc",
    });
    expect(fixed!.isHomebrew).toBe(true);
    expect(fixed!.createdBy).toBe("dm1");
    expect(fixed!.settingTags).toContain("Homebrew");
    expect(fixed!.imageDataUrl).toBe("data:image/png;base64,abc");
  });

  it("rejects rows without an id or name", () => {
    expect(fixSavedGameItem(null)).toBeNull();
    expect(fixSavedGameItem({ name: "Rope" })).toBeNull();
    expect(fixSavedGameItem({ id: "i1", name: "   " })).toBeNull();
  });

  it("keeps rarity and attunement only on magic items", () => {
    const magic = fixSavedGameItem({
      id: "i1",
      name: "Flame Tongue",
      kind: "magic",
      rarity: "rare",
      requiresAttunement: true,
    });
    expect(magic!.rarity).toBe("rare");
    expect(magic!.requiresAttunement).toBe(true);

    const gear = fixSavedGameItem({
      id: "i2",
      name: "Longsword",
      kind: "equipment",
      rarity: "rare",
      requiresAttunement: true,
    });
    expect(gear!.rarity).toBeNull();
    expect(gear!.requiresAttunement).toBe(false);
  });

  it("normalizes unknown kinds, rarities, and bonus values", () => {
    const fixed = fixSavedGameItem({
      id: "i1",
      name: "Odd thing",
      kind: "cursed",
      rarity: "mythic",
      bonuses: { ac: "2", maxHp: 1000, str: "not a number" },
    });
    expect(fixed!.kind).toBe("equipment");
    expect(fixed!.rarity).toBeNull();
    expect(fixed!.bonuses.ac).toBe(2);
    expect(fixed!.bonuses.maxHp).toBe(99);
    expect(fixed!.bonuses.str).toBe(0);
  });
});

describe("sortSavedGameItems", () => {
  const list = [
    sample({ id: "a", name: "Zephyr Blade", kind: "magic", rarity: "legendary", updatedAt: "2026-01-01T00:00:00.000Z" }),
    sample({ id: "b", name: "Apple", kind: "equipment", updatedAt: "2026-01-03T00:00:00.000Z" }),
    sample({ id: "c", name: "Mirror of Echoes", kind: "magic", rarity: "uncommon", updatedAt: "2026-01-02T00:00:00.000Z" }),
  ];

  it("sorts by recently updated by default", () => {
    expect(sortSavedGameItems(list, "updated").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by name", () => {
    expect(sortSavedGameItems(list, "name").map((i) => i.name)).toEqual([
      "Apple",
      "Mirror of Echoes",
      "Zephyr Blade",
    ]);
  });

  it("sorts by kind with equipment first", () => {
    expect(sortSavedGameItems(list, "kind")[0].id).toBe("b");
  });

  it("sorts by rarity, high first, with equipment last", () => {
    expect(sortSavedGameItems(list, "rarity").map((i) => i.id)).toEqual(["a", "c", "b"]);
  });
});
