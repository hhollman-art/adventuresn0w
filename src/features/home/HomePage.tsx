"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { combineLabeledSeedMarkdown, combineSavedSeedMarkdown, pruneSeedIds } from "@/lib/seedReference";
import { MAX_LIBRARY_REF_CHARS } from "@/lib/requestLimits";
import WorkshopLibraryPanel, {
  type LibraryViewSelection,
} from "@/features/workshop/WorkshopLibraryPanel";
import WorkshopWorkspaceTabs from "@/features/workshop/WorkshopWorkspaceTabs";
import ForgeContentShell from "@/features/workshop/ForgeContentShell";
import WorkshopWelcomeLanding from "@/features/home/WorkshopWelcomeLanding";
import ForgeLayoutWithSidebar from "@/features/workshop/ForgeLayoutWithSidebar";
import { buildWorkshopBreadcrumbs } from "@/lib/workshop/workshopBreadcrumbs";
import type { QuickCreateAction } from "@/lib/workshop/dmDashboard";
import WorkflowTutorialOverlay from "@/features/workshop/WorkflowTutorialOverlay";
import { isWorkflowTutorialId } from "@/lib/workshop/workflowTutorials";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import { setForgeBannerMode } from "@/lib/workshop/bannerMode";
import {
  autoLinkToActiveCampaign,
  getActiveCampaignId,
  loadCampaigns,
  onCampaignsChanged,
  type SavedCampaign,
} from "@/lib/campaigns";
import {
  appendGenerationLibraryItem,
  deleteGenerationLibraryItem,
  loadGenerationLibraryItems,
  updateGenerationLibraryItem,
  type LibraryItem,
  type LibraryKind,
} from "@/lib/generationLibrary";
import type { WorkshopLibraryCategory } from "@/lib/workshop/libraryCatalog";
import {
  appendRealmSeed,
  deleteRealmSeed,
  ddeasySeedOptionLabel,
  formatSeedTagsInput,
  loadRealmSeeds,
  mergeRealmSeedTags,
  parseSeedTagsInput,
  seedDisplayName,
  updateRealmSeed,
  SEED_KIND_LABEL,
  type SavedRealmSeed,
  type SeedKind,
} from "@/lib/realmSeeds";
import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { RealmSize } from "@/lib/realmPrompt";
import {
  defaultCharacterSlots,
  type CharacterSlotSpec,
} from "@/lib/srdCharacterOptions";
import {
  deleteSavedCharacterRoster,
  loadSavedCharacterRosters,
  onRostersChanged,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import {
  deleteSavedCharacter,
  loadSavedCharacters,
  onCharactersChanged,
  type SavedCharacter,
} from "@/lib/tabletop/characterLibrary";
import {
  deleteGameItem,
  loadSavedGameItems,
  onItemsChanged,
  type SavedGameItem,
} from "@/lib/itemLibrary";
import {
  deleteSavedNpc,
  loadSavedNpcs,
  onNpcsChanged,
  saveNpc,
  type SavedNpc,
} from "@/lib/worldAssets/npc";
import {
  deleteSavedLocation,
  loadSavedLocations,
  onLocationsChanged,
  saveLocation,
  type SavedLocation,
} from "@/lib/worldAssets/location";
import {
  deleteSavedSessionRecord,
  loadSavedSessionRecords,
  onSessionRecordsChanged,
  saveSessionRecord,
  type SavedSessionRecord,
} from "@/lib/sessions/record";
import { openOrFocusPreviewWindow, publishPreviewSnapshot } from "@/lib/workshop/previewSnapshot";
import { buildLibraryPreviewSnapshot } from "@/lib/workshop/libraryPreviewSnapshot";
import { getSrdEntity, srdEntityToPreviewMarkdown } from "@/lib/srd/corpus";
import { lookupSrdDocumentMarkdown } from "@/lib/srd/srdDocumentLookup";
import { workshopNavItem } from "@/lib/workplace/workshopNav";
import {
  extractAdventureScenes,
  MAX_AUTO_SCENE_IMAGES,
} from "@/lib/extractAdventureScenes";
import {
  clampVttGridSize,
  imageSizeForVttGrid,
} from "@/lib/tabletop/gridPresets";
import { CreationWorkspacePanel } from "./CreationWorkspacePanel";
import { LibraryWorkspaceSection } from "./LibraryWorkspaceSection";
import { ResultEditorDialog } from "./ResultEditorDialog";
import { SeedEditorDialog } from "./SeedEditorDialog";
import {
  autoSaveGeneratedSeed,
  buildAutoMapContextFromAdventure,
  buildAutoPropPayloadFromAdventure,
  buildAutoPropPayloadFromScene,
  buildMapSeedMarkdown,
  buildPropSeedMarkdown,
  buildSceneBattleMapPrompt,
  fetchAdventureResultStream,
  fetchMapImageResult,
  fetchPropImageResult,
  fetchRealmResultStream,
  firstHeading,
  isLikelyMobileDevice,
  mapPayloadForGeneration,
  mapWithConcurrency,
  parseResponseBodyJson,
  AUTO_IMAGE_CONCURRENCY,
} from "./homeGeneration";
import {
  EMPTY_SEED_DRAFT,
  initialForm,
  initialFormCharacters,
  initialMapForm,
  initialPropFormStandalone,
  initialRealmForm,
  emptyRealmForm,
  MODE_TAB_ORDER,
  type CreationMode,
  type FormState,
  type GeneratedImage,
  type MapFormState,
  type ProgressStage,
  type PropFormState,
  type RealmFormState,
  type SeedEditorDraft,
  type WorkshopWorkspace,
} from "./homeTypes";
import { useHomePreviewSnapshot } from "./useHomePreviewSnapshot";


export default function Home(props: PageProps<"/">) {
  void props;

  const [workspace, setWorkspace] = useState<WorkshopWorkspace>("welcome");
  /** Skip the next welcome reset when the user picked a specific forge workspace. */
  const skipWelcomeOnNextHomeRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [realmForm, setRealmForm] = useState<RealmFormState>(initialRealmForm);
  const [mapForm, setMapForm] = useState<MapFormState>(initialMapForm);
  const [propForm, setPropForm] = useState<PropFormState>(initialPropFormStandalone);
  const [markdown, setMarkdown] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapImages, setMapImages] = useState<GeneratedImage[]>([]);
  const [imageModel, setImageModel] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [autoGenerateAdventureMap, setAutoGenerateAdventureMap] = useState(true);
  const [autoGenerateAdventureProps, setAutoGenerateAdventureProps] = useState(true);
  const [mapDistanceUnits, setMapDistanceUnits] =
    useState<MapDistanceUnits>("imperial");
  const [progressStage, setProgressStage] = useState<ProgressStage>("idle");
  const [ddeasySeeds, setDdeasySeeds] = useState<SavedRealmSeed[]>([]);
  const [selectedSourceSeedIds, setSelectedSourceSeedIds] = useState<string[]>([]);
  /** Realm tab: optional saved seeds whose Markdown grounds a new realm run. */
  const [selectedRealmCreationSeedIds, setSelectedRealmCreationSeedIds] = useState<
    string[]
  >([]);
  /** Id of the seed auto-saved from the latest generation (realm uses seed only, not a duplicate result row). */
  const [currentGeneratedSeedId, setCurrentGeneratedSeedId] = useState<
    string | null
  >(null);
  /** Manual create/edit editor for D&DEasy seeds; null when closed. */
  const [seedEditor, setSeedEditor] = useState<SeedEditorDraft | null>(null);
  const [seedEditorError, setSeedEditorError] = useState("");
  /** Characters tab: per-PC class & race picks (length follows party size). */
  const [characterSlots, setCharacterSlots] = useState<CharacterSlotSpec[]>(() =>
    defaultCharacterSlots(),
  );
  /** Library tab: selected asset shown in the Scy Window. */
  const [librarySelection, setLibrarySelection] = useState<LibraryViewSelection>(null);
  const [libraryResults, setLibraryResults] = useState<LibraryItem[]>([]);
  const [libraryCharacters, setLibraryCharacters] = useState<SavedCharacter[]>([]);
  const [libraryItems, setLibraryItems] = useState<SavedGameItem[]>([]);
  const [libraryParties, setLibraryParties] = useState<SavedCharacterRoster[]>([]);
  const [libraryCampaigns, setLibraryCampaigns] = useState<SavedCampaign[]>([]);
  const [libraryNpcs, setLibraryNpcs] = useState<SavedNpc[]>([]);
  const [libraryLocations, setLibraryLocations] = useState<SavedLocation[]>([]);
  const [librarySessionRecords, setLibrarySessionRecords] = useState<SavedSessionRecord[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<WorkshopLibraryCategory>("all");
  /** Library feature: the read-only SRD reference browser, opened over the list. */
  const [srdBrowserOpen, setSrdBrowserOpen] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);
  const [srdPreviewMarkdown, setSrdPreviewMarkdown] = useState("");
  const [srdPreviewLoading, setSrdPreviewLoading] = useState(false);
  const [partySaveMessage, setPartySaveMessage] = useState<string | null>(null);
  const [tutorialWorkflowId, setTutorialWorkflowId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorialPicker, setShowTutorialPicker] = useState(false);
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const isLibraryView =
    pathname === "/library" || pathname.startsWith("/library/");
  const isWelcomeView = !isLibraryView && workspace === "welcome";
  const isCreatingView = !isLibraryView && workspace !== "welcome";

  useEffect(() => {
    setForgeBannerMode(isWelcomeView ? "welcome" : "compact");
  }, [isWelcomeView]);
  const forgeBodyClass = isLibraryView
    ? "forge-content-body--library"
    : isCreatingView
      ? "forge-content-body--creating"
      : "forge-content-body--welcome";

  const goForgeWelcome = useCallback(() => {
    setLibrarySelection(null);
    setLibraryStatus(null);
    setWorkspace("welcome");
    if (pathname.startsWith("/library") || pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router]);

  useEffect(() => {
    window.addEventListener("ddeasy:go-welcome", goForgeWelcome);
    return () => window.removeEventListener("ddeasy:go-welcome", goForgeWelcome);
  }, [goForgeWelcome]);

  /** Entering the forge home (`/`) always opens the welcome hearth unless a workspace was chosen. */
  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (pathname !== "/") return;

    const mode = searchParams.get("mode");
    if (mode && (MODE_TAB_ORDER as readonly string[]).includes(mode)) return;

    const navigatedToHome = prev !== null && prev !== "/";
    const firstLoad = prev === null;

    if (!navigatedToHome && !firstLoad) return;

    if (skipWelcomeOnNextHomeRef.current) {
      skipWelcomeOnNextHomeRef.current = false;
      return;
    }

    setLibrarySelection(null);
    setLibraryStatus(null);
    setWorkspace("welcome");
  }, [pathname, searchParams]);

  useEffect(() => {
    void loadRealmSeeds().then(setDdeasySeeds);
  }, []);

  useEffect(() => {
    const id = searchParams.get("workflow");
    if (id && isWorkflowTutorialId(id)) {
      setTutorialWorkflowId(id);
      setTutorialStep(0);
      setShowTutorialPicker(false);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // Deep link to a creation tab, e.g. /?mode=props from the Items page.
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m && (MODE_TAB_ORDER as readonly string[]).includes(m)) {
      setWorkspace(m as CreationMode);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // On mobile, default the slow auto image generation off for reliability.
  useEffect(() => {
    if (isLikelyMobileDevice()) {
      setAutoGenerateAdventureMap(false);
      setAutoGenerateAdventureProps(false);
    }
  }, []);


  async function persistGeneratedSeed(params: {
    kind: SeedKind;
    realmSize?: RealmSize;
    titleHint: string;
    briefDescription: string;
    markdown: string;
  }): Promise<string> {
    const autoSaved = await autoSaveGeneratedSeed(params);
    setDdeasySeeds(autoSaved.seeds);
    void autoLinkToActiveCampaign({ seedId: autoSaved.savedSeedId });
    return autoSaved.savedSeedId;
  }

  // Auto-save: mirror the library to the user's chosen folder after changes.
  // The snapshot is rebuilt from storage at write time, so firing on mount is harmless.
  useEffect(() => {
    scheduleLibrarySnapshot();
  }, [
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
    if (!librarySelection) return;
    if (librarySelection.kind === "seed" && !ddeasySeeds.some((s) => s.id === librarySelection.id)) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "result" &&
      !libraryResults.some((r) => r.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "party" &&
      !libraryParties.some((p) => p.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "character" &&
      !libraryCharacters.some((c) => c.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "item" &&
      !libraryItems.some((i) => i.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "campaign" &&
      !libraryCampaigns.some((c) => c.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "npc" &&
      !libraryNpcs.some((n) => n.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "location" &&
      !libraryLocations.some((l) => l.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
    if (
      librarySelection.kind === "session" &&
      !librarySessionRecords.some((r) => r.id === librarySelection.id)
    ) {
      setLibrarySelection(null);
    }
  }, [
    ddeasySeeds,
    libraryResults,
    libraryCharacters,
    libraryItems,
    libraryParties,
    libraryCampaigns,
    libraryNpcs,
    libraryLocations,
    librarySessionRecords,
    librarySelection,
  ]);

  function refreshLibraryData() {
    void loadRealmSeeds().then(setDdeasySeeds);
    void loadGenerationLibraryItems().then(setLibraryResults);
    void loadSavedCharacters().then(setLibraryCharacters);
    void loadSavedGameItems().then(setLibraryItems);
    void loadSavedCharacterRosters().then(setLibraryParties);
    void loadCampaigns().then(setLibraryCampaigns);
    void loadSavedNpcs().then(setLibraryNpcs);
    void loadSavedLocations().then(setLibraryLocations);
    void loadSavedSessionRecords().then(setLibrarySessionRecords);
  }

  useEffect(() => {
    if (!isLibraryView) return;
    refreshLibraryData();
    const offRosters = onRostersChanged(() => {
      void loadSavedCharacterRosters().then(setLibraryParties);
    });
    const offCharacters = onCharactersChanged(() => {
      void loadSavedCharacters().then(setLibraryCharacters);
    });
    const offItems = onItemsChanged(() => {
      void loadSavedGameItems().then(setLibraryItems);
    });
    const offCampaigns = onCampaignsChanged(() => {
      void loadCampaigns().then(setLibraryCampaigns);
    });
    const offNpcs = onNpcsChanged(() => {
      void loadSavedNpcs().then(setLibraryNpcs);
    });
    const offLocations = onLocationsChanged(() => {
      void loadSavedLocations().then(setLibraryLocations);
    });
    const offSessions = onSessionRecordsChanged(() => {
      void loadSavedSessionRecords().then(setLibrarySessionRecords);
    });
    return () => {
      offRosters();
      offCharacters();
      offItems();
      offCampaigns();
      offNpcs();
      offLocations();
      offSessions();
    };
  }, [isLibraryView]);

  function openNewSeedEditor() {
    setSeedEditorError("");
    setSeedEditor({ ...EMPTY_SEED_DRAFT });
  }

  function openEditSeedEditor(id: string) {
    const seed = ddeasySeeds.find((s) => s.id === id);
    if (!seed) return;
    setSeedEditorError("");
    setSeedEditor({
      id: seed.id,
      kind: seed.kind,
      name: seed.seedName?.trim() || seed.titleHint.trim() || "",
      realmSize: seed.realmSize ?? "region",
      briefDescription: seed.briefDescription,
      tagsInput: formatSeedTagsInput(seed.tags ?? []),
      markdown: seed.markdown,
    });
  }

  function openResultEditor() {
    setResultEditorError("");
    setResultEditor({ markdown });
  }

  function openLibraryResultEditor() {
    if (librarySelection?.kind !== "result") return;
    const item = libraryResults.find((r) => r.id === librarySelection.id);
    if (!item) return;
    setResultEditorError("");
    setResultEditor({ markdown: item.markdown });
    setCurrentResultLibraryId(item.id);
  }

  async function saveResultEditor() {
    if (!resultEditor) return;
    const md = resultEditor.markdown;
    if (!md.trim()) {
      setResultEditorError("The text cannot be empty.");
      return;
    }
    setMarkdown(md);
    // Keep the auto-saved library copy in sync so exports stay consistent.
    if (currentResultLibraryId) {
      const title = firstHeading(md) ?? "";
      const next = await updateGenerationLibraryItem(currentResultLibraryId, {
        title,
        markdown: md,
      });
      setLibraryResults(next);
    } else if (currentGeneratedSeedId) {
      const seed = ddeasySeeds.find((s) => s.id === currentGeneratedSeedId);
      if (seed) {
        const heading = firstHeading(md);
        const nextName = heading || seed.seedName?.trim() || seed.titleHint.trim();
        setDdeasySeeds(
          await updateRealmSeed(currentGeneratedSeedId, {
            kind: seed.kind,
            seedName: nextName,
            realmSize: seed.realmSize,
            titleHint: seed.titleHint.trim() || nextName,
            briefDescription: seed.briefDescription,
            tags: seed.tags,
            markdown: md,
          }),
        );
      }
    }
    setResultEditor(null);
    setResultEditorError("");
  }

  async function saveSeedEditor() {
    if (!seedEditor) return;
    const name = seedEditor.name.trim();
    const markdown = seedEditor.markdown.trim();
    if (!name) {
      setSeedEditorError("Enter a name for this CF.");
      return;
    }
    if (!markdown) {
      setSeedEditorError("Add CF details—the content cannot be empty.");
      return;
    }
    const brief = seedEditor.briefDescription.trim().slice(0, 280);
    const realmSize =
      seedEditor.kind === "realm" ? seedEditor.realmSize : undefined;
    const tags = mergeRealmSeedTags(
      parseSeedTagsInput(seedEditor.tagsInput),
      seedEditor.kind,
      realmSize,
    );
    if (seedEditor.id) {
      setDdeasySeeds(
        await updateRealmSeed(seedEditor.id, {
          kind: seedEditor.kind,
          seedName: name,
          realmSize,
          titleHint: name,
          briefDescription: brief,
          tags,
          markdown,
        }),
      );
      if (isLibraryView) {
        setLibrarySelection({ kind: "seed", id: seedEditor.id });
      } else {
        setMarkdown(markdown);
      }
      openOrFocusPreviewWindow();
    } else {
      const next = await appendRealmSeed({
        kind: seedEditor.kind,
        seedName: name,
        realmSize,
        titleHint: name,
        briefDescription: brief,
        tags,
        markdown,
      });
      setDdeasySeeds(next);
      const saved = next.find((s) => s.seedName?.trim() === name && s.markdown.trim() === markdown) ?? next[0];
      if (saved) {
        void autoLinkToActiveCampaign({ seedId: saved.id });
        if (isLibraryView) {
          setLibrarySelection({ kind: "seed", id: saved.id });
        } else {
          setMarkdown(markdown);
        }
        openOrFocusPreviewWindow();
      }
    }
    setSeedEditor(null);
    setSeedEditorError("");
  }

  function selectWorkspace(next: WorkshopWorkspace) {
    setLibrarySelection(null);
    setLibraryStatus(null);
    if (next === "welcome") {
      setWorkspace("welcome");
      if (isLibraryView) {
        router.push("/");
      } else if (pathname !== "/") {
        router.push("/");
      } else {
        router.replace("/", { scroll: false });
      }
      return;
    }
    skipWelcomeOnNextHomeRef.current = true;
    if (isLibraryView) {
      router.push("/");
    }
    setWorkspace(next);
    switch (next) {
      case "realm":
        setRealmForm(initialRealmForm);
        break;
      case "adventure":
        setForm(initialForm);
        break;
      case "characters":
        setForm({ ...initialFormCharacters, partySize: "4" });
        setCharacterSlots(defaultCharacterSlots());
        break;
      case "props":
        setPropForm(initialPropFormStandalone);
        break;
      case "maps":
        void loadRealmSeeds().then(setDdeasySeeds);
        setMapForm(initialMapForm);
        break;
      default:
        break;
    }
  }

  function handleQuickCreate(action: QuickCreateAction) {
    switch (action) {
      case "npc":
        router.push("/tavern");
        break;
      case "item":
        router.push("/items");
        break;
      case "location":
        selectWorkspace("realm");
        break;
      case "quest":
        selectWorkspace("adventure");
        break;
    }
  }

  function navigateTutorialMode(
    next: "realm" | "adventure" | "characters" | "maps" | "props" | "library",
  ) {
    if (next === "library") {
      router.push("/library");
      refreshLibraryData();
      setLibraryCategory("all");
      return;
    }
    selectWorkspace(next);
  }

  /** Maps tab: optional seeds whose Markdown grounds the image prompt. */
  const [mapLibraryReferenceIds, setMapLibraryReferenceIds] = useState<string[]>(
    [],
  );
  /** Library id of the current on-screen result, so text edits can persist. */
  const [currentResultLibraryId, setCurrentResultLibraryId] = useState<
    string | null
  >(null);
  /** Editor for the current generated text result; null when closed. */
  const [resultEditor, setResultEditor] = useState<{ markdown: string } | null>(
    null,
  );
  const [resultEditorError, setResultEditorError] = useState("");

  useEffect(() => {
    setSelectedSourceSeedIds((ids) => pruneSeedIds(ids, ddeasySeeds));
    setSelectedRealmCreationSeedIds((ids) => pruneSeedIds(ids, ddeasySeeds));
    setMapLibraryReferenceIds((ids) => pruneSeedIds(ids, ddeasySeeds));
  }, [ddeasySeeds]);

  function removeSeedFromAllSelections(id: string) {
    setSelectedSourceSeedIds((ids) => ids.filter((x) => x !== id));
    setSelectedRealmCreationSeedIds((ids) => ids.filter((x) => x !== id));
    setMapLibraryReferenceIds((ids) => ids.filter((x) => x !== id));
  }

  function mapLibraryReferenceMarkdownForApi(): string | undefined {
    if (mapLibraryReferenceIds.length === 0) return undefined;
    const parts = mapLibraryReferenceIds
      .map((id) => ddeasySeeds.find((s) => s.id === id))
      .filter((seed): seed is SavedRealmSeed => Boolean(seed))
      .map((seed) => {
        const md = seed.markdown.trim();
        return {
          label: ddeasySeedOptionLabel(seed),
          markdown:
            md ||
            `# ${seedDisplayName(seed)}\n\n*(${SEED_KIND_LABEL[seed.kind]} — this CF has no saved text; use the map form fields as the primary brief.)*`,
        };
      });
    return combineLabeledSeedMarkdown(parts, MAX_LIBRARY_REF_CHARS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLibraryView || workspace === "welcome") return;
    openOrFocusPreviewWindow();
    const mode = workspace;
    setLoading(true);
    setError(null);
    setCurrentGeneratedSeedId(null);
    setCurrentResultLibraryId(null);
    setMarkdown("");
    setModel(null);
    setImageError(null);
    setMapImages([]);
    setImageModel(null);
    setProgressStage(
      mode === "maps"
        ? "map_locale_generating"
        : mode === "props"
          ? "prop_generating"
          : mode === "realm"
            ? "realm_generating"
            : "adventure_generating",
    );

    try {
      if (mode === "maps") {
        const mapPayload = mapPayloadForGeneration(mapForm, mapDistanceUnits);
        const mapResult = await generateMapImage(
          mapPayload,
          mapLibraryReferenceMarkdownForApi(),
        );
        if (mapResult.ok) {
          setProgressStage("complete");
          const mapSeedMarkdown = buildMapSeedMarkdown(mapForm);
          setMarkdown(mapSeedMarkdown);
          const mapLib = await appendGenerationLibraryItem({
            kind: "maps",
            title: mapForm.locationName.trim() || "Maps",
            markdown: mapSeedMarkdown,
            textModel: null,
            imageModel: mapResult.model,
            images: mapResult.images,
          });
          if (mapLib[0]) void autoLinkToActiveCampaign({ resultId: mapLib[0].id });
          const titleSnap = mapForm.locationName.trim();
          void persistGeneratedSeed({
            kind: "maps",
            titleHint: titleSnap,
            briefDescription: [mapForm.tone.trim(), mapForm.context.trim()]
              .filter(Boolean)
              .join(" · ")
              .slice(0, 400),
            markdown: mapSeedMarkdown,
          });
        }
        return;
      }
      if (mode === "props") {
        if (!propForm.description.trim()) {
          setError("Describe the item in the description box (look, material, and any text on it).");
          setProgressStage("idle");
          return;
        }
        const propResult = await generateStandalonePropImage(propForm);
        if (propResult.ok) {
          setProgressStage("complete");
          const propSeedMarkdown = buildPropSeedMarkdown(propForm);
          setMarkdown(propSeedMarkdown);
          const propLib = await appendGenerationLibraryItem({
            kind: "props",
            title:
              propForm.title.trim() ||
              propForm.description.trim().slice(0, 72) ||
              "Item handout",
            markdown: propSeedMarkdown,
            textModel: null,
            imageModel: propResult.model,
            images: propResult.images,
          });
          if (propLib[0]) void autoLinkToActiveCampaign({ resultId: propLib[0].id });
          const titleSnap =
            propForm.title.trim() ||
            propForm.description.trim().slice(0, 72);
          void persistGeneratedSeed({
            kind: "props",
            titleHint: titleSnap,
            briefDescription: propForm.description.trim().slice(0, 400),
            markdown: propSeedMarkdown,
          });
        }
        return;
      }
      if (mode === "realm") {
        if (!realmForm.description.trim()) {
          setError("Describe the realm: tone, key factions, terrain, and what you need at the table.");
          setProgressStage("idle");
          return;
        }
        const realmCreationSeedMd = combineSavedSeedMarkdown(
          ddeasySeeds,
          selectedRealmCreationSeedIds,
        );
        const streamed = await fetchRealmResultStream(
          realmForm,
          {
            onChunk: (chunk) => setMarkdown((prev) => prev + chunk),
            onModel: (m) => setModel(m),
          },
          realmCreationSeedMd,
        );
        if (streamed.error) {
          setError(streamed.error);
          setProgressStage("error");
          return;
        }
        if (streamed.markdown) {
          setMarkdown(streamed.markdown);
          setModel(streamed.model ?? null);
          const briefDescription = realmForm.description.trim().slice(0, 400);
          const titleSnap = realmForm.titleHint.trim();
          const savedSeedId = await persistGeneratedSeed({
            kind: "realm",
            realmSize: realmForm.realmSize,
            titleHint: titleSnap,
            briefDescription,
            markdown: streamed.markdown,
          });
          setCurrentGeneratedSeedId(savedSeedId);
          setCurrentResultLibraryId(null);
          setProgressStage("complete");
          setRealmForm(emptyRealmForm);
        } else {
          setError("No generated text returned.");
          setProgressStage("error");
        }
        return;
      }
      const url =
        mode === "adventure" ? "/api/generate" : "/api/generate-characters";
      const sourceSeedMarkdown = combineSavedSeedMarkdown(
        ddeasySeeds,
        selectedSourceSeedIds,
      );
      const payload =
        mode === "adventure"
          ? form
          : {
              partyConcept: form.titleHint,
              levelRange: form.levelRange,
              tone: form.tone,
              setting: form.setting,
              characterCount: String(characterSlots.length),
              extraNotes: form.extraNotes,
              characterSpecs: characterSlots.map((s) => ({
                className: s.className.trim() || undefined,
                race: s.race.trim() || undefined,
              })),
              ...(sourceSeedMarkdown ? { sourceSeedMarkdown } : {}),
            };
      let generatedMarkdown = "";
      let generatedModel: string | null = null;
      if (mode === "adventure") {
        const seedMarkdown = sourceSeedMarkdown;
        const streamed = await fetchAdventureResultStream(
          form,
          {
            onChunk: (chunk) => setMarkdown((prev) => prev + chunk),
            onModel: (m) => setModel(m),
          },
          seedMarkdown,
        );
        if (streamed.error) {
          setError(streamed.error);
          return;
        }
        generatedMarkdown = streamed.markdown;
        generatedModel = streamed.model;
      } else {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = await res.text();
        const parsed = parseResponseBodyJson(res, raw);
        if (!parsed.ok) {
          setError(parsed.userMessage);
          return;
        }
        const data = parsed.data as {
          markdown?: string;
          model?: string;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? `Request failed (${res.status})`);
          return;
        }
        generatedMarkdown = data.markdown ?? "";
        generatedModel = data.model ?? null;
      }

      if (generatedMarkdown) {
        setMarkdown(generatedMarkdown);
        setModel(generatedModel ?? null);
        setProgressStage("adventure_done");
        let recordImages: GeneratedImage[] = [];
        let recordImageModel: string | null = null;
        if (
          mode === "adventure" &&
          (autoGenerateAdventureMap || autoGenerateAdventureProps)
        ) {
          setImageLoading(true);
          setImageError(null);
          setMapImages([]);
          setImageModel(null);

          const mapContext = buildAutoMapContextFromAdventure(generatedMarkdown, form);
            const mapExtraNotes = [
            `Adventure combat focus ${form.combatIntensity}/5 (${
              form.combatIntensity <= 2
                ? "fewer fights—favor exploration layouts"
                : form.combatIntensity >= 4
                  ? "combat-heavy—favor tactical arenas, cover, chokepoints"
                  : "balanced—mix open and tactical spaces"
            }).`,
            "Overview / locale map: **full-color atlas** (distinct oceans, seas, major lakes, sharp coasts, **capitals + major cities**, **primary trade routes**)—functional reference, not painterly world art. Battle maps: **illustrated tactical floors without printed grids** (VTT overlays the grid); short legible labels for key areas from context.",
          ]
            .filter(Boolean)
            .join(" ");

          const mapBase: MapFormState = {
            mapKind: "both",
            locationName: form.setting || form.titleHint || "Adventure locale",
            levelRange: form.levelRange,
            partySize: form.partySize,
            tone: form.tone,
            context: mapContext,
            battleGridCols: mapForm.battleGridCols,
            battleGridRows: mapForm.battleGridRows,
            extraNotes: mapExtraNotes,
            imageSize: imageSizeForVttGrid(mapForm.battleGridCols, mapForm.battleGridRows),
            imageQuality: "high",
          };

          const scenes = extractAdventureScenes(generatedMarkdown, MAX_AUTO_SCENE_IMAGES);
          const collected: GeneratedImage[] = [];
          let workflowModel: string | null = null;
          let workflowError: string | null = null;

          const mapPayload = mapPayloadForGeneration(mapBase, mapDistanceUnits);
          const adventureMapSeedRef = combineSavedSeedMarkdown(
            ddeasySeeds,
            selectedSourceSeedIds,
          );

          try {
            if (autoGenerateAdventureMap) {
              setProgressStage("map_locale_generating");
              if (scenes.length === 0) {
                const r = await fetchMapImageResult(
                  mapPayload,
                  adventureMapSeedRef,
                  mapDistanceUnits,
                );
                if (r.error) workflowError = r.error;
                else {
                  collected.push(...r.images.map((img) => ({ ...img })));
                  workflowModel = r.model;
                }
              } else {
                const rLocale = await fetchMapImageResult(
                  mapPayloadForGeneration(
                    { ...mapBase, mapKind: "overland", context: mapContext },
                    mapDistanceUnits,
                  ),
                  adventureMapSeedRef,
                  mapDistanceUnits,
                );
                if (rLocale.error) {
                  workflowError = rLocale.error;
                } else {
                  collected.push(
                    ...rLocale.images.map((img) => ({
                      ...img,
                      label: "Locale / overview",
                    })),
                  );
                  workflowModel = rLocale.model;
                  setProgressStage("map_battle_generating");
                  try {
                    const battleGroups = await mapWithConcurrency(
                      scenes,
                      AUTO_IMAGE_CONCURRENCY,
                      async (scene) => {
                        const r = await fetchMapImageResult(
                          mapPayloadForGeneration(
                            {
                              ...mapBase,
                              mapKind: "battle",
                              locationName: `${mapBase.locationName} — ${scene.title}`.slice(
                                0,
                                200,
                              ),
                              context: buildSceneBattleMapPrompt(
                                scene,
                                mapBase,
                                generatedMarkdown,
                                form,
                                mapDistanceUnits,
                              ),
                            },
                            mapDistanceUnits,
                          ),
                          adventureMapSeedRef,
                          mapDistanceUnits,
                        );
                        if (r.error) {
                          throw new Error(r.error);
                        }
                        workflowModel = r.model ?? workflowModel;
                        return r.images.map((img) => ({
                          ...img,
                          label: `Battle — ${scene.title}`,
                        }));
                      },
                    );
                    collected.push(...battleGroups.flat());
                  } catch (err) {
                    workflowError = err instanceof Error ? err.message : "Map generation failed.";
                  }
                }
              }
            }

            if (autoGenerateAdventureProps && !workflowError) {
              setProgressStage("prop_generating");
              const propPayloads =
                scenes.length > 0
                  ? scenes.map((s, i) => buildAutoPropPayloadFromScene(s, form, i))
                  : [buildAutoPropPayloadFromAdventure(generatedMarkdown, form)];
              try {
                const propGroups = await mapWithConcurrency(
                  propPayloads,
                  AUTO_IMAGE_CONCURRENCY,
                  async (payload, i) => {
                    const r = await fetchPropImageResult(payload);
                    if (r.error) throw new Error(r.error);
                    const propLabel =
                      scenes.length > 0 && scenes[i]
                        ? `Handout — ${scenes[i]!.title}`
                        : "Handout";
                    workflowModel = r.model ?? workflowModel;
                    return r.images.map((img) => ({
                      ...img,
                      label: propLabel,
                    }));
                  },
                );
                collected.push(...propGroups.flat());
              } catch (err) {
                workflowError = err instanceof Error ? err.message : "Prop generation failed.";
              }
            }

            recordImages = collected;
            recordImageModel = workflowModel;
            setMapImages(collected);
            setImageModel(workflowModel);
            if (workflowError) {
              setImageError(workflowError);
              setProgressStage("error");
            } else {
              setProgressStage("complete");
            }
          } finally {
            setImageLoading(false);
          }
        } else {
          setProgressStage("complete");
        }
        const libKind: LibraryKind =
          mode === "characters" ? "characters" : "adventure";
        const libTitle =
          firstHeading(generatedMarkdown) ??
          (form.titleHint.trim() ||
            (libKind === "characters" ? "Heroes" : "Adventure"));
        const textLib = await appendGenerationLibraryItem({
          kind: libKind,
          title: libTitle,
          markdown: generatedMarkdown,
          textModel: generatedModel,
          imageModel: recordImageModel,
          images: recordImages,
        });
        setCurrentResultLibraryId(textLib[0]?.id ?? null);
        if (textLib[0]) void autoLinkToActiveCampaign({ resultId: textLib[0].id });
        if (mode === "adventure" || mode === "characters") {
          const titleSnap = form.titleHint.trim();
          const briefDescription =
            workspace === "adventure"
              ? [
                  form.setting.trim(),
                  form.villainOrThreat.trim(),
                  form.tone.trim(),
                ]
                  .filter(Boolean)
                  .join(" · ")
                  .slice(0, 400)
              : [
                  form.setting.trim(),
                  form.tone.trim(),
                  form.levelRange.trim()
                    ? `Levels ${form.levelRange.trim()}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
                  .slice(0, 400);
          void persistGeneratedSeed({
            kind: mode === "characters" ? "characters" : "adventure",
            titleHint: titleSnap,
            briefDescription,
            markdown: generatedMarkdown,
          });
        }
      } else {
        setError("No generated text returned.");
        setProgressStage("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setProgressStage("error");
    } finally {
      setLoading(false);
    }
  }

  const applyBattleGridSize = (cols: number, rows: number) => {
    const clamped = clampVttGridSize(cols, rows);
    setMapForm((f) => ({
      ...f,
      battleGridCols: clamped.cols,
      battleGridRows: clamped.rows,
      imageSize: imageSizeForVttGrid(clamped.cols, clamped.rows),
    }));
  };

  async function generateMapImage(
    payload: MapFormState,
    libraryRefMarkdown?: string,
  ): Promise<
    | { ok: true; images: GeneratedImage[]; model: string | null }
    | { ok: false }
  > {
    setImageLoading(true);
    setImageError(null);
    setMapImages([]);
    setImageModel(null);

    try {
      const result = await fetchMapImageResult(
        mapPayloadForGeneration(payload, mapDistanceUnits),
        libraryRefMarkdown,
        mapDistanceUnits,
      );
      if (result.error) {
        setImageError(result.error);
        setProgressStage("error");
        return { ok: false };
      }
      const hasLocale = result.images.some((img) => img.kind === "locale");
      const hasBattle = result.images.some((img) => img.kind === "battle");
      if (hasLocale) {
        setProgressStage(hasBattle ? "map_battle_generating" : "map_locale_generating");
      }
      const images = result.images.map((img) => ({ ...img }));
      setMapImages(images);
      setImageModel(result.model);
      setProgressStage("map_done");
      return { ok: true, images, model: result.model };
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Network error");
      setProgressStage("error");
      return { ok: false };
    } finally {
      setImageLoading(false);
    }
  }

  async function generateStandalonePropImage(
    payload: PropFormState,
  ): Promise<
    | { ok: true; images: GeneratedImage[]; model: string | null }
    | { ok: false }
  > {
    setImageLoading(true);
    setImageError(null);
    setMapImages([]);
    setImageModel(null);
    setProgressStage("prop_generating");
    try {
      const result = await fetchPropImageResult(payload);
      if (result.error) {
        setImageError(result.error);
        setProgressStage("error");
        return { ok: false };
      }
      const label = payload.title.trim() || "Item handout";
      const images = result.images.map((img) => ({
        ...img,
        label,
      }));
      setMapImages(images);
      setImageModel(result.model);
      return { ok: true, images, model: result.model };
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Network error");
      setProgressStage("error");
      return { ok: false };
    } finally {
      setImageLoading(false);
    }
  }

  const workshopBreadcrumbs = useMemo(
    () =>
      buildWorkshopBreadcrumbs({
        pathname,
        workspace: workspace === "welcome" ? "welcome" : workspace,
        libraryCategory: isLibraryView ? libraryCategory : undefined,
      }),
    [pathname, workspace, isLibraryView, libraryCategory],
  );

  const activeWorkspaceNav = isCreatingView
    ? workspace === "characters"
      ? workshopNavItem("tavern")
      : workshopNavItem(workspace)
    : null;
useHomePreviewSnapshot({
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
  });


    const libraryPanel = (
    <WorkshopLibraryPanel
      wideLayout
      seeds={ddeasySeeds}
      results={libraryResults}
      characters={libraryCharacters}
      items={libraryItems}
      parties={libraryParties}
      campaigns={libraryCampaigns}
      npcs={libraryNpcs}
      locations={libraryLocations}
      sessionRecords={librarySessionRecords}
      category={libraryCategory}
      selection={librarySelection}
      statusMessage={libraryStatus}
      srdOpen={srdBrowserOpen}
      onSrdOpenChange={(open) => {
        setSrdBrowserOpen(open);
        if (
          !open &&
          (librarySelection?.kind === "srd" || librarySelection?.kind === "srd-entity")
        ) {
          setLibrarySelection(null);
        }
      }}
      onCategoryChange={setLibraryCategory}
      onSelect={(selection) => {
        setLibrarySelection(selection);
        let bundledSrdMarkdown: string | null = null;
        let srdPreviewLoading = false;
        if (selection?.kind === "srd") {
          bundledSrdMarkdown = lookupSrdDocumentMarkdown({
            resource: selection.resource,
            index: selection.index,
            name: selection.name,
          });
          srdPreviewLoading = !bundledSrdMarkdown;
        } else if (selection?.kind === "srd-entity") {
          const entity = getSrdEntity(selection.entityId);
          bundledSrdMarkdown = entity ? srdEntityToPreviewMarkdown(entity) : null;
          srdPreviewLoading = !bundledSrdMarkdown?.trim();
        }
        if (bundledSrdMarkdown) {
          setSrdPreviewMarkdown(bundledSrdMarkdown);
          setSrdPreviewLoading(false);
        } else if (selection?.kind === "srd" || selection?.kind === "srd-entity") {
          setSrdPreviewMarkdown("");
          setSrdPreviewLoading(srdPreviewLoading);
        }
        const snapshot = buildLibraryPreviewSnapshot({
          selection,
          seeds: ddeasySeeds,
          results: libraryResults,
          characters: libraryCharacters,
          items: libraryItems,
          parties: libraryParties,
          campaigns: libraryCampaigns,
          npcs: libraryNpcs,
          locations: libraryLocations,
          sessionRecords: librarySessionRecords,
          srdPreviewMarkdown: bundledSrdMarkdown ?? undefined,
          srdPreviewLoading,
          workspace,
        });
        if (snapshot) publishPreviewSnapshot(snapshot);
        openOrFocusPreviewWindow();
      }}
      onAddSeed={openNewSeedEditor}
      onEditSeed={openEditSeedEditor}
      onDeleteSeed={async (id) => {
        const next = await deleteRealmSeed(id);
        setDdeasySeeds(next);
        if (librarySelection?.kind === "seed" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
        removeSeedFromAllSelections(id);
        if (currentGeneratedSeedId === id) {
          setCurrentGeneratedSeedId(null);
        }
      }}
      onDeleteResult={async (id) => {
        const next = await deleteGenerationLibraryItem(id);
        setLibraryResults(next);
        if (librarySelection?.kind === "result" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteCharacter={async (id) => {
        const next = await deleteSavedCharacter(id);
        setLibraryCharacters(next);
        if (librarySelection?.kind === "character" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteItem={async (id) => {
        const next = await deleteGameItem(id);
        setLibraryItems(next);
        if (librarySelection?.kind === "item" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteParty={async (id) => {
        const next = await deleteSavedCharacterRoster(id);
        setLibraryParties(next);
        if (librarySelection?.kind === "party" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteNpc={async (id) => {
        const next = await deleteSavedNpc(id);
        setLibraryNpcs(next);
        if (librarySelection?.kind === "npc" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteLocation={async (id) => {
        const next = await deleteSavedLocation(id);
        setLibraryLocations(next);
        if (librarySelection?.kind === "location" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onDeleteSession={async (id) => {
        const next = await deleteSavedSessionRecord(id);
        setLibrarySessionRecords(next);
        if (librarySelection?.kind === "session" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onAddNpc={async () => {
        const name = window.prompt("What is this NPC called?");
        if (!name?.trim()) return;
        const list = await saveNpc({ name: name.trim() });
        setLibraryNpcs(list);
        const created = list[0];
        if (!created) return;
        await autoLinkToActiveCampaign({ npcId: created.id });
        setLibrarySelection({ kind: "npc", id: created.id });
        setLibraryStatus(`Added NPC “${created.name}”.`);
      }}
      onAddLocation={async () => {
        const name = window.prompt("What is this place called?");
        if (!name?.trim()) return;
        const list = await saveLocation({ name: name.trim() });
        setLibraryLocations(list);
        const created = list[0];
        if (!created) return;
        await autoLinkToActiveCampaign({ locationId: created.id });
        setLibrarySelection({ kind: "location", id: created.id });
        setLibraryStatus(`Added location “${created.name}”.`);
      }}
      onAddSession={async () => {
        const campaignId = getActiveCampaignId();
        if (!campaignId) {
          setLibraryStatus("Set an active campaign on the Campaigns page before logging a session.");
          return;
        }
        const sessionNumber =
          librarySessionRecords.filter((r) => r.campaignId === campaignId).length + 1;
        const list = await saveSessionRecord({
          campaignId,
          sessionNumber,
          summary: "",
        });
        setLibrarySessionRecords(list);
        const created = list[0];
        if (!created) return;
        await autoLinkToActiveCampaign({ sessionRecordId: created.id });
        setLibrarySelection({ kind: "session", id: created.id });
        setLibraryStatus(`Logged session #${created.sessionNumber}.`);
      }}
      onPartiesChange={setLibraryParties}
      onRestore={(outcome) => {
        setDdeasySeeds(outcome.seeds);
        setLibraryResults(outcome.results);
        setLibraryCharacters(outcome.characters);
        setLibraryItems(outcome.items);
        setLibraryParties(outcome.parties);
        setLibraryCampaigns(outcome.campaigns);
        setLibraryNpcs(outcome.npcs);
        setLibraryLocations(outcome.locations);
        setLibrarySessionRecords(outcome.sessionRecords);
      }}
      onStatus={setLibraryStatus}
    />
  );

  return (
    <main
      className={`app-main app-main--workshop mx-auto flex w-full max-w-[110rem] flex-1 flex-col px-4 py-6 sm:px-6 ${
        isLibraryView
          ? "app-main--library gap-4 lg:gap-5"
          : isCreatingView
            ? "app-main--creating gap-4 lg:gap-5"
            : "app-main--welcome gap-4 lg:gap-5"
      }`}
    >
      {seedEditor ? (
        <SeedEditorDialog
          seedEditor={seedEditor}
          seedEditorError={seedEditorError}
          setSeedEditor={setSeedEditor}
          setSeedEditorError={setSeedEditorError}
          onSave={() => void saveSeedEditor()}
          onCancel={() => {
            setSeedEditorError("");
            setSeedEditor(null);
          }}
        />
      ) : null}
      {resultEditor ? (
        <ResultEditorDialog
          resultEditor={resultEditor}
          resultEditorError={resultEditorError}
          setResultEditor={setResultEditor}
          setResultEditorError={setResultEditorError}
          onSave={() => void saveResultEditor()}
          onCancel={() => {
            setResultEditorError("");
            setResultEditor(null);
          }}
        />
      ) : null}
      {!isWelcomeView ? (
      <WorkshopWorkspaceTabs
        workspace={workspace === "welcome" ? "welcome" : workspace}
        onSelectWelcome={() => selectWorkspace("welcome")}
        onSelectCreation={(creation) => {
          if (isLibraryView) router.push(`/?mode=${creation}`);
          else selectWorkspace(creation);
        }}
      />
      ) : null}

      <ForgeContentShell bodyClassName={forgeBodyClass}>
      <ForgeLayoutWithSidebar
        showSidebar={false}
        breadcrumbs={workshopBreadcrumbs}
        workspace={workspace === "welcome" ? "welcome" : workspace}
        onSelectWelcome={() => selectWorkspace("welcome")}
        onSelectCreation={(creation) => {
          if (isLibraryView) router.push(`/?mode=${creation}`);
          else selectWorkspace(creation);
        }}
      >
      {isLibraryView ? (
        <LibraryWorkspaceSection libraryPanel={libraryPanel} />
      ) : null}

      {isWelcomeView ? (
        <section className="workshop-welcome-main workshop-welcome-panel forge-forest-panel no-print rounded-xl border">
          <WorkshopWelcomeLanding
            workspace={workspace === "welcome" ? "welcome" : workspace}
            onSelectWelcome={() => selectWorkspace("welcome")}
            onSelectCreation={(creation) => {
              if (isLibraryView) router.push(`/?mode=${creation}`);
              else selectWorkspace(creation);
            }}
            onQuickCreate={handleQuickCreate}
            onStartWorkflow={(id) => {
              setTutorialWorkflowId(id);
              setTutorialStep(0);
              setShowTutorialPicker(false);
            }}
          />
        </section>
      ) : null}

      {isCreatingView ? (
        <CreationWorkspacePanel
          workspace={workspace as CreationMode}
          activeWorkspaceNav={activeWorkspaceNav}
          form={form}
          setForm={setForm}
          realmForm={realmForm}
          setRealmForm={setRealmForm}
          mapForm={mapForm}
          setMapForm={setMapForm}
          propForm={propForm}
          setPropForm={setPropForm}
          ddeasySeeds={ddeasySeeds}
          selectedSourceSeedIds={selectedSourceSeedIds}
          setSelectedSourceSeedIds={setSelectedSourceSeedIds}
          selectedRealmCreationSeedIds={selectedRealmCreationSeedIds}
          setSelectedRealmCreationSeedIds={setSelectedRealmCreationSeedIds}
          mapLibraryReferenceIds={mapLibraryReferenceIds}
          setMapLibraryReferenceIds={setMapLibraryReferenceIds}
          mapDistanceUnits={mapDistanceUnits}
          setMapDistanceUnits={setMapDistanceUnits}
          characterSlots={characterSlots}
          setCharacterSlots={setCharacterSlots}
          autoGenerateAdventureMap={autoGenerateAdventureMap}
          setAutoGenerateAdventureMap={setAutoGenerateAdventureMap}
          autoGenerateAdventureProps={autoGenerateAdventureProps}
          setAutoGenerateAdventureProps={setAutoGenerateAdventureProps}
          progressStage={progressStage}
          loading={loading}
          imageLoading={imageLoading}
          partySaveMessage={partySaveMessage}
          error={error}
          imageError={imageError}
          handleSubmit={handleSubmit}
          applyBattleGridSize={applyBattleGridSize}
          selectWorkspace={selectWorkspace}
        />
      ) : null}
      </ForgeLayoutWithSidebar>
      </ForgeContentShell>

      <WorkflowTutorialOverlay
        workflowId={tutorialWorkflowId}
        stepIndex={tutorialStep}
        showPicker={showTutorialPicker}
        handlers={{
          onSelectMode: navigateTutorialMode,
          onLibraryCategory: (cat) => {
            setSrdBrowserOpen(false);
            setLibraryCategory(cat);
          },
          onOpenSrdBrowser: () => setSrdBrowserOpen(true),
          onOpenSeedEditor: openNewSeedEditor,
        }}
        onWorkflowChange={setTutorialWorkflowId}
        onStepChange={setTutorialStep}
        onShowPickerChange={setShowTutorialPicker}
      />
    </main>
  );
}
