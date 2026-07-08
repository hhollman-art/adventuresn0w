import {
  LIBRARY_KIND_LABEL,
  type LibraryItem,
} from "@/lib/generationLibrary";
import type { SavedCampaign } from "@/lib/campaigns";
import {
  GAME_ITEM_KIND_LABEL,
  MAGIC_RARITY_LABEL,
  type SavedGameItem,
} from "@/lib/itemLibrary";
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
  CHARACTER_SOURCE_LABEL,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import { characterSummary } from "@/lib/tabletop/character";
import {
  CI_CLASS_FOR_CAMPAIGN,
  CI_CLASS_FOR_LOCATION,
  CI_CLASS_FOR_NPC,
  CI_CLASS_FOR_PARTY,
  CI_CLASS_FOR_SESSION_RECORD,
  ciClassForGameItem,
  ciClassForResult,
  ciClassForSeed,
  type CiClass,
} from "@/lib/ciRegistry";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import { SESSION_EVENT_KIND_LABEL } from "@/lib/sessions/record";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import {
  LOCATION_KIND_LABEL,
  type SavedLocation,
} from "@/lib/worldAssets/location";
import type { SrdItemRef } from "@/lib/srd/srdItemRef";
import type { SrdEntityId } from "@/lib/srd/types";
import type { SavedCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import { srdEntityKindLabel } from "@/lib/srd/corpus";

/**
 * Workshop Library — the CMDB browse UI for every Creation File (CF) you own.
 * The SRD rules browser is a separate Library feature (toggle), not a category tab.
 */
export type WorkshopLibraryCategory =
  | "all"
  | "seeds"
  | "results"
  | "characters"
  | "items"
  | "world"
  | "rules"
  | "monsters"
  | "parties"
  | "campaigns"
  | "sessions";

export type LibraryStorageCategory = Exclude<WorkshopLibraryCategory, "all">;

/** Legal / provenance tier shown in the UI. Everything you own is one tier. */
export type LibraryProvenance = "srd" | "user";

/**
 * How a user-tier item entered the library. Creations save exactly like
 * imports (once, same tier, same folder) — the tag is the only difference.
 */
export type LibraryOrigin = "import" | "creation";

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
  srd: "Free rules bundled with D&D Easy (classes, spells, ancestries, equipment, CC BY 4.0). Read-only — you can't edit or delete these, and they never need saving.",
  user: "Everything you bring in or make — party files and notes from books you own, CFs you write, and results the generators produce. Things made in the app carry a Creation tag. All of it saves once, automatically, to your chosen folder (local or cloud-synced); never uploaded to a server.",
};

export const LIBRARY_PROVENANCE_TIERS: LibraryProvenance[] = ["srd", "user"];

export type LibraryListEntry = {
  id: string;
  /** CMDB class — the most specific Creation File (CF) type (see src/lib/ciRegistry.ts). */
  ciClass: CiClass;
  category: LibraryStorageCategory;
  provenance: LibraryProvenance;
  /** Only user-tier items have an origin; SRD entries never do. */
  origin?: LibraryOrigin;
  kindLabel: string;
  title: string;
  detail: string;
  createdAt: string;
  tags?: string[];
  /** Set for bundled SRD equipment / magic item rows (read-only catalogue Creation Files (CFs)). */
  srdItemRef?: SrdItemRef;
  /** Stable bundled SRD entity id (`spell:fireball`, `monster:goblin-warrior`, …). */
  srdEntityId?: SrdEntityId;
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

export function characterToLibraryEntry(character: SavedCharacter): LibraryListEntry {
  const p = character.player;
  return {
    id: character.id,
    ciClass: "character.sheet",
    category: "characters",
    provenance: "user",
    origin: character.source === "created" ? "creation" : "import",
    kindLabel: CHARACTER_SOURCE_LABEL[character.source],
    title: p.name,
    detail: characterSummary(p),
    createdAt: character.updatedAt,
  };
}

export function gameItemToLibraryEntry(item: SavedGameItem): LibraryListEntry {
  const rarity =
    item.kind === "magic" && item.rarity ? MAGIC_RARITY_LABEL[item.rarity] : "";
  return {
    id: item.id,
    ciClass: ciClassForGameItem(item.kind),
    category: "items",
    provenance: "user",
    origin: item.source === "created" ? "creation" : "import",
    kindLabel: GAME_ITEM_KIND_LABEL[item.kind],
    title: item.name,
    detail: [item.itemType, rarity].filter(Boolean).join(" · ") || item.description.slice(0, 80),
    createdAt: item.updatedAt,
  };
}

export function customSrdCategoryForKind(kind: SavedCustomSrdEntry["kind"]): LibraryStorageCategory {
  if (kind === "monster") return "monsters";
  if (kind === "equipment" || kind === "weapon" || kind === "armor" || kind === "magic-item") {
    return "items";
  }
  return "rules";
}

export function customSrdToLibraryEntry(entry: SavedCustomSrdEntry): LibraryListEntry {
  return {
    id: entry.id,
    ciClass: "rules.custom-entry",
    category: customSrdCategoryForKind(entry.kind),
    provenance: "user",
    origin: "creation",
    kindLabel: `Custom ${srdEntityKindLabel(entry.kind)}`,
    title: entry.name,
    detail:
      entry.subtitle?.trim() ||
      entry.markdown.trim().slice(0, 100) ||
      `Cloned from ${entry.sourceSrdEntityId}`,
    createdAt: entry.updatedAt,
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

export function campaignToLibraryEntry(campaign: SavedCampaign): LibraryListEntry {
  const linkCount =
    campaign.seedIds.length +
    campaign.resultIds.length +
    campaign.characterIds.length +
    campaign.itemIds.length +
    campaign.npcIds.length +
    campaign.locationIds.length +
    campaign.sessionRecordIds.length +
    (campaign.partyId ? 1 : 0);
  return {
    id: campaign.id,
    ciClass: CI_CLASS_FOR_CAMPAIGN,
    category: "campaigns",
    provenance: "user",
    origin: "creation",
    kindLabel: "Campaign",
    title: campaign.name,
    detail:
      campaign.description.trim().slice(0, 100) ||
      `${linkCount} linked entr${linkCount === 1 ? "y" : "ies"}`,
    createdAt: campaign.updatedAt,
  };
}

export function npcToLibraryEntry(npc: SavedNpc): LibraryListEntry {
  return {
    id: npc.id,
    ciClass: CI_CLASS_FOR_NPC,
    category: "world",
    provenance: "user",
    origin: npc.source === "created" ? "creation" : "import",
    kindLabel: "NPC",
    title: npc.name,
    detail: npc.briefDescription.trim() || npc.motivation.trim().slice(0, 100) || "Named NPC",
    createdAt: npc.updatedAt,
    ...(npc.tags.length ? { tags: npc.tags } : {}),
  };
}

export function locationToLibraryEntry(location: SavedLocation): LibraryListEntry {
  return {
    id: location.id,
    ciClass: CI_CLASS_FOR_LOCATION,
    category: "world",
    provenance: "user",
    origin: location.source === "created" ? "creation" : "import",
    kindLabel: LOCATION_KIND_LABEL[location.locationKind],
    title: location.name,
    detail:
      location.timelineNotes.trim().slice(0, 100) ||
      `${LOCATION_KIND_LABEL[location.locationKind]} · world place`,
    createdAt: location.updatedAt,
  };
}

export function sessionRecordToLibraryEntry(record: SavedSessionRecord): LibraryListEntry {
  const title =
    record.title.trim() || `Session ${record.sessionNumber}`;
  const eventNote =
    record.events.length > 0
      ? `${record.events.length} event${record.events.length === 1 ? "" : "s"}`
      : "";
  return {
    id: record.id,
    ciClass: CI_CLASS_FOR_SESSION_RECORD,
    category: "sessions",
    provenance: "user",
    origin: "creation",
    kindLabel: "Session log",
    title,
    detail: record.summary.trim().slice(0, 100) || eventNote || "Play session record",
    createdAt: record.playedAt,
  };
}

export function sessionRecordToMarkdown(record: SavedSessionRecord): string {
  const lines = [
    `# ${record.title.trim() || `Session ${record.sessionNumber}`}`,
    "",
    `**Played:** ${record.playedAt.slice(0, 10)} · **Session #** ${record.sessionNumber}`,
    "",
    record.summary.trim() || "_No summary yet._",
    "",
  ];
  if (record.events.length > 0) {
    lines.push("## Events", "");
    for (const event of record.events) {
      const kind = SESSION_EVENT_KIND_LABEL[event.kind];
      lines.push(`- **${kind}**${event.at ? ` (${event.at})` : ""}: ${event.text}`);
    }
    lines.push("");
  }
  if (record.followUpTasks.length > 0) {
    lines.push("## Follow-ups", "");
    for (const task of record.followUpTasks) {
      lines.push(`- ${task}`);
    }
  }
  return lines.join("\n");
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
  if (category === "all") return entries;
  return entries.filter((e) => e.category === category);
}

export function sortLibraryEntries(entries: LibraryListEntry[]): LibraryListEntry[] {
  return [...entries].sort((a, b) => {
    if (a.provenance !== b.provenance) {
      return a.provenance === "user" ? -1 : 1;
    }
    if (a.provenance === "srd") {
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
