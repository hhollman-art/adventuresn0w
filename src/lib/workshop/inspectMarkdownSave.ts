import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import { updateGenerationLibraryItem } from "@/lib/generationLibrary";
import { updateGameItem, loadSavedGameItems } from "@/lib/itemLibrary";
import { loadRealmSeeds, updateRealmSeed } from "@/lib/realmSeeds";
import { updateCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import { updateSessionRecord } from "@/lib/sessions/record";
import { loadSavedNpcs, updateNpc } from "@/lib/worldAssets/npc";
import { loadSavedLocations, updateLocation } from "@/lib/worldAssets/location";
import { firstHeading } from "@/lib/workshop/previewExport";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";

export function inspectEditMode(
  selection: LibraryViewSelection,
): "markdown" | "workplace" | "readonly" {
  if (!selection) return "readonly";
  switch (selection.kind) {
    case "seed":
    case "result":
    case "custom-srd":
    case "npc":
    case "location":
    case "item":
    case "session":
      return "markdown";
    case "character":
    case "party":
    case "campaign":
      return "workplace";
    default:
      return "readonly";
  }
}

export function inspectWorkplaceHref(selection: LibraryViewSelection): string | null {
  if (!selection) return null;
  switch (selection.kind) {
    case "character":
    case "party":
      return "/tavern";
    case "campaign":
      return "/campaigns";
    case "item":
      return "/items";
    default:
      return "/library";
  }
}

/** Persist inspector markdown edits into the existing storage module for this CF. */
export async function saveInspectedMarkdown(
  selection: NonNullable<LibraryViewSelection>,
  markdown: string,
): Promise<void> {
  if (!selection || !("kind" in selection)) return;
  const md = markdown;

  if (selection.kind === "result") {
    const title = firstHeading(md) ?? "Untitled";
    await updateGenerationLibraryItem(selection.id, { title, markdown: md });
  } else if (selection.kind === "seed") {
    const seeds = await loadRealmSeeds();
    const seed = seeds.find((row) => row.id === selection.id);
    if (seed) {
      await updateRealmSeed(selection.id, {
        kind: seed.kind,
        seedName: seed.seedName ?? "",
        realmSize: seed.realmSize,
        titleHint: firstHeading(md) ?? seed.titleHint,
        briefDescription: seed.briefDescription,
        markdown: md,
        tags: seed.tags,
      });
    }
  } else if (selection.kind === "custom-srd") {
    await updateCustomSrdEntry(selection.id, { markdown: md });
  } else if (selection.kind === "npc") {
    const npcs = await loadSavedNpcs();
    const npc = npcs.find((row) => row.id === selection.id);
    if (npc) {
      await updateNpc(selection.id, {
        name: npc.name,
        briefDescription: npc.briefDescription,
        tags: npc.tags,
        motivation: npc.motivation,
        secrets: npc.secrets,
        statBlockRef: npc.statBlockRef,
        locationId: npc.locationId,
        factionIds: npc.factionIds,
        markdown: md,
        source: npc.source,
      });
    }
  } else if (selection.kind === "location") {
    const locations = await loadSavedLocations();
    const location = locations.find((row) => row.id === selection.id);
    if (location) {
      await updateLocation(selection.id, {
        name: location.name,
        locationKind: location.locationKind,
        parentLocationId: location.parentLocationId,
        inhabitantNpcIds: location.inhabitantNpcIds,
        factionIds: location.factionIds,
        timelineNotes: location.timelineNotes,
        markdown: md,
        source: location.source,
      });
    }
  } else if (selection.kind === "item") {
    const items = await loadSavedGameItems();
    const item = items.find((row) => row.id === selection.id);
    if (item) {
      await updateGameItem(selection.id, {
        kind: item.kind,
        name: item.name,
        itemType: item.itemType,
        rarity: item.rarity,
        requiresAttunement: item.requiresAttunement,
        attunementNote: item.attunementNote,
        description: md,
        properties: item.properties,
        charges: item.charges,
        effects: item.effects,
        bonuses: item.bonuses,
        isHomebrew: item.isHomebrew,
        createdBy: item.createdBy,
        tags: item.tags,
        settingTags: item.settingTags,
        sourceNote: item.sourceNote,
        imageDataUrl: item.imageDataUrl,
      });
    }
  } else if (selection.kind === "session") {
    await updateSessionRecord(selection.id, { summary: md });
  }

  scheduleLibrarySnapshot();
}
