import { describe, expect, it } from "vitest";
import { parseCreateCustomArtifact } from "./itemArtifactSchema";
import { gameItemToLibraryEntry } from "@/lib/workshop/libraryCatalog";
import { gameItemToMarkdown, type SavedGameItem } from "./itemLibrary";
import { emptyBonuses } from "./tabletop/character";

describe("parseCreateCustomArtifact", () => {
  it("requires name and item type", () => {
    const missing = parseCreateCustomArtifact({
      name: "",
      itemType: "Ring",
      rarity: "rare",
      requiresAttunement: false,
    });
    expect(missing.ok).toBe(false);

    const ok = parseCreateCustomArtifact({
      name: "Ring of Sparks",
      itemType: "Ring",
      rarity: "rare",
      requiresAttunement: true,
      attunementNote: "while wearing",
      description: "Tiny sparks.",
      settingTags: ["Homebrew"],
      tags: ["lightning"],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.name).toBe("Ring of Sparks");
      expect(ok.data.rarity).toBe("rare");
    }
  });
});

describe("gameItemToLibraryEntry homebrew", () => {
  it("indexes Homebrew tag and search fields", () => {
    const item: SavedGameItem = {
      id: "a1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      kind: "magic",
      name: "Ring of Sparks",
      itemType: "Ring",
      rarity: "rare",
      requiresAttunement: true,
      attunementNote: "",
      description: "Tiny sparks leap from the band.",
      properties: "",
      charges: "3 charges",
      effects: "Cast spark",
      bonuses: emptyBonuses(),
      source: "created",
      isHomebrew: true,
      createdBy: "dm1",
      tags: ["lightning"],
      settingTags: ["Homebrew"],
      sourceNote: "Codex",
      imageDataUrl: null,
      instanceId: null,
      _source: null,
      sourceSrdEntityId: null,
    };
    const entry = gameItemToLibraryEntry(item);
    expect(entry.isHomebrew).toBe(true);
    expect(entry.tags).toContain("Homebrew");
    expect(entry.tags).toContain("lightning");
    expect(entry.detail).toContain("Ring");
    expect(gameItemToMarkdown(item)).toContain("## Charges");
  });
});
