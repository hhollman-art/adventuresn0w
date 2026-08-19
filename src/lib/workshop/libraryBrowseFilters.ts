import type { CiClass } from "@/lib/ciRegistry";
import { ciClassesForCategory } from "@/lib/ciRegistry";
import type { LibraryListEntry, WorkshopLibraryCategory } from "@/lib/workshop/libraryCatalog";

/** Fantasy shelf names for the archive browser (approachable-interface rule). */
export const LIBRARY_SHELF_LABEL: Record<WorkshopLibraryCategory, string> = {
  all: "All shelves",
  seeds: "CFs",
  results: "Prepared scrolls",
  characters: "Heroes",
  items: "Items",
  world: "World",
  rules: "Rule tomes",
  monsters: "Bestiary",
  parties: "Fellowships",
  campaigns: "Chronicles",
  sessions: "Session logs",
};

/** User-facing kind labels mapped from Creation File (CF) class — the “subclass” the filters use. */
export const LIBRARY_CI_FANTASY_LABEL: Record<CiClass, string> = {
  "seed.realm": "World CF",
  "seed.adventure": "Adventure hook CF",
  "seed.characters": "Hero party ideas CF",
  "seed.maps": "Map CF",
  "seed.props": "Item handout CF",
  "result.realm": "Realm write-up",
  "result.adventure": "Adventure scroll",
  "result.characters": "Hero roster scroll",
  "result.maps": "Battle map scroll",
  "result.props": "Item handout scroll",
  "character.sheet": "Hero sheet",
  "item.equipment": "Your gear",
  "item.magic": "Your magic treasure",
  "item.srd-equipment": "SRD gear",
  "item.srd-magic": "SRD magic treasure",
  "party.roster": "Fellowship roster",
  "campaign.record": "Campaign chronicle",
  "npc.record": "Named NPC",
  "location.record": "World place",
  "session.record": "Session log",
  "session.tabletop": "Game table",
  "session.snapshot": "Shelved table",
  "session.room": "Session room",
  "rules.srd-entry": "SRD rule",
  "rules.srd-bundle": "Rule bundle",
  "rules.custom-entry": "Your rule copy",
  "spell.srd-entry": "SRD spell",
  "monster.srd-entry": "SRD monster",
};

export type LibraryBrowseProvenanceFilter = "all" | "yours" | "included";

export type CiClassFilterOption = {
  ciClass: CiClass | "all";
  label: string;
  count: number;
};

const SHELF_CI_CLASSES: Record<Exclude<WorkshopLibraryCategory, "all">, CiClass[]> = {
  seeds: ciClassesForCategory("seeds"),
  results: ciClassesForCategory("results"),
  characters: ciClassesForCategory("characters"),
  items: ciClassesForCategory("items"),
  world: ciClassesForCategory("world"),
  rules: ciClassesForCategory("rules"),
  monsters: ciClassesForCategory("monsters"),
  parties: ciClassesForCategory("parties"),
  campaigns: ciClassesForCategory("campaigns"),
  sessions: ciClassesForCategory("sessions"),
};

export function fantasyCiLabel(ciClass: CiClass | string): string {
  return LIBRARY_CI_FANTASY_LABEL[ciClass as CiClass] ?? "Creation File";
}

export function matchesBrowseSearch(entry: LibraryListEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    entry.title,
    entry.detail,
    entry.kindLabel,
    fantasyCiLabel(entry.ciClass),
    entry.challengeRating ? `cr ${entry.challengeRating}` : "",
    entry.spellLevel != null ? (entry.spellLevel === 0 ? "cantrip" : `level ${entry.spellLevel}`) : "",
    ...(entry.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export type LibrarySpellLevelFilter = "all" | number;
export type LibraryCrBandFilter = "all" | "0" | "frac" | "1-4" | "5-10" | "11+";

export const LIBRARY_SPELL_LEVEL_FILTERS: LibrarySpellLevelFilter[] = [
  "all",
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
];

export const LIBRARY_CR_BAND_FILTERS: LibraryCrBandFilter[] = [
  "all",
  "0",
  "frac",
  "1-4",
  "5-10",
  "11+",
];

export function spellLevelFilterLabel(filter: LibrarySpellLevelFilter): string {
  if (filter === "all") return "Any level";
  if (filter === 0) return "Cantrip";
  return `Lv ${filter}`;
}

export function crBandFilterLabel(filter: LibraryCrBandFilter): string {
  switch (filter) {
    case "all":
      return "Any CR";
    case "0":
      return "CR 0";
    case "frac":
      return "CR ⅛–½";
    case "1-4":
      return "CR 1–4";
    case "5-10":
      return "CR 5–10";
    case "11+":
      return "CR 11+";
  }
}

function challengeRatingValue(cr: string): number | null {
  if (cr.includes("/")) {
    const [num, den] = cr.split("/").map(Number);
    if (!num || !den) return null;
    return num / den;
  }
  const value = Number(cr);
  return Number.isFinite(value) ? value : null;
}

export function matchesBrowseSpellLevel(
  entry: LibraryListEntry,
  filter: LibrarySpellLevelFilter,
): boolean {
  if (filter === "all") return true;
  if (entry.spellLevel == null) return true;
  return entry.spellLevel === filter;
}

export function matchesBrowseCrBand(
  entry: LibraryListEntry,
  filter: LibraryCrBandFilter,
): boolean {
  if (filter === "all") return true;
  if (!entry.challengeRating) return true;
  const value = challengeRatingValue(entry.challengeRating);
  if (value == null) return true;
  if (filter === "0") return value === 0;
  if (filter === "frac") return value > 0 && value < 1;
  if (filter === "1-4") return value >= 1 && value <= 4;
  if (filter === "5-10") return value >= 5 && value <= 10;
  return value >= 11;
}

export function matchesBrowseProvenance(
  entry: LibraryListEntry,
  filter: LibraryBrowseProvenanceFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "included") return entry.provenance === "srd";
  return entry.provenance === "user";
}

export function matchesBrowseCiClass(
  entry: LibraryListEntry,
  ciClass: CiClass | "all",
): boolean {
  if (ciClass === "all") return true;
  return entry.ciClass === ciClass;
}

export function filterBrowseEntries(
  entries: LibraryListEntry[],
  opts: {
    search: string;
    ciClass: CiClass | "all";
    provenance: LibraryBrowseProvenanceFilter;
    spellLevel?: LibrarySpellLevelFilter;
    crBand?: LibraryCrBandFilter;
  },
): LibraryListEntry[] {
  return entries.filter(
    (e) =>
      matchesBrowseSearch(e, opts.search) &&
      matchesBrowseProvenance(e, opts.provenance) &&
      matchesBrowseCiClass(e, opts.ciClass) &&
      matchesBrowseSpellLevel(e, opts.spellLevel ?? "all") &&
      matchesBrowseCrBand(e, opts.crBand ?? "all"),
  );
}

/** Kind chips for the active shelf — only classes that appear in the current list. */
export function ciClassFilterOptions(
  shelf: WorkshopLibraryCategory,
  entries: LibraryListEntry[],
): CiClassFilterOption[] {
  const allowed =
    shelf === "all"
      ? (Object.keys(LIBRARY_CI_FANTASY_LABEL) as CiClass[])
      : SHELF_CI_CLASSES[shelf];

  const counts = new Map<CiClass, number>();
  for (const entry of entries) {
    if (!allowed.includes(entry.ciClass)) continue;
    counts.set(entry.ciClass, (counts.get(entry.ciClass) ?? 0) + 1);
  }

  const options: CiClassFilterOption[] = [
    { ciClass: "all", label: "Every kind", count: entries.length },
  ];

  for (const ciClass of allowed) {
    const count = counts.get(ciClass);
    if (!count) continue;
    options.push({
      ciClass,
      label: LIBRARY_CI_FANTASY_LABEL[ciClass],
      count,
    });
  }

  return options;
}

export function provenanceFilterLabel(filter: LibraryBrowseProvenanceFilter): string {
  switch (filter) {
    case "all":
      return "Any source";
    case "yours":
      return "Your collection";
    case "included":
      return "Included rules";
  }
}

export const LIBRARY_BROWSE_PROVENANCE_FILTERS: LibraryBrowseProvenanceFilter[] = [
  "all",
  "yours",
  "included",
];

/** Short shelf hint shown under the archive title. */
export function libraryShelfHint(shelf: WorkshopLibraryCategory): string {
  switch (shelf) {
    case "all":
      return "Everything on your shelves — lore, heroes, items, and chronicles.";
    case "seeds":
      return "Story notes the generators draw from — worlds, hooks, and handouts.";
    case "results":
      return "Finished pages from the Fantasy Forge — ready to print or copy.";
    case "characters":
      return "Standalone hero sheets — yours to edit and add to fellowships.";
    case "items":
      return "Gear and magic — your creations plus the included SRD catalogue.";
    case "world":
      return "Named NPCs and places — motives, secrets, and locations for your table.";
    case "rules":
      return "Spells, classes, and consolidated rule bundles from the bundled SRD — read-only reference.";
    case "monsters":
      return "Monster stat blocks from the bundled SRD bestiary — read-only reference.";
    case "parties":
      return "Fellowships assembled for the Virtual Table and campaigns.";
    case "campaigns":
      return "Chronicles that link your party, adventures, and treasures.";
    case "sessions":
      return "Play session logs — scenes, clues, loot, and promises from the table.";
  }
}

export function formatEntryShelfLine(entry: LibraryListEntry): string {
  const kind = fantasyCiLabel(entry.ciClass);
  if (entry.provenance === "srd") {
    return `${kind} · included with the app`;
  }
  if (entry.origin === "creation") {
    return `${kind} · crafted here`;
  }
  if (entry.origin === "import") {
    return `${kind} · brought from your books`;
  }
  return kind;
}

export function browseEmptyMessage(
  shelf: WorkshopLibraryCategory,
  scopedCampaignName?: string,
): string {
  if (scopedCampaignName) {
    return `Nothing on this shelf for “${scopedCampaignName}” yet — link entries on the Campaigns page, or show all shelves.`;
  }
  switch (shelf) {
    case "all":
      return "The shelves are empty. Craft something in the Fantasy Forge, or add a CF to begin.";
    case "seeds":
      return "No CFs yet — add story notes for the generators to build from.";
    case "results":
      return "No prepared scrolls yet — generate a realm, adventure, or map in the Fantasy Forge.";
    case "characters":
      return "No heroes on the shelf yet — create one in The Tavern.";
    case "items":
      return "No treasures catalogued yet — the included SRD gear is still here; add your own on the Items page.";
    case "rules":
      return "No rule tomes on this shelf — the bundled SRD reference is always available here.";
    case "monsters":
      return "No monsters on this shelf — the bundled SRD bestiary is always available here.";
    case "parties":
      return "No fellowships yet — gather heroes into a party in The Tavern.";
    case "campaigns":
      return "No chronicles yet — start a campaign to link your party and prep.";
    case "sessions":
      return "No session logs yet — record what happened at the table after each game.";
    case "world":
      return "No world entries yet — add an NPC or location to build your setting.";
  }
}
