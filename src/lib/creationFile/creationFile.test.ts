import { describe, expect, it } from "vitest";
import {
  cfTypeForCiClass,
  characterToCreationFile,
  createCreationFile,
  defaultCiClassForCfType,
  fixCreationFile,
  libraryEntryToCreationFile,
  seedToCreationFile,
} from "@/lib/creationFile";
import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedRealmSeed } from "@/lib/realmSeeds";

describe("creationFile map", () => {
  it("maps CMDB classes to workspace CFTypes", () => {
    expect(cfTypeForCiClass("character.sheet")).toBe("character");
    expect(cfTypeForCiClass("monster.srd-entry")).toBe("monster");
    expect(cfTypeForCiClass("item.magic")).toBe("item");
    expect(cfTypeForCiClass("spell.srd-entry")).toBe("spell");
    expect(cfTypeForCiClass("seed.maps")).toBe("map");
    expect(cfTypeForCiClass("result.adventure")).toBe("adventure");
    expect(cfTypeForCiClass("encounter.record")).toBe("encounter");
  });

  it("leaves non-card CMDB classes unmapped", () => {
    expect(cfTypeForCiClass("party.roster")).toBeNull();
    expect(cfTypeForCiClass("campaign.record")).toBeNull();
    expect(cfTypeForCiClass("seed.realm")).toBeNull();
  });

  it("picks a default ciClass per CFType", () => {
    expect(defaultCiClassForCfType("character")).toBe("character.sheet");
    expect(defaultCiClassForCfType("encounter")).toBe("encounter.record");
  });
});

describe("fixCreationFile", () => {
  it("normalizes a valid card", () => {
    const card = fixCreationFile({
      id: "cf-1",
      type: "item",
      ciClass: "item.equipment",
      title: "Lantern",
      subtitle: "Adventuring gear",
      tags: ["gear", "gear"],
      data: { weight: "2 lb" },
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: 1_700_000_000_000,
    });
    expect(card).not.toBeNull();
    expect(card!.tags).toEqual(["gear"]);
    expect(card!.createdAt).toBe(Date.parse("2026-01-02T00:00:00.000Z"));
    expect(card!.updatedAt).toBe(1_700_000_000_000);
  });

  it("rejects type/ciClass mismatches", () => {
    expect(
      fixCreationFile({
        id: "x",
        type: "character",
        ciClass: "item.magic",
        title: "Nope",
        tags: [],
        data: {},
        createdAt: 1,
        updatedAt: 1,
      }),
    ).toBeNull();
  });

  it("createCreationFile fills defaults", () => {
    const card = createCreationFile({ type: "adventure", title: "The Lost Mine" });
    expect(card.ciClass).toBe("seed.adventure");
    expect(card.tags).toEqual([]);
    expect(card.data).toEqual({});
    expect(card.createdAt).toBeTypeOf("number");
  });
});

describe("adapters", () => {
  it("projects library entries that map to a CFType", () => {
    const entry: LibraryListEntry = {
      id: "spell-1",
      ciClass: "spell.srd-entry",
      category: "rules",
      provenance: "srd",
      kindLabel: "Spell",
      title: "Fireball",
      detail: "Evocation · Level 3",
      createdAt: "2026-02-01T12:00:00.000Z",
      spellLevel: 3,
      srdEntityId: "spell:fireball",
    };
    const card = libraryEntryToCreationFile(entry);
    expect(card?.type).toBe("spell");
    expect(card?.subtitle).toBe("Evocation · Level 3");
    expect(card?.tags).toContain("Level 3");
    expect(card?.data.srdEntityId).toBe("spell:fireball");
  });

  it("returns null for party library rows", () => {
    const entry: LibraryListEntry = {
      id: "party-1",
      ciClass: "party.roster",
      category: "parties",
      provenance: "user",
      origin: "creation",
      kindLabel: "Party",
      title: "The Brave",
      detail: "4 heroes",
      createdAt: "2026-02-01T12:00:00.000Z",
    };
    expect(libraryEntryToCreationFile(entry)).toBeNull();
  });

  it("adapts character sheets", () => {
    const character: SavedCharacter = {
      id: "hero-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
      source: "created",
      player: {
        id: "hero-1",
        name: "Aria",
        playerName: "Sam",
        species: "Human",
        className: "Paladin",
        subclass: "",
        background: "Noble",
        alignment: "LG",
        level: 5,
        abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
        ac: 18,
        maxHp: 44,
        speed: 30,
        notes: "",
        items: [],
        knownSpellIds: [],
        preparedSpellIds: [],
        linkedModifiers: [],
        currentHp: null,
        tokenId: null,
      },
    };
    const card = characterToCreationFile(character);
    expect(card.type).toBe("character");
    expect(card.title).toBe("Aria");
    expect(card.ciClass).toBe("character.sheet");
    expect(card.updatedAt).toBe(Date.parse("2026-01-05T00:00:00.000Z"));
  });

  it("adapts adventure seeds but not realm seeds", () => {
    const adventure: SavedRealmSeed = {
      id: "seed-adv",
      createdAt: "2026-03-01T00:00:00.000Z",
      kind: "adventure",
      titleHint: "Dungeon crawl",
      briefDescription: "Goblin caves",
      markdown: "# Goblin caves",
      tags: ["cave"],
    };
    const realm: SavedRealmSeed = {
      id: "seed-realm",
      createdAt: "2026-03-01T00:00:00.000Z",
      kind: "realm",
      titleHint: "Kingdom",
      briefDescription: "A coastal realm",
      markdown: "# Realm",
    };
    expect(seedToCreationFile(adventure)?.type).toBe("adventure");
    expect(seedToCreationFile(realm)).toBeNull();
  });
});
