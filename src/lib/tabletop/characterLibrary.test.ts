import { describe, expect, it } from "vitest";
import {
  fixSavedCharacter,
  sortSavedCharacters,
  type SavedCharacter,
} from "./characterLibrary";
import { fixPlayer } from "./session";

function sample(over: {
  id: string;
  name: string;
  level?: number;
  className?: string;
  updatedAt?: string;
}): SavedCharacter {
  return {
    id: over.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: over.updatedAt ?? "2026-01-01T00:00:00.000Z",
    source: "created",
    player: fixPlayer({
      id: over.id,
      name: over.name,
      level: over.level ?? 1,
      className: over.className ?? "",
    })!,
  };
}

describe("fixSavedCharacter", () => {
  it("accepts a valid row and fills defaults on the sheet", () => {
    const fixed = fixSavedCharacter({
      id: "c1",
      source: "created",
      player: { id: "c1", name: "Aria" },
    });
    expect(fixed).not.toBeNull();
    expect(fixed!.id).toBe("c1");
    expect(fixed!.player.name).toBe("Aria");
    expect(fixed!.player.level).toBe(1);
    expect(fixed!.player.tokenId).toBeNull();
    expect(fixed!.source).toBe("created");
    expect(fixed!.createdAt).toBeTruthy();
    expect(fixed!.updatedAt).toBeTruthy();
  });

  it("forces the sheet id to match the record id", () => {
    const fixed = fixSavedCharacter({
      id: "c1",
      player: { id: "other", name: "Aria" },
    });
    expect(fixed!.player.id).toBe("c1");
  });

  it("rejects rows without an id or a named sheet", () => {
    expect(fixSavedCharacter(null)).toBeNull();
    expect(fixSavedCharacter({ player: { id: "x", name: "Aria" } })).toBeNull();
    expect(fixSavedCharacter({ id: "c1" })).toBeNull();
    expect(fixSavedCharacter({ id: "c1", player: { id: "c1", name: "  " } })).toBeNull();
  });

  it("normalizes unknown sources to import", () => {
    const fixed = fixSavedCharacter({
      id: "c1",
      source: "dndbeyond",
      player: { id: "c1", name: "Aria" },
    });
    expect(fixed!.source).toBe("import");
  });

  it("never keeps a token reference on a library sheet", () => {
    const fixed = fixSavedCharacter({
      id: "c1",
      player: { id: "c1", name: "Aria", tokenId: "tok-9" },
    });
    expect(fixed!.player.tokenId).toBeNull();
  });
});

describe("sortSavedCharacters", () => {
  const list = [
    sample({ id: "a", name: "Zora", level: 2, className: "Wizard", updatedAt: "2026-01-03T00:00:00.000Z" }),
    sample({ id: "b", name: "Aria", level: 5, className: "Ranger", updatedAt: "2026-01-01T00:00:00.000Z" }),
    sample({ id: "c", name: "Milo", level: 5, className: "Bard", updatedAt: "2026-01-02T00:00:00.000Z" }),
  ];

  it("sorts by recently updated by default", () => {
    expect(sortSavedCharacters(list, "updated").map((c) => c.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by name", () => {
    expect(sortSavedCharacters(list, "name").map((c) => c.player.name)).toEqual([
      "Aria",
      "Milo",
      "Zora",
    ]);
  });

  it("sorts by level, high first, then name", () => {
    expect(sortSavedCharacters(list, "level").map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by class, then name", () => {
    expect(sortSavedCharacters(list, "className").map((c) => c.id)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate the input list", () => {
    const before = list.map((c) => c.id);
    sortSavedCharacters(list, "name");
    expect(list.map((c) => c.id)).toEqual(before);
  });
});
