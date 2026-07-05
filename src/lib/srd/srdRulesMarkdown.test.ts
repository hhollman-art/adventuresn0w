import { describe, expect, it } from "vitest";
import { SRD_CATALOGUE, SRD_DOCUMENT_CHAPTERS } from "@/lib/srd";
import { buildSrdRulesMarkdown } from "@/lib/srd/srdRulesMarkdown";
import { SRD_DOCUMENT_PDF_ID } from "@/lib/srd/srdDocument.data";

describe("buildSrdRulesMarkdown", () => {
  it("builds the full SRD 5.2.1 booklet with cover, chapters, and attribution", () => {
    const md = buildSrdRulesMarkdown();
    expect(md).toMatch(/^# SRD 5\.2\.1 Rules/m);
    expect(md).toContain(SRD_DOCUMENT_PDF_ID);
    expect(md).toContain("## Playing the Game");
    expect(md).toContain("## Spells");
    expect(md).toContain("## Monsters A–Z");
    expect(md).toContain("## Animals");
    expect(md).toContain("## License & attribution");
    expect(md).toContain("CC BY 4.0");
    expect(md).toContain(`**${SRD_CATALOGUE.spells.length}** spells`);
  });

  it("includes every bundled SRD chapter from SRD_CC_v5.2.1", () => {
    const md = buildSrdRulesMarkdown();
    for (const chapter of SRD_DOCUMENT_CHAPTERS) {
      expect(md).toContain(`## ${chapter.title}`);
    }
  });

  it("includes substantive rules text beyond index lists", () => {
    const md = buildSrdRulesMarkdown();
    expect(md.length).toBeGreaterThan(500_000);
    expect(md).toContain("Ability Scores");
    expect(md).toContain("Fireball");
    expect(md).toContain("Goblin");
  });
});
