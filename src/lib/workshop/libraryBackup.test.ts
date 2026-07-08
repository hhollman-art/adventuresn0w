import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  describeRestoreCounts,
  parseLibraryBackup,
  serializeLibraryBackup,
  suggestedBackupFilename,
  type LibraryBackupFile,
} from "@/lib/workshop/libraryBackup";

function sampleBackup(): LibraryBackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: "2026-07-04T12:00:00.000Z",
    seeds: [
      {
        id: "s1",
        createdAt: "2026-01-01T00:00:00.000Z",
        kind: "realm",
        realmSize: "region",
        seedName: "My realm",
        titleHint: "My realm",
        briefDescription: "",
        markdown: "# Realm",
      },
    ],
    results: [
      {
        id: "r1",
        createdAt: "2026-01-01T00:00:00.000Z",
        kind: "adventure",
        title: "Dungeon",
        markdown: "# Adventure",
        textModel: null,
        imageModel: null,
        images: [],
      },
    ],
    characters: [
      {
        id: "pc1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        source: "created",
        player: {
          id: "pc1",
          name: "Aria Windrunner",
          playerName: "",
          species: "Elf",
          className: "Ranger",
          subclass: "",
          background: "",
          alignment: "",
          level: 3,
          abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
          ac: 14,
          maxHp: 24,
          speed: 35,
          notes: "",
          items: [],
          knownSpellIds: [],
          currentHp: null,
          tokenId: null,
        },
      },
    ],
    items: [
      {
        id: "i1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        kind: "magic",
        name: "Cloak of Billowing",
        itemType: "Wondrous item",
        rarity: "common",
        requiresAttunement: false,
        description: "Billows dramatically on command.",
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
        source: "created",
      },
    ],
    parties: [],
    campaigns: [
      {
        id: "c1",
        name: "Thursday group",
        description: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        partyId: null,
        seedIds: ["s1"],
        resultIds: ["r1"],
        characterIds: [],
        itemIds: [],
      },
    ],
    relationshipGraphs: [
      {
        campaignId: "c1",
        version: 1,
        updatedAt: "2026-01-01T00:00:00.000Z",
        edges: [
          {
            id: "e1",
            rel: "linked_to",
            from: { kind: "cf", ciClass: "seed.realm", id: "s1" },
            to: { kind: "cf", ciClass: "result.adventure", id: "r1" },
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    ],
  };
}

describe("libraryBackup", () => {
  it("round-trips a backup through serialize + parse", () => {
    const parsed = parseLibraryBackup(serializeLibraryBackup(sampleBackup()));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.seeds).toHaveLength(1);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.characters).toHaveLength(1);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.parties).toHaveLength(0);
    expect(parsed.campaigns).toHaveLength(1);
    expect(parsed.relationshipGraphs).toHaveLength(1);
  });

  it("rejects non-JSON files", () => {
    const parsed = parseLibraryBackup("not json at all");
    expect(parsed).toEqual({ ok: false, error: "That file is not valid JSON." });
  });

  it("rejects JSON that is not a library backup", () => {
    const parsed = parseLibraryBackup(JSON.stringify({ hello: "world" }));
    expect(parsed.ok).toBe(false);
  });

  it("tolerates missing category arrays in old/partial backups", () => {
    const parsed = parseLibraryBackup(JSON.stringify({ format: BACKUP_FORMAT }));
    expect(parsed).toEqual({
      ok: true,
      seeds: [],
      results: [],
      characters: [],
      items: [],
      parties: [],
      campaigns: [],
      npcs: [],
      locations: [],
      sessionRecords: [],
      relationshipGraphs: [],
      customSrd: [],
    });
  });

  it("suggests a dated filename", () => {
    expect(suggestedBackupFilename(new Date("2026-07-04T12:00:00.000Z"))).toBe(
      "ddeasy-library-backup-2026-07-04.json",
    );
  });

  it("describes restore counts in plain language", () => {
    expect(
      describeRestoreCounts({
        seeds: 2,
        results: 1,
        characters: 3,
        items: 2,
        parties: 1,
        campaigns: 1,
        npcs: 0,
        locations: 0,
        sessionRecords: 0,
        relationshipGraphs: 0,
      }),
    ).toBe("Restored 2 CFs, 1 result, 3 characters, 2 items, 1 party, 1 campaign from backup.");
    expect(
      describeRestoreCounts({
        seeds: 0,
        results: 0,
        characters: 0,
        items: 0,
        parties: 0,
        campaigns: 0,
        npcs: 0,
        locations: 0,
        sessionRecords: 0,
        relationshipGraphs: 0,
      }),
    ).toBe("Backup read, but everything in it is already in your library.");
  });
});
