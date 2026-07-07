import { SRD_ATTRIBUTION_MARKDOWN, SRD_MANIFEST } from "@/lib/srd/manifest";
import { SRD_ANCESTRY_ENTRIES } from "@/lib/srd/ancestries";
import { SRD_CLASS_ENTRIES } from "@/lib/srd/classes";
import { SRD_SPELLS } from "@/lib/srd/spells";
import type { SrdCatalogue } from "@/lib/srd/types";
import {
  SRD_DOCUMENT_BODY,
  SRD_DOCUMENT_CHAPTERS,
  SRD_DOCUMENT_PDF_ID,
} from "@/lib/srd/srdDocument.data";

const DEFAULT_SRD_CATALOGUE: SrdCatalogue = {
  version: SRD_MANIFEST.version,
  classes: SRD_CLASS_ENTRIES,
  spells: SRD_SPELLS,
  ancestries: SRD_ANCESTRY_ENTRIES,
};

function buildCoverIntro(catalogue: SrdCatalogue): string {
  const chapterList = SRD_DOCUMENT_CHAPTERS.map((c) => c.title).join(", ");
  return [
    `Full **System Reference Document** English text (**${SRD_DOCUMENT_PDF_ID}**) bundled for read-only browse in D&D Easy.`,
    "",
    "Use **Contents** in the Scy Window, then page through each section — major chapters match the official PDF, with subsections (spells, monsters, magic items, and similar) on their own pages where the source uses headings.",
    "",
    "**Included chapters:** " + chapterList + ".",
    "",
    `- **${catalogue.classes.length}** classes in pickers (each with one included SRD subclass)`,
    `- **${catalogue.spells.length}** spells in structured pickers`,
    `- **${catalogue.ancestries.length}** ancestries in pickers`,
    `- Licensed under **${SRD_MANIFEST.license}** — see the final section for attribution`,
  ].join("\n");
}

/** Markdown booklet for read-only SRD browse (preview carousel with Contents + ## sections). */
export function buildSrdRulesMarkdown(
  catalogue: SrdCatalogue = DEFAULT_SRD_CATALOGUE,
): string {
  const lines: string[] = [
    `# SRD ${catalogue.version} Rules`,
    "",
    buildCoverIntro(catalogue),
    "",
    SRD_DOCUMENT_BODY,
    "",
    "## License & attribution",
    "",
    SRD_ATTRIBUTION_MARKDOWN,
    "",
  ];

  return lines.join("\n").trimEnd();
}

export { SRD_DOCUMENT_CHAPTERS, SRD_DOCUMENT_PDF_ID };
