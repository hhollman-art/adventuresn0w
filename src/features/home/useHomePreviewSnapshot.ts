"use client";

import { useEffect, useRef } from "react";
import type { LibraryViewSelection } from "@/features/workshop/WorkshopLibraryPanel";
import { autoLinkToActiveCampaign } from "@/lib/campaigns";
import type { SavedCampaign } from "@/lib/campaigns";
import type { SavedSessionRecord } from "@/lib/sessions/record";
import type { SavedNpc } from "@/lib/worldAssets/npc";
import type { SavedLocation } from "@/lib/worldAssets/location";
import {
  LIBRARY_KIND_LABEL,
  type LibraryItem,
  type LibraryKind,
} from "@/lib/generationLibrary";
import { GAME_ITEM_KIND_LABEL, type SavedGameItem } from "@/lib/itemLibrary";
import { fetchDnd5eResource } from "@/lib/srd/dnd5eApi";
import {
  getSrdEntity,
  KIND_TO_API_RESOURCE,
  srdEntityToPreviewMarkdown,
} from "@/lib/srd/corpus";
import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { buildSrdPreviewMarkdown } from "@/lib/srd/srdPreviewMarkdown";
import { characterSummary } from "@/lib/tabletop/character";
import { characterToMarkdownFile } from "@/lib/tabletop/characterMarkdown";
import type { SavedCharacter } from "@/lib/tabletop/characterLibrary";
import {
  saveCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import { queuePartyImport } from "@/lib/tabletop/partyCampaign";
import { THE_TAVERN } from "@/lib/workplace/forgeLexicon";
import { buildLibraryPreviewSnapshot } from "@/lib/workshop/libraryPreviewSnapshot";
import {
  isPreviewReadyMessage,
  PREVIEW_SYNC_CHANNEL,
  publishPreviewSnapshot,
} from "@/lib/workshop/previewSnapshot";
import { resolvePreviewCiClass } from "@/lib/workshop/previewCiClass";
import { SEED_KIND_LABEL, seedDisplayName, type SavedRealmSeed } from "@/lib/realmSeeds";
import type { GeneratedImage, ProgressStage, WorkshopWorkspace } from "./homeTypes";

export type UseHomePreviewSnapshotParams = {
  isLibraryView: boolean;
  isWelcomeView: boolean;
  workspace: WorkshopWorkspace;
  markdown: string;
  model: string | null;
  mapImages: GeneratedImage[];
  imageModel: string | null;
  librarySelection: LibraryViewSelection;
  ddeasySeeds: SavedRealmSeed[];
  libraryResults: LibraryItem[];
  libraryCharacters: SavedCharacter[];
  libraryItems: SavedGameItem[];
  libraryParties: SavedCharacterRoster[];
  libraryCampaigns: SavedCampaign[];
  libraryNpcs: SavedNpc[];
  libraryLocations: SavedLocation[];
  librarySessionRecords: SavedSessionRecord[];
  progressStage: ProgressStage;
  loading: boolean;
  imageLoading: boolean;
  error: string | null;
  imageError: string | null;
  partySaveMessage: string | null;
  setPartySaveMessage: (message: string | null) => void;
  srdPreviewMarkdown: string;
  setSrdPreviewMarkdown: (markdown: string) => void;
  srdPreviewLoading: boolean;
  setSrdPreviewLoading: (loading: boolean) => void;
  autoGenerateAdventureMap: boolean;
  autoGenerateAdventureProps: boolean;
  openResultEditor: () => void;
  openEditSeedEditor: (id: string) => void;
  openLibraryResultEditor: () => void;
};

export function useHomePreviewSnapshot(params: UseHomePreviewSnapshotParams) {
  const {
    isLibraryView,
    isWelcomeView,
    workspace,
    markdown,
    model,
    mapImages,
    imageModel,
    librarySelection,
    ddeasySeeds,
    libraryResults,
    libraryCharacters,
    libraryItems,
    libraryParties,
    libraryCampaigns,
    libraryNpcs,
    libraryLocations,
    librarySessionRecords,
    progressStage,
    loading,
    imageLoading,
    error,
    imageError,
    partySaveMessage,
    setPartySaveMessage,
    srdPreviewMarkdown,
    setSrdPreviewMarkdown,
    srdPreviewLoading,
    setSrdPreviewLoading,
    autoGenerateAdventureMap,
    autoGenerateAdventureProps,
    openResultEditor,
    openEditSeedEditor,
    openLibraryResultEditor,
  } = params;

  const viewingSeed =
    librarySelection?.kind === "seed"
      ? ddeasySeeds.find((s) => s.id === librarySelection.id)
      : undefined;
  const viewingResult =
    librarySelection?.kind === "result"
      ? libraryResults.find((r) => r.id === librarySelection.id)
      : undefined;
  const viewingCharacter =
    librarySelection?.kind === "character"
      ? libraryCharacters.find((c) => c.id === librarySelection.id)
      : undefined;
  const viewingItem =
    librarySelection?.kind === "item"
      ? libraryItems.find((i) => i.id === librarySelection.id)
      : undefined;
  const viewingCampaign =
    librarySelection?.kind === "campaign"
      ? libraryCampaigns.find((c) => c.id === librarySelection.id)
      : undefined;
  const viewingParty =
    librarySelection?.kind === "party"
      ? libraryParties.find((p) => p.id === librarySelection.id)
      : undefined;

  useEffect(() => {
    if (
      !isLibraryView ||
      (librarySelection?.kind !== "srd" && librarySelection?.kind !== "srd-entity")
    ) {
      setSrdPreviewMarkdown("");
      setSrdPreviewLoading(false);
      return;
    }

    if (librarySelection.kind === "srd-entity") {
      const entity = getSrdEntity(librarySelection.entityId);
      if (!entity) {
        setSrdPreviewMarkdown("");
        setSrdPreviewLoading(false);
        return;
      }

      const bundled = srdEntityToPreviewMarkdown(entity);
      if (bundled?.trim()) {
        setSrdPreviewMarkdown(bundled);
        setSrdPreviewLoading(false);
        return;
      }

      const resource = KIND_TO_API_RESOURCE[entity.kind];
      if (!resource) {
        setSrdPreviewMarkdown("");
        setSrdPreviewLoading(false);
        return;
      }

      let cancelled = false;
      setSrdPreviewLoading(true);
      setSrdPreviewMarkdown("");

      void fetchDnd5eResource(resource, entity.key)
        .then((data) => {
          if (cancelled) return;
          setSrdPreviewMarkdown(
            buildSrdPreviewMarkdown({
              resource,
              index: entity.key,
              name: entity.name,
              apiData: data,
            }),
          );
        })
        .catch((err) => {
          if (cancelled) return;
          setSrdPreviewMarkdown(
            `# ${entity.name}\n\nCould not load this SRD entry: ${err instanceof Error ? err.message : "Unknown error"}.`,
          );
        })
        .finally(() => {
          if (!cancelled) setSrdPreviewLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const { resource, index, name } = librarySelection;
    let cancelled = false;

    const bundled = lookupSrdDocumentMarkdown({ resource, name, index });
    if (bundled?.trim()) {
      setSrdPreviewMarkdown(bundled);
      setSrdPreviewLoading(false);
      return;
    }

    setSrdPreviewLoading(true);
    setSrdPreviewMarkdown("");

    void fetchDnd5eResource(resource, index)
      .then((data) => {
        if (cancelled) return;
        setSrdPreviewMarkdown(
          buildSrdPreviewMarkdown({ resource, index, name, apiData: data }),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setSrdPreviewMarkdown(
          `# ${name}\n\nCould not load this SRD entry: ${err instanceof Error ? err.message : "Unknown error"}.`,
        );
      })
      .finally(() => {
        if (!cancelled) setSrdPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isLibraryView,
    librarySelection,
    setSrdPreviewLoading,
    setSrdPreviewMarkdown,
  ]);

  const previewMarkdown = isLibraryView
    ? librarySelection?.kind === "srd" || librarySelection?.kind === "srd-entity"
      ? srdPreviewMarkdown
      : viewingCharacter
        ? characterToMarkdownFile(viewingCharacter.player)
        : viewingItem
          ? `# ${viewingItem.name}\n\n${viewingItem.description.trim() || `${GAME_ITEM_KIND_LABEL[viewingItem.kind]} · ${viewingItem.itemType}`.trim()}`
          : viewingCampaign
            ? `# ${viewingCampaign.name}\n\n${viewingCampaign.description.trim() || "Campaign container — links party, adventures, characters, and items by reference."}\n\n## Linked CFs\n\n- Party: ${viewingCampaign.partyId ? "linked" : "none"}\n- CFs: ${viewingCampaign.seedIds.length}\n- Results: ${viewingCampaign.resultIds.length}\n- Characters: ${viewingCampaign.characterIds.length}\n- Items: ${viewingCampaign.itemIds.length}\n\nManage links on the Campaigns page.`
            : (viewingSeed?.markdown ??
              viewingResult?.markdown ??
              viewingParty?.markdown ??
              "")
    : markdown;

  function exportMarkdownForDownload(): string {
    return previewMarkdown;
  }

  async function savePartyForVtt() {
    const md = exportMarkdownForDownload();
    if (!md.trim()) return;
    setPartySaveMessage(null);
    const parsed = parseCharactersMarkdown(md);
    if (parsed.players.length === 0) {
      setPartySaveMessage(
        "Could not find any heroes. Each hero needs a ### heading under ## Characters.",
      );
      return;
    }
    try {
      const rosters = await saveCharacterRoster({
        name: parsed.rosterName,
        markdown: md,
        source: "workshop",
        players: parsed.players,
      });
      if (rosters[0]) void autoLinkToActiveCampaign({ partyId: rosters[0].id });
      setPartySaveMessage(
        `Saved ${parsed.players.length} hero${parsed.players.length === 1 ? "" : "es"} as "${parsed.rosterName}". Open ${THE_TAVERN} or the Virtual Table to load them.`,
      );
    } catch (err) {
      setPartySaveMessage(
        err instanceof Error ? err.message : "Could not save party to your library.",
      );
    }
  }

  const previewImages: GeneratedImage[] = isLibraryView
    ? (viewingResult?.images ?? [])
    : mapImages;
  const previewTextModel = isLibraryView ? (viewingResult?.textModel ?? null) : model;
  const previewImageModel = isLibraryView
    ? (viewingResult?.imageModel ?? null)
    : imageModel;
  const outputLayoutKind: LibraryKind = viewingSeed
    ? viewingSeed.kind
    : viewingResult
      ? viewingResult.kind
      : viewingCharacter
        ? "characters"
        : viewingParty
          ? "characters"
          : isLibraryView
            ? "adventure"
            : workspace === "welcome"
              ? "adventure"
              : (workspace as LibraryKind);

  const republishRef = useRef<(() => void) | null>(null);

  republishRef.current = () => {
    if (isWelcomeView) return;

    if (isLibraryView) {
      if (!librarySelection) return;
      const snapshot = buildLibraryPreviewSnapshot({
        selection: librarySelection,
        seeds: ddeasySeeds,
        results: libraryResults,
        characters: libraryCharacters,
        items: libraryItems,
        parties: libraryParties,
        campaigns: libraryCampaigns,
        npcs: libraryNpcs,
        locations: libraryLocations,
        sessionRecords: librarySessionRecords,
        srdPreviewMarkdown,
        srdPreviewLoading,
        workspace,
      });
      if (snapshot) publishPreviewSnapshot(snapshot);
      return;
    }

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
    } else if (
      librarySelection?.kind === "srd" ||
      librarySelection?.kind === "srd-entity"
    ) {
      viewingLabel = `Viewing SRD: ${librarySelection.name}`;
      viewingSubline = "read-only";
    }

    let editKind: "none" | "result" | "seed" | "library-result" = "none";
    let canEdit = false;
    if (previewMarkdown.trim()) {
      canEdit = true;
      editKind = "result";
    } else if (viewingSeed) {
      canEdit = true;
      editKind = "seed";
    } else if (viewingResult) {
      canEdit = true;
      editKind = "library-result";
    }

    publishPreviewSnapshot({
      markdown: previewMarkdown,
      images: previewImages,
      textModel: previewTextModel,
      imageModel: previewImageModel,
      outputLayoutKind,
      workspace,
      isLibraryView,
      viewingLabel,
      viewingSubline,
      ciClass: resolvePreviewCiClass({
        selection: librarySelection,
        viewingSeed,
        viewingResult,
        viewingCharacter,
        viewingItem,
        viewingCampaign,
        viewingParty,
        outputLayoutKind,
        editKind,
        isSrdPreview:
          librarySelection?.kind === "srd" || librarySelection?.kind === "srd-entity",
        srdResource:
          librarySelection?.kind === "srd" ? librarySelection.resource : undefined,
        srdEntityId:
          librarySelection?.kind === "srd-entity" ? librarySelection.entityId : undefined,
      }),
      progressStage,
      loading,
      imageLoading,
      error,
      imageError,
      partySaveMessage,
      srdLoading: srdPreviewLoading,
      autoMapEnabled: autoGenerateAdventureMap,
      autoPropsEnabled: autoGenerateAdventureProps,
      isSrdPreview: false,
      canEdit,
      editKind,
      showSavePartyVtt:
        outputLayoutKind === "characters" && Boolean(previewMarkdown.trim()),
      showLoadPartyVtt: false,
      viewingPartyId: viewingParty?.id ?? null,
      updatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    republishRef.current?.();
  }, [
    isWelcomeView,
    previewMarkdown,
    previewImages,
    previewTextModel,
    previewImageModel,
    outputLayoutKind,
    workspace,
    isLibraryView,
    viewingSeed,
    viewingResult,
    viewingCharacter,
    viewingItem,
    viewingCampaign,
    viewingParty,
    librarySelection,
    progressStage,
    loading,
    imageLoading,
    error,
    imageError,
    partySaveMessage,
    srdPreviewLoading,
    srdPreviewMarkdown,
    autoGenerateAdventureMap,
    autoGenerateAdventureProps,
    ddeasySeeds,
    libraryResults,
    libraryCharacters,
    libraryItems,
    libraryParties,
    libraryCampaigns,
    libraryNpcs,
    libraryLocations,
    librarySessionRecords,
  ]);

  useEffect(() => {
    const republish = () => republishRef.current?.();

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (isPreviewReadyMessage(event.data)) republish();
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(PREVIEW_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (isPreviewReadyMessage(event.data)) republish();
      };
    } catch {
      /* ignore */
    }

    window.addEventListener("message", onWindowMessage);
    return () => {
      window.removeEventListener("message", onWindowMessage);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "ddeasy-preview-action") return;
      switch (event.data.action) {
        case "edit":
          openResultEditor();
          break;
        case "edit-seed":
          if (viewingSeed) openEditSeedEditor(viewingSeed.id);
          break;
        case "edit-result":
          openLibraryResultEditor();
          break;
        case "save-party-vtt":
          void savePartyForVtt();
          break;
        case "load-party-vtt":
          if (viewingParty) {
            queuePartyImport({
              rosterId: viewingParty.id,
              placeTokens: true,
              linkCampaign: true,
              replaceExisting: true,
            });
            window.location.href = "/table";
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [viewingSeed, viewingParty, openResultEditor, openEditSeedEditor, openLibraryResultEditor]);

  return {
    previewMarkdown,
    exportMarkdownForDownload,
    savePartyForVtt,
    viewingSeed,
    viewingResult,
    viewingParty,
  };
}
