import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import type { SavedCampaign } from "@/lib/campaigns";
import {
  getSrdEntity,
  srdEntityToPreviewMarkdown,
} from "@/lib/srd/corpus";
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
import type { WorkshopPreviewSnapshot } from "@/lib/workshop/previewSnapshot";

export type BuildLibraryPreviewSnapshotParams = {
  selection: LibraryViewSelection;
  seeds: SavedRealmSeed[];
  results: LibraryItem[];
  characters: SavedCharacter[];
  items: SavedGameItem[];
  parties: SavedCharacterRoster[];
  campaigns: SavedCampaign[];
  srdPreviewMarkdown?: string;
  srdPreviewLoading?: boolean;
  workspace?: string;
};

function libraryPreviewMarkdown(params: BuildLibraryPreviewSnapshotParams): string {
  const { selection, seeds, results, characters, items, parties, campaigns } = params;
  if (!selection) return "";

  if (selection.kind === "srd") {
    return params.srdPreviewMarkdown ?? "";
  }

  if (selection.kind === "srd-entity") {
    if (params.srdPreviewMarkdown !== undefined) return params.srdPreviewMarkdown;
    const entity = getSrdEntity(selection.entityId);
    return entity ? (srdEntityToPreviewMarkdown(entity) ?? "") : "";
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
    return `# ${campaign.name}\n\n${campaign.description.trim() || "Campaign container — links party, adventures, characters, and items by reference."}\n\n## Linked CFs\n\n- Party: ${campaign.partyId ? "linked" : "none"}\n- CFs: ${campaign.seedIds.length}\n- Results: ${campaign.resultIds.length}\n- Characters: ${campaign.characterIds.length}\n- Items: ${campaign.itemIds.length}\n\nManage links on the Campaigns page.`;
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
  const viewingParty =
    selection.kind === "party" ? params.parties.find((p) => p.id === selection.id) : undefined;

  const previewMarkdown = libraryPreviewMarkdown(params);
  const previewImages = viewingResult?.images ?? [];
  const isSrd = selection.kind === "srd" || selection.kind === "srd-entity";
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
  } else if (viewingParty) {
    viewingLabel = `Viewing party: ${viewingParty.name}`;
    viewingSubline = `${viewingParty.players.length} heroes`;
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

  let editKind: "none" | "result" | "seed" | "library-result" = "none";
  let canEdit = false;
  if (viewingSeed) {
    canEdit = true;
    editKind = "seed";
  } else if (viewingResult) {
    canEdit = true;
    editKind = "library-result";
  }

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
    progressStage: "idle",
    loading: false,
    imageLoading: false,
    error: null,
    imageError: null,
    partySaveMessage: null,
    srdLoading,
    autoMapEnabled: false,
    autoPropsEnabled: false,
    isSrdPreview: isSrd,
    canEdit,
    editKind,
    showSavePartyVtt: false,
    showLoadPartyVtt: Boolean(viewingParty),
    viewingPartyId: viewingParty?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
}
