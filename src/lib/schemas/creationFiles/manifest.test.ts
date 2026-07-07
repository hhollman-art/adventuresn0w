import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CI_CLASSES, CI_REGISTRY } from "@/lib/ciRegistry";

type ManifestEntry = {
  file: string;
  category: string;
  provenance: "user" | "srd";
  inBackup: boolean;
  storageModule: string;
  status: "shipped" | "planned";
};

type Manifest = {
  version: number;
  registryModule: string;
  schemas: Record<string, ManifestEntry>;
};

const SCHEMA_ROOT = join(process.cwd(), "schemas", "creation-files");

function loadManifest(): Manifest {
  const raw = readFileSync(join(SCHEMA_ROOT, "manifest.json"), "utf8");
  return JSON.parse(raw) as Manifest;
}

describe("creation-files schema manifest", () => {
  const manifest = loadManifest();

  it("lists every shipped ciClass from ciRegistry", () => {
    const shipped = Object.entries(manifest.schemas)
      .filter(([, entry]) => entry.status === "shipped")
      .map(([ciClass]) => ciClass);
    expect(new Set(shipped)).toEqual(new Set(CI_CLASSES));
  });

  it("matches registry provenance and backup flags for shipped classes", () => {
    for (const ciClass of CI_CLASSES) {
      const entry = manifest.schemas[ciClass];
      expect(entry, `missing manifest entry for ${ciClass}`).toBeDefined();
      expect(entry.status).toBe("shipped");
      const def = CI_REGISTRY[ciClass];
      expect(entry.category).toBe(def.category);
      expect(entry.provenance).toBe(def.provenance);
      expect(entry.inBackup).toBe(def.inBackup);
      expect(entry.storageModule).toBe(def.storageModule);
    }
  });

  it("has a readable JSON schema file for every manifest entry", () => {
    for (const [ciClass, entry] of Object.entries(manifest.schemas)) {
      const path = join(SCHEMA_ROOT, entry.file);
      expect(existsSync(path), `${ciClass} → ${entry.file}`).toBe(true);
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      expect(parsed.$schema).toBeTruthy();
    }
  });

  it("includes planned stubs for world assets and session log", () => {
    const planned = ["faction.record", "encounter.record"];
    for (const ciClass of planned) {
      expect(manifest.schemas[ciClass]?.status).toBe("planned");
      expect(manifest.schemas[ciClass]?.file.startsWith("planned/")).toBe(true);
    }
  });

  it("defines shared cfMetadata and relationships in common.json", () => {
    const common = JSON.parse(
      readFileSync(join(SCHEMA_ROOT, "common.json"), "utf8"),
    ) as { $defs: Record<string, unknown> };
    expect(common.$defs.cfMetadata).toBeTruthy();
    expect(common.$defs.cfRelationship).toBeTruthy();
  });

  it("ships relationship graph JSON schemas", () => {
    for (const file of ["relationship-graph.json", "relationship-verbs.json"]) {
      const path = join(SCHEMA_ROOT, file);
      expect(existsSync(path), file).toBe(true);
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      expect(parsed).toBeTruthy();
    }
  });
});
