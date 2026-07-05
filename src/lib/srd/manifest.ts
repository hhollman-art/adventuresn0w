/** Canonical SRD bundle metadata shipped with D&D Easy. */
export const SRD_MANIFEST = {
  /** Rules lineage this app targets (SRD 5.2.1, CC BY 4.0). */
  version: "5.2.1",
  /** Official English PDF identifier bundled in the Library reference. */
  documentPdfId: "SRD_CC_v5.2.1",
  license: "CC-BY-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  srdUrl: "https://www.dndbeyond.com/sources/dnd/srd-5.2.1",
  /** Structured spell index generated from Open5e (wotc-srd document), also CC BY 4.0. */
  spellDataSource: "https://api.open5e.com/",
  /** Library SRD browse via the community D&D 5e REST API (2014 SRD, CC BY 4.0). */
  srdApiSource: "https://www.dnd5eapi.co/",
  /** Full-text SRD markdown build script (optional offline bundle; Library browse uses the API). */
  documentMarkdownUrl: "https://github.com/downfallx/dnd-5e-srd-markdown",
  copyrightHolder: "Wizards of the Coast LLC",
  appName: "D&D Easy",
} as const;

export type SrdManifest = typeof SRD_MANIFEST;

/** Short credit for footers and compact UI. */
export const SRD_ATTRIBUTION_SHORT =
  "Uses SRD 5.2.1 material © Wizards of the Coast LLC, available under CC BY 4.0.";

/** Markdown block suitable for exported documents. */
export const SRD_ATTRIBUTION_MARKDOWN = `[${SRD_MANIFEST.appName}](https://github.com/hhollman-art/adventuresn0w) uses material from the System Reference Document ${SRD_MANIFEST.version} ("SRD ${SRD_MANIFEST.version}" / ${SRD_MANIFEST.documentPdfId}), © ${SRD_MANIFEST.copyrightHolder}, available at [${SRD_MANIFEST.srdUrl}](${SRD_MANIFEST.srdUrl}). The Library **SRD rules** tab browses the [D&D 5e SRD API](${SRD_MANIFEST.srdApiSource}) (2014 SRD, CC BY 4.0). The spell/class picker index is structured from the Open5e API ([open5e.com](${SRD_MANIFEST.spellDataSource}), document \`wotc-srd\`), also under CC BY 4.0.

${SRD_MANIFEST.appName} is not affiliated with, endorsed, sponsored, or approved by ${SRD_MANIFEST.copyrightHolder}.`;

/** Plain-language content boundaries for the legal page. */
export const SRD_CONTENT_POLICY = {
  srdTier:
    "Bundled SRD pickers and the Library SRD tab use CC BY 4.0 reference material only. The SRD rules tab browses spells, monsters, classes, equipment, and rules via the D&D 5e SRD API (2014 SRD). Character pickers use a structured spell/class index from the same SRD lineage. Paywalled book content never ships in the app.",
  userTier:
    "Content from books you purchased (subclasses, spells, or lore not in the SRD) may be typed or imported by you for personal play — including character data you copy from D&D Beyond or upload as a JSON file you saved yourself. That material stays in your browser on this device — not in a shared server library other users can browse. D&D Easy never logs into D&D Beyond or uses your account cookies.",
  aiTier:
    "When you generate text or images, your prompts are sent to our AI providers for that request only. We do not maintain a central database of your imported book text for other users to access.",
  never:
    "We do not sell access to non-SRD Wizards of the Coast content, and we do not host a shared repository of copyrighted book material.",
} as const;
