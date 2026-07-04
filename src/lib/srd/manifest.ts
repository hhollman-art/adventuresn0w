/** Canonical SRD bundle metadata shipped with D&D Easy. */
export const SRD_MANIFEST = {
  /** Rules lineage this app targets (SRD 5.2, CC BY 4.0). */
  version: "5.2",
  license: "CC-BY-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  srdUrl: "https://www.dndbeyond.com/srd",
  /** Structured spell data generated from Open5e (wotc-srd document), also CC BY 4.0. */
  spellDataSource: "https://api.open5e.com/",
  copyrightHolder: "Wizards of the Coast LLC",
  appName: "D&D Easy",
} as const;

export type SrdManifest = typeof SRD_MANIFEST;

/** Short credit for footers and compact UI. */
export const SRD_ATTRIBUTION_SHORT =
  "Uses SRD 5.2 material © Wizards of the Coast LLC, available under CC BY 4.0.";

/** Markdown block suitable for exported documents. */
export const SRD_ATTRIBUTION_MARKDOWN = `[${SRD_MANIFEST.appName}](https://github.com/hhollman-art/adventuresn0w) uses material from the System Reference Document 5.2 ("SRD 5.2"), © ${SRD_MANIFEST.copyrightHolder}, available at [${SRD_MANIFEST.srdUrl}](${SRD_MANIFEST.srdUrl}). The SRD 5.2 is licensed under the [Creative Commons Attribution 4.0 International License](${SRD_MANIFEST.licenseUrl}).

${SRD_MANIFEST.appName} is not affiliated with, endorsed, sponsored, or approved by ${SRD_MANIFEST.copyrightHolder}.`;

/** Plain-language content boundaries for the legal page. */
export const SRD_CONTENT_POLICY = {
  srdTier:
    "Bundled SRD rules (classes, spells, monsters, and similar) come only from the official System Reference Document under CC BY 4.0. We may expand that catalogue over time; it never includes paywalled book content.",
  userTier:
    "Content from books you purchased (subclasses, spells, or lore not in the SRD) may be typed or imported by you for personal play. That material stays in your browser on this device — not in a shared server library other users can browse.",
  aiTier:
    "When you generate text or images, your prompts are sent to our AI providers for that request only. We do not maintain a central database of your imported book text for other users to access.",
  never:
    "We do not sell access to non-SRD Wizards of the Coast content, and we do not host a shared repository of copyrighted book material.",
} as const;
