import { describe, expect, it } from "vitest";
import {
  defaultTagsForGeneratedSeed,
  normalizeSeedTags,
  parseSeedTagsInput,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import {
  collectSeedTags,
  filterSeeds,
  WORKSHOP_TAB_SEED_KINDS,
} from "@/lib/seedTags";

const sampleSeeds: SavedRealmSeed[] = [
  {
    id: "1",
    createdAt: "2026-01-01T00:00:00.000Z",
    kind: "realm",
    realmSize: "city",
    seedName: "Port Ash",
    titleHint: "Port Ash",
    briefDescription: "Harbor city",
    markdown: "# Port Ash",
    tags: ["city", "campaign"],
  },
  {
    id: "2",
    createdAt: "2026-01-02T00:00:00.000Z",
    kind: "adventure",
    seedName: "Dock raid",
    titleHint: "Dock raid",
    briefDescription: "One-shot",
    markdown: "# Dock raid",
    tags: ["one-shot", "campaign"],
  },
  {
    id: "3",
    createdAt: "2026-01-03T00:00:00.000Z",
    kind: "characters",
    seedName: "Watch party",
    titleHint: "Watch party",
    briefDescription: "PCs",
    markdown: "# Watch party",
    tags: ["session"],
  },
];

describe("seed tags on seeds", () => {
  it("normalizes and deduplicates tags", () => {
    expect(parseSeedTagsInput("Campaign, one-shot, campaign")).toEqual([
      "campaign",
      "one-shot",
    ]);
    expect(normalizeSeedTags(["City", "city"])).toEqual(["city"]);
  });

  it("defaults realm size as a tag on generated realm seeds", () => {
    expect(
      defaultTagsForGeneratedSeed({ kind: "realm", realmSize: "region" }),
    ).toEqual(["region"]);
    expect(defaultTagsForGeneratedSeed({ kind: "adventure" })).toEqual([]);
  });
});

describe("seedTags filters", () => {
  it("filters by kind and tag", () => {
    expect(
      filterSeeds(sampleSeeds, { kindFilter: "adventure" }).map((s) => s.id),
    ).toEqual(["2"]);
    expect(
      filterSeeds(sampleSeeds, { tagFilter: "campaign" }).map((s) => s.id),
    ).toEqual(["1", "2"]);
  });

  it("limits seeds to workshop tab kinds", () => {
    const mapsOnly = filterSeeds(sampleSeeds, {
      limitToKinds: WORKSHOP_TAB_SEED_KINDS.maps,
    });
    expect(mapsOnly.map((s) => s.kind)).toEqual(["realm", "adventure"]);
  });

  it("collects unique tags across seeds", () => {
    expect(collectSeedTags(sampleSeeds)).toEqual([
      "campaign",
      "city",
      "one-shot",
      "session",
    ]);
  });
});
