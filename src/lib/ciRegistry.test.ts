import { describe, expect, it } from "vitest";
import {
  CI_CLASSES,
  CI_REGISTRY,
  ciClassesForCategory,
  ciClassForResult,
  ciClassForSeed,
  ciDefinition,
} from "./ciRegistry";
import { SEED_KINDS } from "./realmSeeds";

describe("ciRegistry", () => {
  it("gives every class a definition whose ciClass matches its key", () => {
    for (const ciClass of CI_CLASSES) {
      const def = CI_REGISTRY[ciClass];
      expect(def.ciClass).toBe(ciClass);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.storageModule.length).toBeGreaterThan(0);
    }
  });

  it("uses category.kind naming for every class", () => {
    for (const ciClass of CI_CLASSES) {
      expect(ciClass).toMatch(/^[a-z-]+\.[a-z-]+$/);
    }
  });

  it("registers a seed and result class for every kind", () => {
    for (const kind of SEED_KINDS) {
      expect(CI_REGISTRY[ciClassForSeed(kind)].category).toBe("seeds");
      expect(CI_REGISTRY[ciClassForResult(kind)].category).toBe("results");
    }
  });

  it("keeps SRD classes read-only and out of the user backup", () => {
    const srd = ciDefinition("rules.srd-entry");
    expect(srd.provenance).toBe("srd");
    expect(srd.inBackup).toBe(false);
    const srdItem = ciDefinition("item.srd-equipment");
    expect(srdItem.provenance).toBe("srd");
    expect(srdItem.inBackup).toBe(false);
  });

  it("puts every user class except VTT table sessions in the backup", () => {
    for (const ciClass of CI_CLASSES) {
      const def = CI_REGISTRY[ciClass];
      if (def.provenance !== "user") continue;
      if (ciClass === "session.tabletop" || ciClass === "session.snapshot") {
        // Live table + shelved campaign tables carry large map images — local only.
        expect(def.inBackup).toBe(false);
      } else {
        expect(def.inBackup).toBe(true);
      }
    }
  });

  it("filters classes by category", () => {
    expect(ciClassesForCategory("seeds")).toHaveLength(5);
    expect(ciClassesForCategory("world")).toEqual(["npc.record", "location.record"]);
    expect(ciClassesForCategory("characters")).toEqual(["character.sheet"]);
    expect(ciClassesForCategory("items")).toEqual([
      "item.equipment",
      "item.magic",
      "item.srd-equipment",
      "item.srd-magic",
    ]);
    expect(ciClassesForCategory("parties")).toEqual(["party.roster"]);
    expect(ciClassesForCategory("campaigns")).toEqual(["campaign.record"]);
    expect(ciClassesForCategory("sessions")).toEqual([
      "session.record",
      "session.tabletop",
      "session.snapshot",
    ]);
  });

  it("registers standalone characters as backed-up user sheets", () => {
    const character = ciDefinition("character.sheet");
    expect(character.category).toBe("characters");
    expect(character.provenance).toBe("user");
    expect(character.inBackup).toBe(true);
    expect(character.storageModule).toBe("src/lib/tabletop/characterLibrary.ts");
  });

  it("registers equipment and magic items as backed-up user items", () => {
    for (const ciClass of ["item.equipment", "item.magic"] as const) {
      const def = ciDefinition(ciClass);
      expect(def.category).toBe("items");
      expect(def.provenance).toBe("user");
      expect(def.inBackup).toBe(true);
      expect(def.storageModule).toBe("src/lib/itemLibrary.ts");
    }
  });

  it("registers campaigns as backed-up user containers", () => {
    const campaign = ciDefinition("campaign.record");
    expect(campaign.category).toBe("campaigns");
    expect(campaign.provenance).toBe("user");
    expect(campaign.inBackup).toBe(true);
    expect(campaign.storageModule).toBe("src/lib/campaigns.ts");
  });
});
