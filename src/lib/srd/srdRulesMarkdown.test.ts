import { describe, expect, it } from "vitest";
import { SRD_CATALOGUE } from "@/lib/srd";
import { buildSrdRulesMarkdown } from "@/lib/srd/srdRulesMarkdown";

describe("buildSrdRulesMarkdown", () => {
  it("builds a booklet with cover, classes, spell levels, ancestries, and attribution", () => {
    const md = buildSrdRulesMarkdown();
    expect(md).toMatch(/^# SRD 5\.2 Rules/m);
    expect(md).toContain("## Classes");
    expect(md).toContain("## Spells — cantrips");
    expect(md).toContain("## Spells — 9th level");
    expect(md).toContain("## Ancestries");
    expect(md).toContain("## License & attribution");
    expect(md).toContain("Creative Commons Attribution 4.0");
    expect(md).toContain(`**${SRD_CATALOGUE.spells.length}** spells`);
  });

  it("lists each class with its included SRD subclass", () => {
    const md = buildSrdRulesMarkdown();
    for (const cls of SRD_CATALOGUE.classes) {
      expect(md).toContain(`| ${cls.name} | ${cls.srdSubclass ?? "—"} |`);
    }
  });
});
