import { describe, expect, it } from "vitest";
import {
  findSrdEntityByName,
  getSrdEntity,
  searchSrdEntities,
  srdEntityToLibraryEntry,
  srdEntityToPreviewMarkdown,
} from "@/lib/srd/corpus";
import { SRD_ENTITY_COUNTS } from "@/lib/srd/srdEntities.data";

describe("SRD corpus", () => {
  it("indexes hundreds of bundled entities", () => {
    const total = Object.values(SRD_ENTITY_COUNTS).reduce((sum, n) => sum + n, 0);
    expect(total).toBeGreaterThan(1000);
    expect(SRD_ENTITY_COUNTS.spell).toBeGreaterThan(300);
  });

  it("searches spells by name", () => {
    const hits = searchSrdEntities("fireball", { kinds: ["spell"], limit: 5 });
    expect(hits[0]?.name).toBe("Fireball");
    expect(hits[0]?.id).toBe("spell:fireball");
  });

  it("finds entities by kind and name", () => {
    const entity = findSrdEntityByName("magic-item", "Bag of Holding");
    expect(entity?.kind).toBe("magic-item");
    expect(entity?.subtitle).toContain("Uncommon");
  });

  it("loads full preview markdown from the bundled document", () => {
    const entity = getSrdEntity("spell:fireball");
    expect(entity).toBeDefined();
    const md = srdEntityToPreviewMarkdown(entity!);
    expect(md).toContain("8d6 Fire damage");
    expect(md).toContain("SRD_CC_v5.2.1");
  });

  it("maps spell entities to the rules shelf", () => {
    const entity = getSrdEntity("spell:fireball");
    expect(entity).toBeDefined();
    const entry = srdEntityToLibraryEntry(entity!);
    expect(entry.category).toBe("rules");
    expect(entry.ciClass).toBe("rules.srd-entry");
    expect(entry.srdEntityId).toBe("spell:fireball");
  });

  it("maps monster entities to the monsters shelf", () => {
    const entity = getSrdEntity("monster:goblin-warrior");
    expect(entity).toBeDefined();
    const entry = srdEntityToLibraryEntry(entity!);
    expect(entry.category).toBe("monsters");
    expect(entry.ciClass).toBe("monster.srd-entry");
  });
});
