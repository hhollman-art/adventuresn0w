import { describe, expect, it } from "vitest";
import {
  SRD_ATTRIBUTION_SHORT,
  SRD_CATALOGUE,
  SRD_CLASS_ENTRIES,
  SRD_MANIFEST,
  SRD_SPELLS,
} from "@/lib/srd";

describe("SRD manifest", () => {
  it("declares CC BY 4.0 SRD 5.2 lineage", () => {
    expect(SRD_MANIFEST.version).toBe("5.2");
    expect(SRD_MANIFEST.license).toBe("CC-BY-4.0");
    expect(SRD_ATTRIBUTION_SHORT).toContain("Wizards of the Coast");
  });

  it("bundles class and ancestry entries with srd source", () => {
    expect(SRD_CLASS_ENTRIES.length).toBeGreaterThan(0);
    expect(SRD_CLASS_ENTRIES.every((c) => c.source === "srd")).toBe(true);
    expect(SRD_CLASS_ENTRIES.every((c) => c.srdSubclass)).toBe(true);
    expect(SRD_CATALOGUE.ancestries.every((a) => a.source === "srd")).toBe(true);
  });

  it("loads the SRD spell catalogue", () => {
    expect(SRD_SPELLS.length).toBeGreaterThan(100);
    expect(SRD_SPELLS.every((s) => s.source === "srd")).toBe(true);
    expect(SRD_SPELLS.every((s) => Array.isArray(s.classes))).toBe(true);
  });
});
