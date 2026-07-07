import type { SrdApiResource } from "@/lib/srd/dnd5eApi";
import { dnd5eResourceToMarkdown } from "@/lib/srd/dnd5eApiMarkdown";
import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { SRD_DOCUMENT_PDF_ID } from "@/lib/srd/srdDocument.data";
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

  const documentMarkdown = lookupSrdDocumentMarkdown({ resource, name, index });
  if (documentMarkdown?.trim()) {
    return documentMarkdown;
  }

  if (apiData) {
    const apiMarkdown = dnd5eResourceToMarkdown(resource, apiData);
    return `${apiMarkdown}\n\n_Source: D&D 5e API (2014 SRD). Full ${SRD_DOCUMENT_PDF_ID} text was not found for this entry._\n\n${SRD_ATTRIBUTION_SHORT}`;
  }

  return `# ${name}\n\nNo matching entry was found in **${SRD_DOCUMENT_PDF_ID}** or the SRD API.`;
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
  const documentMarkdown = lookupSrdDocumentMarkdown({ resource, name, index });
  if (documentMarkdown?.trim()) {
    return documentMarkdown;
  }

  const apiData = await fetchResource(resource, index);
  return buildSrdPreviewMarkdown({ resource, index, name, apiData });
}
