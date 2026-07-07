import { describe, expect, it } from "vitest";
import { lookupSrdDocumentMarkdown, normalizeSrdDocumentKey } from "@/lib/srd/srdDocumentLookup";

describe("srdDocumentLookup", () => {
  it("normalizes lookup keys", () => {
    expect(normalizeSrdDocumentKey("Bag of Holding")).toBe("bag-of-holding");
    expect(normalizeSrdDocumentKey("Tasha’s Hideous Laughter")).toBe("tashas-hideous-laughter");
  });

  it("returns full spell text from SRD_CC_v5.2.1", () => {
    const md = lookupSrdDocumentMarkdown({
      resource: "spells",
      name: "Fireball",
      index: "fireball",
    });
    expect(md).toContain("# Fireball");
    expect(md).toContain("**Casting Time:** Action");
    expect(md).toContain("8d6 Fire damage");
    expect(md).toContain("SRD_CC_v5.2.1");
  });

  it("returns full magic item text from SRD_CC_v5.2.1", () => {
    const md = lookupSrdDocumentMarkdown({
      resource: "magic-items",
      name: "Bag of Holding",
      index: "bag-of-holding",
    });
    expect(md).toContain("# Bag of Holding");
    expect(md).toContain("500 pounds");
    expect(md).toContain("Wondrous Item");
  });

  it("resolves common monster aliases from the bundled document", () => {
    const md = lookupSrdDocumentMarkdown({
      resource: "monsters",
      name: "Goblin",
      index: "goblin",
    });
    expect(md).toBeTruthy();
    expect(md).toContain("Goblin");
    expect(md).toContain("**AC**");
  });
});
