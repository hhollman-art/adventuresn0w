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
    expect(md).toContain("| **Casting Time** | 1 action |");
    expect(md).toContain("8d6 Fire damage");
    expect(md).toContain("SRD_CC_v5.2.1");
  });

  it("maps spell entities to spell.srd-entry with full library detail", () => {
    const entity = getSrdEntity("spell:fireball");
    expect(entity).toBeDefined();
    const entry = srdEntityToLibraryEntry(entity!);
    expect(entry.category).toBe("rules");
    expect(entry.ciClass).toBe("spell.srd-entry");
    expect(entry.detail).toContain("150 feet");
    expect(entry.detail).toContain("Sorcerer");
    expect(entry.srdEntityId).toBe("spell:fireball");
  });

  it("indexes bundled class entities after taxonomy rebuild", () => {
    expect(SRD_ENTITY_COUNTS.class).toBe(12);
    const wizard = getSrdEntity("class:wizard");
    expect(wizard?.kind).toBe("class");
    expect(wizard?.taxonomyCategory).toBe("classes");
    expect(wizard?.edition).toBe("5.2.1");
    expect(wizard?.dataSource).toBe("document");
  });

  it("indexes weapons and armor parsed from equipment tables", () => {
    expect(SRD_ENTITY_COUNTS.weapon).toBe(38);
    expect(SRD_ENTITY_COUNTS.armor).toBe(13);
    const longsword = getSrdEntity("weapon:longsword");
    expect(longsword?.name).toBe("Longsword");
    expect(longsword?.subtitle).toContain("Slashing");
    const chainMail = getSrdEntity("armor:chain-mail");
    expect(chainMail?.name).toBe("Chain Mail");
  });

  it("maps monster entities to the monsters shelf", () => {
    const entity = getSrdEntity("monster:goblin-warrior");
    expect(entity).toBeDefined();
    const entry = srdEntityToLibraryEntry(entity!);
    expect(entry.category).toBe("monsters");
    expect(entry.ciClass).toBe("monster.srd-entry");
  });
});
