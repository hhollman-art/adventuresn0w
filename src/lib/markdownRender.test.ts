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
});
