import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml, slugifySectionId } from "@/lib/markdownRender";

describe("renderMarkdownToHtml", () => {
  it("slugifySectionId deduplicates collisions", () => {
    const used = new Set<string>();
    expect(slugifySectionId("Hook A", used)).toBe("hook-a");
    expect(slugifySectionId("Hook A", used)).toBe("hook-a-2");
  });

  it("preview section layout starts with a table of contents and carousel", () => {
    const html = renderMarkdownToHtml(
      `# My Adventure

Intro line.

## Prologue

Once upon a time.

## Scene one

Fight here.
`,
      "preview",
      true,
    );
    expect(html).toContain("output-document-carousel");
    expect(html).toContain("module-toc-panel");
    expect(html).toContain('href="#prologue"');
    expect(html).toContain('href="#scene-one"');
    expect(html).toContain('id="prologue"');
    expect(html).toContain('id="scene-one"');
    expect(html).toContain("Contents");
    expect(html).not.toContain("module-cover");
    expect(html).toContain("Intro line.");
  });

  it("export layout omits the horizontal carousel wrapper", () => {
    const html = renderMarkdownToHtml(
      `# Title\n\n## One\n\nBody.\n`,
      "export",
      true,
    );
    expect(html).not.toContain("output-document-carousel");
    expect(html).not.toContain("module-toc-panel");
    expect(html).toContain("module-sheet");
  });

  it("flat preview without section flag renders inline html", () => {
    const html = renderMarkdownToHtml("# Hello\n\nPara.", "preview", false);
    expect(html).not.toContain("output-document-carousel");
    expect(html).toContain("<h1");
  });

  it("renders SRD-style HTML tables and hr blocks", () => {
    const md = `## Equipment

<table>
  <thead>
    <tr><th>Item</th><th>Cost</th></tr>
  </thead>
  <tbody>
    <tr><td>Rope</td><td>1 GP</td></tr>
  </tbody>
</table>

#### Traits

<hr>

**_Amphibious._** Can breathe air and water.
`;
    const html = renderMarkdownToHtml(md, "preview", true);
    expect(html).toContain("module-glance-table");
    expect(html).toContain("<td>Rope</td>");
    expect(html).not.toContain("&lt;table");
    expect(html).toContain('class="module-md-hr"');
  });

  it("preserves line breaks in stat block lines", () => {
    const html = renderMarkdownToHtml(
      "## Goblin\n\n**AC** 15 **HP** 7 <br>\n**Speed** 30 ft. <br>\n",
      "preview",
      true,
    );
    expect(html).toContain("AC</strong> 15");
    expect(html).toContain("<br />");
    expect(html).not.toContain("&lt;br");
  });

  it("renders SRD stat block headings, trait lead-ins, italics, and entities", () => {
    const md = `#### Adult Black Dragon

_Huge Dragon (Chromatic), Chaotic Evil_

##### Traits

<hr>

**_Legendary Resistance (3/Day, or 4/Day in Lair)._** If the dragon fails a saving throw, it can choose to succeed instead.

**_Rend._** _Melee Attack Roll:_ +11, reach 10 ft. _Hit:_ 13 (2d6 + 6) Slashing damage.

**_Spellcasting._** The dragon casts one of the following spells: <br>
&emsp;**At Will:** _Acid Arrow_, _Detect Magic_ <br>
&emsp;**1/Day Each:** _Speak with Dead_ &mdash; done&nbsp;now

###### Lair
`;
    const html = renderMarkdownToHtml(md, "preview", false);
    expect(html).not.toMatch(/#{5}|\b_|_\b|&emsp;|&amp;emsp;|&mdash;|&nbsp;/);
    expect(html).toContain('<h5 class="md-subheading">Traits</h5>');
    expect(html).toContain('<h6 class="md-subheading">Lair</h6>');
    expect(html).toContain("<em>Huge Dragon (Chromatic), Chaotic Evil</em>");
    expect(html).toContain(
      '<strong class="md-trait-name"><em>Legendary Resistance (3/Day, or 4/Day in Lair).</em></strong> If the dragon',
    );
    expect(html).toContain("<em>Melee Attack Roll:</em> +11");
    expect(html).toMatch(/<p class="[^"]*md-trait[^"]*">/);
    // Hard-break lines stay in one paragraph with an em-space indent.
    expect(html).toContain("spells: <br />\n\u2003<strong>At Will:</strong> <em>Acid Arrow</em>");
    expect(html).toContain("\u2014 done\u00A0now");
    expect(html).not.toContain("<br/>");
  });

  it("renders --- thematic breaks as rules", () => {
    const html = renderMarkdownToHtml("Body.\n\n---\n\nUses SRD_CC_v5.2.1", "preview", false);
    expect(html).toContain('<hr class="module-md-hr" />');
    expect(html).not.toContain("---");
    expect(html).toContain("SRD_CC_v5.2.1");
  });

  it("leaves snake_case words and arithmetic asterisks literal", () => {
    const html = renderMarkdownToHtml("Use my_file_name and 2 * 3 * 4.", "preview", false);
    expect(html).toContain("my_file_name");
    expect(html).toContain("2 * 3 * 4");
    expect(html).not.toContain("<em>");
  });

  it("decodes entities without letting decoded markup through", () => {
    const html = renderMarkdownToHtml("A &lt;script&gt; tag &amp; &unknown;", "preview", false);
    expect(html).toContain("&lt;script>");
    expect(html).not.toContain("<script");
    expect(html).toContain("&amp; &amp;unknown;");
  });
});
