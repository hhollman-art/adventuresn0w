/**
 * Product principles shown on the Fantasy Forge welcome hearth.
 * Add a new entry here whenever a guiding principle is adopted in the app.
 */
export type ForgePrinciple = {
  id: string;
  icon: string;
  title: string;
  body: string;
};

export const FORGE_PRINCIPLES: readonly ForgePrinciple[] = [
  {
    id: "manual-first",
    icon: "\u{1F3AF}",
    title: "Manual-first, AI optional",
    body:
      "Every tool works without API keys. Type, import, and edit by hand — AI is a fast-forward when you want it, never a gate.",
  },
  {
    id: "library-heart",
    icon: "\u{1F4DA}",
    title: "The Library is your prep shelf",
    body:
      "Everything you save lives in one place — lore, heroes, fellowships, items, and chronicles — linked and searchable like a DM's own archive.",
  },
  {
    id: "approachable",
    icon: "\u{1F9D9}",
    title: "Built for storytellers, not engineers",
    body:
      "Plain words, familiar tabletop metaphors, and one obvious next step — so you can prep and run without learning software jargon.",
  },
  {
    id: "yours-alone",
    icon: "\u{1F512}",
    title: "Your table, your data",
    body:
      "Your creations and imports stay on your devices. Included rules are free SRD reference only — book content you own stays private prep.",
  },
  {
    id: "reuse",
    icon: "\u{1F501}",
    title: "Curate once, run many nights",
    body:
      "CFs, scrolls, hero sheets, and campaign links are meant to be reused and edited — not one-off outputs you throw away after session zero.",
  },
  {
    id: "scale",
    icon: "\u{1F3F0}",
    title: "Start at the hearth, grow into epics",
    body:
      "Run a one-nighter tonight or shepherd a long campaign — the same Library and Virtual Table scale with you without starting over.",
  },
] as const;
