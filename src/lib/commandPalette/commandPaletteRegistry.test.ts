import { describe, expect, it } from "vitest";
import {
  filterCommandPaletteItems,
  groupCommandPaletteItems,
  type CommandPaletteItem,
} from "@/lib/commandPalette/commandPaletteRegistry";

const SAMPLE: CommandPaletteItem[] = [
  {
    id: "a",
    label: "Jump to Live Combat",
    category: "workspaces",
    keywords: ["table", "vtt"],
    run: () => {},
  },
  {
    id: "b",
    label: "Create New NPC",
    category: "quick-creation",
    keywords: ["npc"],
    run: () => {},
  },
];

describe("filterCommandPaletteItems", () => {
  it("returns all items for an empty query", () => {
    expect(filterCommandPaletteItems(SAMPLE, "")).toHaveLength(2);
  });

  it("filters by label and keywords", () => {
    expect(filterCommandPaletteItems(SAMPLE, "vtt")).toHaveLength(1);
    expect(filterCommandPaletteItems(SAMPLE, "npc")).toHaveLength(1);
    expect(filterCommandPaletteItems(SAMPLE, "live combat")).toHaveLength(1);
  });
});

describe("groupCommandPaletteItems", () => {
  it("groups items in category order", () => {
    const groups = groupCommandPaletteItems(SAMPLE);
    expect(groups.map((group) => group.category)).toEqual(["workspaces", "quick-creation"]);
  });
});
