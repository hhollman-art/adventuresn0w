import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixSavedCampaign,
  getActiveCampaignId,
  setActiveCampaignId,
} from "@/lib/campaigns";

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe("fixSavedCampaign", () => {
  it("rejects rows without an id or name", () => {
    expect(fixSavedCampaign(null)).toBeNull();
    expect(fixSavedCampaign("junk")).toBeNull();
    expect(fixSavedCampaign({ id: "c1" })).toBeNull();
    expect(fixSavedCampaign({ id: "c1", name: "   " })).toBeNull();
    expect(fixSavedCampaign({ name: "Thursday group" })).toBeNull();
  });

  it("fills defaults for a minimal row", () => {
    const fixed = fixSavedCampaign({ id: "c1", name: "Thursday group" });
    expect(fixed).toMatchObject({
      id: "c1",
      name: "Thursday group",
      description: "",
      partyId: null,
      seedIds: [],
      resultIds: [],
      characterIds: [],
      itemIds: [],
      npcIds: [],
      locationIds: [],
      sessionRecordIds: [],
    });
    expect(fixed!.createdAt).toBeTruthy();
    expect(fixed!.updatedAt).toBe(fixed!.createdAt);
  });

  it("keeps links, dedupes ids, and drops non-string junk", () => {
    const fixed = fixSavedCampaign({
      id: "c2",
      name: "Sunday kids table",
      description: "Lighthearted",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      partyId: "party-9",
      seedIds: ["s1", "s2", "s1", 42, null],
      resultIds: ["r1", "r1"],
      characterIds: ["ch1", "ch1", 99],
      itemIds: ["it1"],
    });
    expect(fixed).toMatchObject({
      partyId: "party-9",
      seedIds: ["s1", "s2"],
      resultIds: ["r1"],
      characterIds: ["ch1"],
      itemIds: ["it1"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("round-trips its own output", () => {
    const fixed = fixSavedCampaign({
      id: "c3",
      name: "West Marches",
      partyId: "p1",
      seedIds: ["s1"],
      resultIds: [],
    });
    expect(fixSavedCampaign(JSON.parse(JSON.stringify(fixed)))).toEqual(fixed);
  });
});

describe("active campaign id", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("localStorage", mockLocalStorage());
  });

  it("stores, reads, and clears the active id", () => {
    expect(getActiveCampaignId()).toBeNull();
    setActiveCampaignId("c1");
    expect(getActiveCampaignId()).toBe("c1");
    setActiveCampaignId(null);
    expect(getActiveCampaignId()).toBeNull();
  });
});
