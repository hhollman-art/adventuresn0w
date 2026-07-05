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

/** Workshop Library browse filters. */
export type WorkshopLibraryCategory = "all" | "seeds" | "results" | "parties" | "srd";

export type LibraryStorageCategory = "seeds" | "results" | "parties";

/** Legal / provenance tier shown in the UI. */
export type LibraryProvenance = "srd" | "user" | "generated";

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
  generated: "Your creation",
};

/** Where each tier physically lives — used verbatim in UI copy. */
export const LIBRARY_PROVENANCE_STORAGE: Record<LibraryProvenance, string> = {
  srd: "Ships with the app — the only data we host",
  user: "Yours — saved to your auto-save folder, never our servers",
  generated: "Yours — saved to your auto-save folder, never our servers",
};

export const LIBRARY_PROVENANCE_DESCRIPTION: Record<LibraryProvenance, string> = {
  srd: "Free rules bundled with D&D Easy (classes, spells, ancestries, CC BY 4.0). Read-only — you can't edit or delete these, and they never need saving.",
  user: "Files and text you bring in — party .md files, notes from books you own, or a restored backup. Saved automatically to your chosen folder (local or cloud-synced); never uploaded to a server.",
  generated: "Seeds you write and results the generators produce. Yours to edit, delete, and reuse. Saved automatically to your chosen folder (local or cloud-synced); never uploaded to a server.",
};

export const LIBRARY_PROVENANCE_TIERS: LibraryProvenance[] = [
  "srd",
  "user",
  "generated",
];

export type LibraryListEntry = {
  id: string;
  category: LibraryStorageCategory;
  provenance: LibraryProvenance;
  kindLabel: string;
  title: string;
  detail: string;
  createdAt: string;
  tags?: string[];
};

export function seedToLibraryEntry(seed: SavedRealmSeed): LibraryListEntry {
  return {
    id: seed.id,
    category: "seeds",
    provenance: "user",
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
    category: "results",
    provenance: "generated",
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
    category: "parties",
    provenance: roster.source === "import" ? "user" : "generated",
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
