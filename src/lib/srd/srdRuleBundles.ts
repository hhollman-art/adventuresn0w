import type { LibraryListEntry } from "@/lib/workshop/libraryCatalog";
import { SRD_DOCUMENT_BODY } from "@/lib/srd/srdDocument.data";
import type { SrdRuleBundleId } from "@/lib/srd/types";
import {
  SRD_BUNDLED_SECTION_KEYS,
  SRD_RULE_BUNDLES,
  type SrdRuleBundleRecord,
  type SrdRuleBundleSectionRef,
} from "@/lib/srd/srdRuleBundles.data";

export {
  SRD_BUNDLED_SECTION_KEYS,
  SRD_RULE_BUNDLES,
  type SrdRuleBundleRecord,
  type SrdRuleBundleSectionRef,
};

const bundleById = new Map<SrdRuleBundleId, SrdRuleBundleRecord>(
  SRD_RULE_BUNDLES.map((bundle) => [bundle.bundleId, bundle]),
);

export function getSrdRuleBundle(bundleId: SrdRuleBundleId): SrdRuleBundleRecord | undefined {
  return bundleById.get(bundleId);
}

export function listSrdRuleBundleLibraryEntries(): LibraryListEntry[] {
  return SRD_RULE_BUNDLES.map((bundle) => ({
    id: `srd-bundle:${bundle.bundleId}`,
    ciClass: "rules.srd-bundle",
    category: "rules",
    provenance: "srd",
    kindLabel: "Rule bundle",
    title: bundle.title,
    detail: `${bundle.sectionCount} sections — ${bundle.description}`,
    createdAt: "5.2.1-01-01T00:00:00.000Z",
    srdBundleId: bundle.bundleId,
  }));
}

function sectionMarkdown(section: SrdRuleBundleSectionRef): string {
  if (typeof section.start === "number" && typeof section.end === "number") {
    return SRD_DOCUMENT_BODY.slice(section.start, section.end).trim();
  }
  return "";
}

/** Full chronologically ordered markdown for a consolidated rule bundle. */
export function buildSrdRuleBundleMarkdown(bundleId: SrdRuleBundleId): string {
  const bundle = getSrdRuleBundle(bundleId);
  if (!bundle) return "";

  const body = bundle.sections
    .map((section) => sectionMarkdown(section))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return [`# ${bundle.title}`, "", bundle.description, "", body].join("\n").trim();
}

export function isBundledSrdSectionKey(key: string): boolean {
  return SRD_BUNDLED_SECTION_KEYS.has(key);
}
