import { describe, expect, it } from "vitest";
import {
  buildSrdSpellPreviewMarkdown,
  formatSrdSpellLibraryDetail,
} from "@/lib/srd/srdSpellPreview";
import { findSpellIndexEntry } from "@/lib/srd/spellIndex";

describe("srdSpellPreview", () => {
  it("builds a full spell sheet with index fields and 5.2.1 description", () => {
    const md = buildSrdSpellPreviewMarkdown({ key: "fireball" });
    expect(md).toBeTruthy();
    expect(md).toContain("# Fireball");
    expect(md).toContain("| **Casting Time** | 1 action |");
    expect(md).toContain("| **Range** | 150 feet |");
    expect(md).toContain("V, S, M");
    expect(md).toContain("## Description");
    expect(md).toContain("8d6 Fire damage");
    expect(md).toContain("SRD_CC_v5.2.1");
  });

  it("formats a rich library detail line", () => {
    const spell = findSpellIndexEntry("fireball");
    expect(spell).toBeDefined();
    const detail = formatSrdSpellLibraryDetail(spell!);
    expect(detail).toContain("3rd-level");
    expect(detail).toContain("Evocation");
    expect(detail).toContain("150 feet");
    expect(detail).toContain("Sorcerer");
  });
});
