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
  });

  it("puts every user class except live sessions in the backup", () => {
    for (const ciClass of CI_CLASSES) {
      const def = CI_REGISTRY[ciClass];
      if (def.provenance !== "user") continue;
      if (ciClass === "session.tabletop") {
        expect(def.inBackup).toBe(false);
      } else {
        expect(def.inBackup).toBe(true);
      }
    }
  });

  it("filters classes by category", () => {
    expect(ciClassesForCategory("seeds")).toHaveLength(5);
    expect(ciClassesForCategory("parties")).toEqual(["party.roster"]);
  });
});
