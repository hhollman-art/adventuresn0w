import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { SavedCampaign } from "@/lib/campaigns";
import {
  getSrdEntity,
  srdEntityToPreviewMarkdown,
} from "@/lib/srd/corpus";
import { buildSrdRuleBundleMarkdown } from "@/lib/srd/srdRuleBundles";
import {
  LIBRARY_KIND_LABEL,
  type LibraryItem,
  type LibraryKind,
} from "@/lib/generationLibrary";
import { GAME_ITEM_KIND_LABEL, type SavedGameItem } from "@/lib/itemLibrary";
import { characterSummary } from "@/lib/tabletop/character";
import { characterToMarkdownFile } from "@/lib/tabletop/characterMarkdown";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import type { SavedCharacterRoster } from "@/lib/tabletop/characterRoster";
import { SEED_KIND_LABEL, seedDisplayName, type SavedRealmSeed } from "@/lib/realmSeeds";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import { sessionRecordToMarkdown } from "@/lib/workshop/libraryCatalog";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import type { SavedCustomSrdEntry } from "@/lib/srd/srdCustomLibrary";
import type { WorkshopPreviewSnapshot } from "@/lib/workshop/previewSnapshot";
import { resolvePreviewCiClass } from "@/lib/workshop/previewCiClass";
import { planPreviewCommit } from "@/lib/workshop/previewCommit";

export type BuildLibraryPreviewSnapshotParams = {
  selection: LibraryViewSelection;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  campaigns: SavedCampaign[];
  npcs: SavedNpc[];
  locations: SavedLocation[];
  sessionRecords: SavedSessionRecord[];
  customSrdEntries?: SavedCustomSrdEntry[];
  srdPreviewMarkdown?: string;
  srdPreviewLoading?: boolean;
  workspace?: string;
  partySaveMessage?: string | null;
};

function libraryPreviewMarkdown(params: BuildLibraryPreviewSnapshotParams): string {
  const { selection, seeds, results, characters, items, parties, campaigns, npcs, locations, sessionRecords } = params;
  if (!selection) return "";

  if (selection.kind === "srd") {
    return params.srdPreviewMarkdown ?? "";
  }

  if (selection.kind === "srd-entity") {
    if (params.srdPreviewMarkdown !== undefined) return params.srdPreviewMarkdown;
    const entity = getSrdEntity(selection.entityId);
    return entity ? (srdEntityToPreviewMarkdown(entity) ?? "") : "";
  }

  if (selection.kind === "srd-bundle") {
    return buildSrdRuleBundleMarkdown(selection.bundleId);
  }

  if (selection.kind === "custom-srd") {
    return params.customSrdEntries?.find((row) => row.id === selection.id)?.markdown ?? "";
  }

  if (selection.kind === "character") {
    const character = characters.find((c) => c.id === selection.id);
    return character ? characterToMarkdownFile(character.player) : "";
  }

  if (selection.kind === "item") {
    const item = items.find((i) => i.id === selection.id);
    if (!item) return "";
    return `# ${item.name}\n\n${item.description.trim() || `${GAME_ITEM_KIND_LABEL[item.kind]} · ${item.itemType}`.trim()}`;
  }

  if (selection.kind === "campaign") {
    const campaign = campaigns.find((c) => c.id === selection.id);
    if (!campaign) return "";
    return `# ${campaign.name}\n\n${campaign.description.trim() || "Campaign container — links party, adventures, characters, and items by reference."}\n\n## Linked CFs\n\n- Party: ${campaign.partyId ? "linked" : "none"}\n- CFs: ${campaign.seedIds.length}\n- Results: ${campaign.resultIds.length}\n- Characters: ${campaign.characterIds.length}\n- Items: ${campaign.itemIds.length}\n- NPCs: ${campaign.npcIds.length}\n- Locations: ${campaign.locationIds.length}\n- Session logs: ${campaign.sessionRecordIds.length}\n\nManage links on the Campaigns page.`;
  }

  if (selection.kind === "npc") {
    const npc = npcs.find((n) => n.id === selection.id);
    if (!npc) return "";
    const parts = [npc.markdown.trim() || `# ${npc.name}\n`];
    if (npc.motivation.trim()) parts.push(`\n## Motivation\n\n${npc.motivation.trim()}`);
    if (npc.secrets.trim()) parts.push(`\n## Secrets\n\n${npc.secrets.trim()}`);
    return parts.join("");
  }

  if (selection.kind === "location") {
    return locations.find((l) => l.id === selection.id)?.markdown ?? "";
  }

  if (selection.kind === "session") {
    const record = sessionRecords.find((r) => r.id === selection.id);
    return record ? sessionRecordToMarkdown(record) : "";
  }

  if (selection.kind === "seed") {
    return seeds.find((s) => s.id === selection.id)?.markdown ?? "";
  }

  if (selection.kind === "result") {
    return results.find((r) => r.id === selection.id)?.markdown ?? "";
  }

  if (selection.kind === "party") {
    return parties.find((p) => p.id === selection.id)?.markdown ?? "";
  }

  return "";
}

/** Build a preview snapshot for a library selection (sync-safe before opening /preview). */
export function buildLibraryPreviewSnapshot(
  params: BuildLibraryPreviewSnapshotParams,
): WorkshopPreviewSnapshot | null {
  const { selection } = params;
  if (!selection) return null;

  const viewingSeed =
    selection.kind === "seed" ? params.seeds.find((s) => s.id === selection.id) : undefined;
  const viewingResult =
    selection.kind === "result" ? params.results.find((r) => r.id === selection.id) : undefined;
  const viewingCharacter =
    selection.kind === "character"
      ? params.characters.find((c) => c.id === selection.id)
      : undefined;
  const viewingItem =
    selection.kind === "item" ? params.items.find((i) => i.id === selection.id) : undefined;
  const viewingCampaign =
    selection.kind === "campaign"
      ? params.campaigns.find((c) => c.id === selection.id)
      : undefined;
  const viewingNpc =
    selection.kind === "npc" ? params.npcs.find((n) => n.id === selection.id) : undefined;
  const viewingLocation =
    selection.kind === "location"
      ? params.locations.find((l) => l.id === selection.id)
      : undefined;
  const viewingSession =
    selection.kind === "session"
      ? params.sessionRecords.find((r) => r.id === selection.id)
      : undefined;
  const viewingCustomSrd =
    selection.kind === "custom-srd"
      ? params.customSrdEntries?.find((row) => row.id === selection.id)
      : undefined;
  const viewingParty =
    selection.kind === "party" ? params.parties.find((p) => p.id === selection.id) : undefined;

  const previewMarkdown = libraryPreviewMarkdown(params);
  const previewImages = viewingResult?.images ?? [];
  const isSrd =
    selection.kind === "srd" ||
    selection.kind === "srd-entity" ||
    selection.kind === "srd-bundle";
  const srdLoading =
    params.srdPreviewLoading ??
    ((selection.kind === "srd" || selection.kind === "srd-entity") &&
      !previewMarkdown.trim());

  let viewingLabel: string | null = null;
  let viewingSubline: string | null = null;
  if (viewingSeed) {
    viewingLabel = `Viewing CF: ${seedDisplayName(viewingSeed)}`;
    viewingSubline = SEED_KIND_LABEL[viewingSeed.kind];
  } else if (viewingResult) {
    viewingLabel = `Viewing result: ${viewingResult.title}`;
    viewingSubline = LIBRARY_KIND_LABEL[viewingResult.kind];
  } else if (viewingCharacter) {
    viewingLabel = `Viewing hero: ${viewingCharacter.player.name}`;
    viewingSubline = characterSummary(viewingCharacter.player);
  } else if (viewingItem) {
    viewingLabel = `Viewing item: ${viewingItem.name}`;
    viewingSubline = GAME_ITEM_KIND_LABEL[viewingItem.kind];
  } else if (viewingCampaign) {
    viewingLabel = `Viewing campaign: ${viewingCampaign.name}`;
  } else if (viewingNpc) {
    viewingLabel = `Viewing NPC: ${viewingNpc.name}`;
  } else if (viewingLocation) {
    viewingLabel = `Viewing location: ${viewingLocation.name}`;
  } else if (viewingSession) {
    viewingLabel = `Viewing session: ${viewingSession.title || `Session ${viewingSession.sessionNumber}`}`;
  } else if (viewingParty) {
    viewingLabel = `Viewing party: ${viewingParty.name}`;
    viewingSubline = `${viewingParty.players.length} heroes`;
  } else if (viewingCustomSrd) {
    viewingLabel = `Editing: ${viewingCustomSrd.name}`;
    viewingSubline = "Your workspace copy — editable";
  } else if (selection.kind === "srd-bundle") {
    viewingLabel = `Viewing SRD bundle: ${selection.name}`;
    viewingSubline = "read-only · consolidated rule sections";
  } else if (isSrd) {
    viewingLabel = `Viewing SRD: ${selection.name}`;
    viewingSubline = "read-only";
  }

  const outputLayoutKind: LibraryKind = viewingSeed
    ? viewingSeed.kind
    : viewingResult
      ? viewingResult.kind
      : viewingCharacter
        ? "characters"
        : viewingParty
          ? "characters"
          : "adventure";

  let editKind: "none" | "result" | "seed" | "library-result" | "custom-srd" = "none";
  let canEdit = false;
  if (viewingCustomSrd) {
    canEdit = true;
    editKind = "custom-srd";
  } else if (viewingSeed) {
    canEdit = true;
    editKind = "seed";
  } else if (viewingResult) {
    canEdit = true;
    editKind = "library-result";
  }

  const commitPlan = planPreviewCommit({
    hasContent: Boolean(previewMarkdown.trim() || previewImages.length > 0),
    loading: false,
    isSrdPreview: isSrd,
    showHeroRecruit: false,
    isLibraryView: true,
    hasViewingResult: Boolean(viewingResult),
    committedLibraryId: viewingResult?.id ?? null,
  });

  return {
    markdown: previewMarkdown,
    images: previewImages,
    textModel: viewingResult?.textModel ?? null,
    imageModel: viewingResult?.imageModel ?? null,
    outputLayoutKind,
    workspace: params.workspace ?? "welcome",
    isLibraryView: true,
    viewingLabel,
    viewingSubline,
    ciClass: resolvePreviewCiClass({
      selection,
      viewingSeed,
      viewingResult,
      viewingCharacter,
      viewingItem,
      viewingCampaign,
      viewingNpc,
      viewingLocation,
      viewingSession,
      viewingParty,
      viewingCustomSrd,
      isSrdPreview: isSrd,
    }),
    progressStage: "idle",
    loading: false,
    imageLoading: false,
    error: null,
    imageError: null,
    partySaveMessage: params.partySaveMessage ?? null,
    srdLoading,
    autoMapEnabled: false,
    autoPropsEnabled: false,
    isSrdPreview: isSrd,
    canEdit,
    editKind,
    customSrdId: viewingCustomSrd?.id ?? null,
    showSavePartyVtt: false,
    showLoadPartyVtt: Boolean(viewingParty),
    viewingPartyId: viewingParty?.id ?? null,
    showPrimaryCommit: commitPlan.show,
    primaryCommitLabel: commitPlan.label || "Save to Library",
    updatedAt: new Date().toISOString(),
  };
}
