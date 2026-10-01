import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import { dnd5eResourceToMarkdown } from "@/lib/srd/dnd5eApiMarkdown";
import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { buildSrdSpellPreviewMarkdown } from "@/lib/srd/srdSpellPreview";
import { srdDocument } from "@/lib/srd/srdAssets";
import { SRD_ATTRIBUTION_SHORT } from "@/lib/srd/manifest";

export type BuildSrdPreviewMarkdownParams = {
  resource: SrdApiResource;
  index: string;
  name: string;
  apiData?: Record<string, unknown>;
};

/**
 * Build preview Markdown for an SRD entry, preferring the bundled SRD_CC_v5.2.1 text
 * and falling back to the D&D 5e API when the PDF bundle has no matching section.
 */
export function buildSrdPreviewMarkdown(params: BuildSrdPreviewMarkdownParams): string {
  const { resource, index, name, apiData } = params;

  if (resource === "spells") {
    const spellMarkdown = buildSrdSpellPreviewMarkdown({ key: index, name });
    if (spellMarkdown?.trim()) return spellMarkdown;
  }

  const documentMarkdown = lookupSrdDocumentMarkdown({ resource, name, index });
  if (documentMarkdown?.trim()) {
    return documentMarkdown;
  }

  const pdfId = srdDocument().pdfId;
  if (apiData) {
    const apiMarkdown = dnd5eResourceToMarkdown(resource, apiData);
    return `${apiMarkdown}\n\n_Source: D&D 5e API (2014 SRD). Full ${pdfId} text was not found for this entry._\n\n${SRD_ATTRIBUTION_SHORT}`;
  }

  return `# ${name}\n\nNo matching entry was found in **${pdfId}** or the SRD API.`;
}

/** Async loader used by preview entry points. */
export async function fetchSrdPreviewMarkdown(
  resource: SrdApiResource,
  index: string,
  name: string,
  fetchResource: (
    resource: SrdApiResource,
    index: string,
  ) => Promise<Record<string, unknown>>,
): Promise<string> {
  if (resource === "spells") {
    const spellMarkdown = buildSrdSpellPreviewMarkdown({ key: index, name });
    if (spellMarkdown?.trim()) return spellMarkdown;
  }

  const documentMarkdown = lookupSrdDocumentMarkdown({ resource, name, index });
  if (documentMarkdown?.trim()) {
    return documentMarkdown;
  }

  const apiData = await fetchResource(resource, index);
  return buildSrdPreviewMarkdown({ resource, index, name, apiData });
}
