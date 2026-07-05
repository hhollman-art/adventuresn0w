import {
  LIBRARY_KIND_LABEL,
  type LibraryItem,
} from "@/lib/generationLibrary";
import {
  seedDisplayName,
  seedScopeLabel,
  SEED_KIND_LABEL,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import { SRD_CATALOGUE } from "@/lib/srd";
import { SRD_API_CATEGORIES } from "@/lib/srd/dnd5eApi";
import {
  PARTY_SOURCE_LABEL,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  CI_CLASS_FOR_PARTY,
  ciClassForResult,
  ciClassForSeed,
  type CiClass,
} from "@/lib/ciRegistry";

/** Workshop Library browse filters. */
export type WorkshopLibraryCategory = "all" | "seeds" | "results" | "parties" | "srd";

export type LibraryStorageCategory = "seeds" | "results" | "parties";

/** Legal / provenance tier shown in the UI. Everything you own is one tier. */
export type LibraryProvenance = "srd" | "user";

/**
 * How a user-tier item entered the library. Creations save exactly like
 * imports (once, same tier, same folder) — the tag is the only difference.
 */
export type LibraryOrigin = "import" | "creation";

export const WORKSHOP_LIBRARY_CATEGORY_LABEL: Record<
  Exclude<WorkshopLibraryCategory, "all">,
  string
> = {
  seeds: "Seeds",
  results: "Results",
  parties: "Parties",
  srd: "SRD rules",
};

export const LIBRARY_PROVENANCE_LABEL: Record<LibraryProvenance, string> = {
  srd: "Included (SRD)",
  user: "Your import",
};

export const LIBRARY_ORIGIN_LABEL: Record<LibraryOrigin, string> = {
  import: "Import",
  creation: "Creation",
};

/** Where each tier physically lives — used verbatim in UI copy. */
export const LIBRARY_PROVENANCE_STORAGE: Record<LibraryProvenance, string> = {
  srd: "Ships with the app — the only data we host",
  user: "Yours — saved to your auto-save folder, never our servers",
};

export const LIBRARY_PROVENANCE_DESCRIPTION: Record<LibraryProvenance, string> = {
  srd: "Free rules bundled with D&D Easy (classes, spells, ancestries, CC BY 4.0). Read-only — you can't edit or delete these, and they never need saving.",
  user: "Everything you bring in or make — party files and notes from books you own, seeds you write, and results the generators produce. Things made in the app carry a Creation tag. All of it saves once, automatically, to your chosen folder (local or cloud-synced); never uploaded to a server.",
};

export const LIBRARY_PROVENANCE_TIERS: LibraryProvenance[] = ["srd", "user"];

export type LibraryListEntry = {
  id: string;
  /** CMDB class — the most specific CI type (see src/lib/ciRegistry.ts). */
  ciClass: CiClass;
  category: LibraryStorageCategory;
  provenance: LibraryProvenance;
  /** Only user-tier items have an origin; SRD entries never do. */
  origin: LibraryOrigin;
  kindLabel: string;
  title: string;
  detail: string;
  createdAt: string;
  tags?: string[];
};

export function seedToLibraryEntry(seed: SavedRealmSeed): LibraryListEntry {
  return {
    id: seed.id,
    ciClass: ciClassForSeed(seed.kind),
    category: "seeds",
    provenance: "user",
    origin: "creation",
    kindLabel: SEED_KIND_LABEL[seed.kind],
    title: seedDisplayName(seed),
    detail: seed.briefDescription.trim() || seedScopeLabel(seed),
    createdAt: seed.createdAt,
    ...(seed.tags?.length ? { tags: seed.tags } : {}),
  };
}

export function resultToLibraryEntry(item: LibraryItem): LibraryListEntry {
  const imageNote =
    item.images.length > 0 ? `${item.images.length} image${item.images.length === 1 ? "" : "s"}` : "";
  return {
    id: item.id,
    ciClass: ciClassForResult(item.kind),
    category: "results",
    provenance: "user",
    origin: "creation",
    kindLabel: LIBRARY_KIND_LABEL[item.kind],
    title: item.title,
    detail: imageNote || item.markdown.trim().slice(0, 120),
    createdAt: item.createdAt,
  };
}

export function partyToLibraryEntry(roster: SavedCharacterRoster): LibraryListEntry {
  const count = roster.players.length;
  return {
    id: roster.id,
    ciClass: CI_CLASS_FOR_PARTY,
    category: "parties",
    provenance: "user",
    origin:
      roster.source === "import" || roster.source === "dndbeyond" ? "import" : "creation",
    kindLabel: PARTY_SOURCE_LABEL[roster.source],
    title: roster.name,
    detail: `${count} character${count === 1 ? "" : "s"}`,
    createdAt: roster.updatedAt,
  };
}

export type SrdCatalogueSummary = {
  version: string;
  documentPdfId: string;
  apiCategoryCount: number;
  classCount: number;
  spellCount: number;
  ancestryCount: number;
};

export function srdCatalogueSummary(): SrdCatalogueSummary {
  return {
    version: SRD_CATALOGUE.version,
    documentPdfId: "SRD_CC_v5.2.1",
    apiCategoryCount: SRD_API_CATEGORIES.length,
    classCount: SRD_CATALOGUE.classes.length,
    spellCount: SRD_CATALOGUE.spells.length,
    ancestryCount: SRD_CATALOGUE.ancestries.length,
  };
}

export function filterLibraryEntries(
  entries: LibraryListEntry[],
  category: WorkshopLibraryCategory,
): LibraryListEntry[] {
  if (category === "all" || category === "srd") return entries;
  return entries.filter((e) => e.category === category);
}

export function sortLibraryEntries(entries: LibraryListEntry[]): LibraryListEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
