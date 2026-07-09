"use client";

import Link from "next/link";
import {
  adventureLengthFromSessionCount,
  formatSessionLengthField,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import { REALM_SIZE_LABEL, REALM_SIZES } from "@/lib/realmPrompt";
import SeedMultiSelect from "@/features/workshop/SeedMultiSelect";
import SrdMarkdownTextarea from "@/features/ui/SrdMarkdownTextarea";
import { SrdNamedSelect, SrdSpeciesSelect } from "@/features/ui/SrdPickers";
import { SRD_CLASS_NAMES } from "@/lib/srd";
import {
  addCharacterSlot,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  removeCharacterSlot,
  type CharacterSlotSpec,
} from "@/lib/srdCharacterOptions";
import { MAX_AUTO_SCENE_IMAGES } from "@/lib/extractAdventureScenes";
import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { PropItemCategory } from "@/lib/propImagePrompt";
import type { SavedRealmSeed } from "@/lib/realmSeeds";
import { APP_ICONS } from "@/lib/ui/appIcons";
import { THE_TAVERN } from "@/lib/workplace/forgeLexicon";
import type { WorkshopNavItem } from "@/lib/workplace/workshopNav";
import {
  AutoGenerateToggle,
  BattleMapGridFieldset,
  Field,
  ProgressPanel,
  SelectField,
} from "./HomeFormFields";
import {
  ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER,
  ADVENTURE_SAMPLE_PARTY_PLACEHOLDER,
  ADVENTURE_SAMPLE_SETTING_PLACEHOLDER,
  ADVENTURE_SAMPLE_TONE_PLACEHOLDER,
  ADVENTURE_SAMPLE_VILLAIN_PLACEHOLDER,
  CHARACTERS_SAMPLE_LEVEL_PLACEHOLDER,
  MAP_SAMPLE_CONTEXT_PLACEHOLDER,
  MAP_SAMPLE_TONE_PLACEHOLDER,
  MODE_TAB_LABEL,
  REALM_SAMPLE_DESCRIPTION,
  type CreationMode,
  type FormState,
  type MapFormState,
  type ProgressStage,
  type PropFormState,
  type RealmFormState,
  type WorkshopWorkspace,
} from "./homeTypes";

export type CreationWorkspacePanelProps = {
  workspace: CreationMode;
  activeWorkspaceNav: WorkshopNavItem | null | undefined;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  realmForm: RealmFormState;
  setRealmForm: React.Dispatch<React.SetStateAction<RealmFormState>>;
  mapForm: MapFormState;
  setMapForm: React.Dispatch<React.SetStateAction<MapFormState>>;
  propForm: PropFormState;
  setPropForm: React.Dispatch<React.SetStateAction<PropFormState>>;
  ddeasySeeds: SavedRealmSeed[];
  selectedSourceSeedIds: string[];
  setSelectedSourceSeedIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedRealmCreationSeedIds: string[];
  setSelectedRealmCreationSeedIds: React.Dispatch<React.SetStateAction<string[]>>;
  mapLibraryReferenceIds: string[];
  setMapLibraryReferenceIds: React.Dispatch<React.SetStateAction<string[]>>;
  mapDistanceUnits: MapDistanceUnits;
  setMapDistanceUnits: React.Dispatch<React.SetStateAction<MapDistanceUnits>>;
  characterSlots: CharacterSlotSpec[];
  setCharacterSlots: React.Dispatch<React.SetStateAction<CharacterSlotSpec[]>>;
  autoGenerateAdventureMap: boolean;
  setAutoGenerateAdventureMap: React.Dispatch<React.SetStateAction<boolean>>;
  autoGenerateAdventureProps: boolean;
  setAutoGenerateAdventureProps: React.Dispatch<React.SetStateAction<boolean>>;
  progressStage: ProgressStage;
  loading: boolean;
  imageLoading: boolean;
  partySaveMessage: string | null;
  error: string | null;
  imageError: string | null;
  handleSubmit: (e: React.FormEvent) => void | Promise<void>;
  applyBattleGridSize: (cols: number, rows: number) => void;
  selectWorkspace: (next: WorkshopWorkspace) => void;
};

export function CreationWorkspacePanel(props: CreationWorkspacePanelProps) {
  const {
    workspace,
    activeWorkspaceNav,
    form,
    setForm,
    realmForm,
    setRealmForm,
    mapForm,
    setMapForm,
    propForm,
    setPropForm,
    ddeasySeeds,
    selectedSourceSeedIds,
    setSelectedSourceSeedIds,
    selectedRealmCreationSeedIds,
    setSelectedRealmCreationSeedIds,
    mapLibraryReferenceIds,
    setMapLibraryReferenceIds,
    mapDistanceUnits,
    setMapDistanceUnits,
    characterSlots,
    setCharacterSlots,
    autoGenerateAdventureMap,
    setAutoGenerateAdventureMap,
    autoGenerateAdventureProps,
    setAutoGenerateAdventureProps,
    progressStage,
    loading,
    imageLoading,
    partySaveMessage,
    error,
    imageError,
    handleSubmit,
    applyBattleGridSize,
    selectWorkspace,
  } = props;

  return (
    <section
      className="workshop-workspace-main panel-scroll fantasy-panel no-print flex min-h-0 flex-1 flex-col rounded-xl border p-6"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
    <div className="workshop-workspace-hero">
      <span className="workshop-workspace-hero-icon" aria-hidden="true">
        {activeWorkspaceNav?.icon ?? APP_ICONS.welcome}
      </span>
      <div className="min-w-0">
    <h1 className="font-display text-xl font-bold text-[var(--text)]">
      {activeWorkspaceNav?.label ??
        (workspace === "realm"
          ? "Realm (5.2)"
          : workspace === "adventure"
            ? "Adventure (5.2)"
            : workspace === "characters"
              ? `${THE_TAVERN} — Generate heroes`
              : workspace === "props"
                ? "Items (handouts)"
                : "Maps (5.2)")}
    </h1>
    <div className="fantasy-divider mt-2" aria-hidden="true">
      <span className="text-sm leading-none">&#10022;</span>
    </div>
    <p className="mt-2 text-sm text-[var(--muted)]">
      {activeWorkspaceNav?.hint ??
        (workspace === "realm"
          ? "Pick how big the place is — a whole world down to a single village — then describe it in your own words. You get table-ready pages you can read, print, or edit. Everything is original to your game."
          : workspace === "adventure"
            ? "Set how many sessions and hours per night, tune combat focus, then describe the story. You get a ready-to-run quest, original to your game."
            : workspace === "characters"
              ? "Generate a ready-to-play party of heroes from the included rules. When you are done, manage sheets and fellowships in The Tavern."
              : workspace === "props"
                ? "Make handout images to show your players: letters, potions, weapons, tools, and more. Pick an item type, describe it, and craft it — no adventure required. Manage your equipment and magic items on the Items page."
                : "Draw full-color travel maps (cities, roads, coastlines) and battle maps ready for the Virtual Table — top-down views made for play, not scenic art.")}
    </p>
      </div>
    </div>

    {workspace === "adventure" ? (
      <div
        className="mt-4 rounded-lg border p-3"
        style={{ borderColor: "var(--accent-dim)", background: "rgba(201,162,39,0.08)" }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
          Auto-generate with adventure
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-soft)]">
          Maps and item handouts run after the adventure text — keep these on for a full prep pack.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <AutoGenerateToggle
            checked={autoGenerateAdventureMap}
            onChange={setAutoGenerateAdventureMap}
            icon={"\u{1F5FA}\uFE0F"}
          >
            Auto-generate maps (overview + one battle map per scene, up to {MAX_AUTO_SCENE_IMAGES})
          </AutoGenerateToggle>
          {autoGenerateAdventureMap ? (
            <fieldset
              className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <legend className="text-sm font-medium text-[var(--muted)]">Auto-map scale</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="mapDistanceUnitsAdventure"
                    checked={mapDistanceUnits === "imperial"}
                    onChange={() => setMapDistanceUnits("imperial")}
                    className="accent-[var(--accent)]"
                  />
                  <span>Imperial (miles, feet)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="mapDistanceUnitsAdventure"
                    checked={mapDistanceUnits === "metric"}
                    onChange={() => setMapDistanceUnits("metric")}
                    className="accent-[var(--accent)]"
                  />
                  <span>Metric (km, meters)</span>
                </label>
              </div>
              <BattleMapGridFieldset
                mapForm={mapForm}
                embedded
                compactLegend="Battle map grid (Virtual Table)"
                onApplyPreset={(cols, rows) => applyBattleGridSize(cols, rows)}
                onCustomSize={(cols, rows) => applyBattleGridSize(cols, rows)}
              />
            </fieldset>
          ) : null}
          <AutoGenerateToggle
            checked={autoGenerateAdventureProps}
            onChange={setAutoGenerateAdventureProps}
            icon={"\u{1F3FA}"}
          >
            Auto-generate item handouts (one per scene when found, up to {MAX_AUTO_SCENE_IMAGES})
          </AutoGenerateToggle>
        </div>
      </div>
    ) : null}

    <div className="mt-4 flex flex-wrap items-center gap-2">
      {workspace === "characters" ? (
        <Link
          href="/tavern"
          className="text-xs font-semibold text-[var(--accent-dim)] underline-offset-2 hover:underline"
        >
          Manage heroes &amp; fellowships in {THE_TAVERN}
        </Link>
      ) : null}
    </div>

    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {workspace === "maps" ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[var(--muted)]">
              What kind of maps?
            </legend>
            <div
              className="flex flex-col gap-2 rounded-lg border p-2 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              {(
                [
                  {
                    id: "overland" as const,
                    label: "Locale / overland",
                    hint: "Bird's-eye travel views: regions, roads, sites",
                  },
                  {
                    id: "battle" as const,
                    label: "Battle maps",
                    hint: "Top-down fight scenes for the table",
                  },
                  {
                    id: "both" as const,
                    label: "Both",
                    hint: "One overview plus fight maps",
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2"
                  style={{
                    background:
                      mapForm.mapKind === opt.id
                        ? "rgba(201, 162, 39, 0.15)"
                        : "transparent",
                    outline:
                      mapForm.mapKind === opt.id
                        ? "1px solid var(--accent)"
                        : "none",
                  }}
                >
                  <input
                    type="radio"
                    name="mapKind"
                    value={opt.id}
                    checked={mapForm.mapKind === opt.id}
                    onChange={() =>
                      setMapForm((f) => ({ ...f, mapKind: opt.id }))
                    }
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-semibold text-[var(--text)]">
                      {opt.label}
                    </span>
                    <span className="block text-[var(--muted)]">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <SeedMultiSelect
            label="Your saved CFs (recommended)"
            seeds={ddeasySeeds}
            selectedIds={mapLibraryReferenceIds}
            onChange={setMapLibraryReferenceIds}
            workshopTab="maps"
            emptyHint="Save a realm or adventure first — it will appear here as a source to draw from."
            description="CFs are your saved story notes. Pick one or more and the map follows their places and names first; the scene notes below just add detail."
          />
          <fieldset
            className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <legend className="text-sm font-medium text-[var(--muted)]">
              Map scale
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Distance labels on the <strong className="font-medium text-[var(--text)]/90">scale bar</strong> and{" "}
              <strong className="font-medium text-[var(--text)]/90">battle grid</strong> (ft vs m). Default: imperial.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="mapDistanceUnitsMaps"
                  checked={mapDistanceUnits === "imperial"}
                  onChange={() => setMapDistanceUnits("imperial")}
                  className="accent-[var(--accent)]"
                />
                <span>Imperial (miles, feet)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="mapDistanceUnitsMaps"
                  checked={mapDistanceUnits === "metric"}
                  onChange={() => setMapDistanceUnits("metric")}
                  className="accent-[var(--accent)]"
                />
                <span>Metric (km, meters)</span>
              </label>
            </div>
          </fieldset>
          {(mapForm.mapKind === "battle" || mapForm.mapKind === "both") && (
            <BattleMapGridFieldset
              mapForm={mapForm}
              onApplyPreset={(cols, rows) => applyBattleGridSize(cols, rows)}
              onCustomSize={(cols, rows) => applyBattleGridSize(cols, rows)}
            />
          )}
          <Field
            label="Location or region name (optional)"
            value={mapForm.locationName}
            onChange={(v) => setMapForm((f) => ({ ...f, locationName: v }))}
            placeholder="e.g. The Saltfen Catacombs"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Level range (optional)"
              value={mapForm.levelRange}
              onChange={(v) => setMapForm((f) => ({ ...f, levelRange: v }))}
              placeholder={ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER}
            />
            <Field
              label="Party size (optional)"
              value={mapForm.partySize}
              onChange={(v) => setMapForm((f) => ({ ...f, partySize: v }))}
              placeholder={ADVENTURE_SAMPLE_PARTY_PLACEHOLDER}
            />
          </div>
          <Field
            label="Mood / terrain (optional)"
            value={mapForm.tone}
            onChange={(v) => setMapForm((f) => ({ ...f, tone: v }))}
            placeholder={MAP_SAMPLE_TONE_PLACEHOLDER}
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--text)]">
              Scene or adventure context
            </span>
            <span className="text-xs text-[var(--muted)]">
              {mapLibraryReferenceIds.length > 0
                ? "Encounter layout and extra labels not already in your CF sources. Geography and place names defer to the CFs above."
                : "Locations, encounter spaces, and names you want on the map. Attach CF sources above when you have a saved realm or adventure."}
            </span>
            <textarea
              value={mapForm.context}
              onChange={(e) =>
                setMapForm((f) => ({ ...f, context: e.target.value }))
              }
              rows={5}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder={MAP_SAMPLE_CONTEXT_PLACEHOLDER}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Image size"
              value={mapForm.imageSize}
              onChange={(v) =>
                setMapForm((f) => ({
                  ...f,
                  imageSize: v as MapFormState["imageSize"],
                }))
              }
              options={[
                { value: "1536x1024", label: "Wide — landscape" },
                { value: "1024x1024", label: "Square" },
                { value: "1024x1536", label: "Tall — portrait" },
              ]}
            />
            <SelectField
              label="Image quality"
              value={mapForm.imageQuality}
              onChange={(v) =>
                setMapForm((f) => ({
                  ...f,
                  imageQuality: v as MapFormState["imageQuality"],
                }))
              }
              options={[
                { value: "high", label: "High detail" },
                { value: "medium", label: "Medium detail" },
              ]}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--muted)]">
              Extra notes (optional)
            </span>
            <textarea
              value={mapForm.extraNotes}
              onChange={(e) =>
                setMapForm((f) => ({ ...f, extraNotes: e.target.value }))
              }
              rows={2}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Verticality, hazards to emphasize, no water levels, etc."
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            When you are ready, use <span className="text-[var(--text)]/90">Generate maps</span>{" "}
            at the bottom of the form.
          </p>
        </>
      ) : null}
      {workspace === "props" ? (
        <>
          <SelectField
            label="Item type"
            value={propForm.itemCategory}
            onChange={(v) =>
              setPropForm((f) => ({
                ...f,
                itemCategory: v as PropItemCategory,
              }))
            }
            options={[
              { value: "paper", label: "Paper & documents (letters, scrolls, maps, ledgers)" },
              { value: "potion", label: "Potion, phial, or bottle" },
              { value: "weapon", label: "Weapon" },
              { value: "armor", label: "Armor or shield" },
              { value: "tool", label: "Tool, key, or instrument" },
              { value: "container", label: "Chest, box, bag, or cask" },
              { value: "wearable", label: "Clothing, jewelry, or accessory" },
              { value: "food_drink", label: "Food or drink (still life)" },
              { value: "relic", label: "Relic, symbol, or small carved idol" },
              { value: "other", label: "Other object" },
            ]}
          />
          <p className="text-xs text-[var(--muted)]">
            Pick what kind of object to draw, describe it below, then use{" "}
            <span className="text-[var(--text)]/90">Generate prop image</span> at the bottom.
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--text)]">Description</span>
            <span className="text-xs text-[var(--muted)]">
              What it looks like, materials, color, and any in-world text or marks. Be
              specific — the picture follows your words closely.
            </span>
            <textarea
              value={propForm.description}
              onChange={(e) => setPropForm((f) => ({ ...f, description: e.target.value }))}
              rows={7}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Example (potion): dark green glass, wax seal, paper label with three words in block letters, sediment at the bottom…"
            />
          </label>
          <Field
            label="Short label (optional)"
            value={propForm.title}
            onChange={(v) => setPropForm((f) => ({ ...f, title: v }))}
            placeholder="e.g. Captain’s letter — for your files / download name"
          />
          <Field
            label="Look / materials (optional)"
            value={propForm.style}
            onChange={(v) => setPropForm((f) => ({ ...f, style: v }))}
            placeholder="e.g. ink on parchment, chalk on board, stenciled crate"
          />
          <Field
            label="Age and wear (optional)"
            value={propForm.ageWear}
            onChange={(v) => setPropForm((f) => ({ ...f, ageWear: v }))}
            placeholder="e.g. water stains, torn corner, fresh wax"
          />
          <Field
            label="Setting hint (optional)"
            value={propForm.settingHint}
            onChange={(v) => setPropForm((f) => ({ ...f, settingHint: v }))}
            placeholder="e.g. rainy port city in a grim fantasy kingdom"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--muted)]">
              Extra notes (optional)
            </span>
            <textarea
              value={propForm.extraNotes}
              onChange={(e) => setPropForm((f) => ({ ...f, extraNotes: e.target.value }))}
              rows={2}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Anything else the picture should respect (e.g. no gore, keep text readable)"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Image size"
              value={propForm.imageSize}
              onChange={(v) =>
                setPropForm((f) => ({
                  ...f,
                  imageSize: v as PropFormState["imageSize"],
                }))
              }
              options={[
                { value: "1024x1536", label: "Tall — portrait" },
                { value: "1536x1024", label: "Wide — landscape" },
                { value: "1024x1024", label: "Square" },
              ]}
            />
            <SelectField
              label="Image quality"
              value={propForm.imageQuality}
              onChange={(v) =>
                setPropForm((f) => ({
                  ...f,
                  imageQuality: v as PropFormState["imageQuality"],
                }))
              }
              options={[
                { value: "high", label: "High detail" },
                { value: "medium", label: "Medium detail" },
              ]}
            />
          </div>
        </>
      ) : null}
      {workspace === "realm" ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-[var(--muted)]">
              Size of realm
            </legend>
            <div
              className="flex flex-col gap-2 rounded-lg border p-2 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              {REALM_SIZES.map((id) => {
                const { label, detail } = REALM_SIZE_LABEL[id];
                return (
                  <label
                    key={id}
                    title={detail}
                    className="flex cursor-help items-start gap-2 rounded-md px-2 py-2"
                    style={{
                      background:
                        realmForm.realmSize === id
                          ? "rgba(201, 162, 39, 0.15)"
                          : "transparent",
                      outline:
                        realmForm.realmSize === id
                          ? "1px solid var(--accent)"
                          : "none",
                    }}
                  >
                    <input
                      type="radio"
                      name="realmSize"
                      value={id}
                      checked={realmForm.realmSize === id}
                      onChange={() =>
                        setRealmForm((f) => ({ ...f, realmSize: id }))
                      }
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="font-semibold text-[var(--text)]">{label}</span>
                      <span className="block text-[var(--muted)]">{detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div
            className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <SeedMultiSelect
              label="Your saved CFs (optional)"
              seeds={ddeasySeeds}
              selectedIds={selectedRealmCreationSeedIds}
              onChange={setSelectedRealmCreationSeedIds}
              workshopTab="realm"
              emptyHint="Generate a realm or adventure first; it saves itself here automatically."
              description="CFs are your saved story notes. Pick one or more to stay consistent with their places and lore, or to zoom in or expand — the size and description you set here still lead."
            />
            <p className="text-xs text-[var(--muted)]">
              Add or edit CFs by hand in the{" "}
              <Link
                href="/library"
                className="font-medium text-[var(--accent)] underline underline-offset-2"
              >
                Library
              </Link>
              .
            </p>
          </div>
          <Field
            label="Working name or theme (optional)"
            value={realmForm.titleHint}
            onChange={(v) => setRealmForm((f) => ({ ...f, titleHint: v }))}
            placeholder="e.g. The Ash Covenant coast"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--text)]">Describe what you want</span>
            <span className="text-xs text-[var(--muted)]">
              Tone, geography, who holds power, conflicts, and what you need to run at the
              table. Ancestry and peoples mix are woven in automatically unless you specify
              races in this box or extra notes. Required.
            </span>
            <SrdMarkdownTextarea
              value={realmForm.description}
              onChange={(description) =>
                setRealmForm((f) => ({ ...f, description }))
              }
              rows={8}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder={REALM_SAMPLE_DESCRIPTION}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--muted)]">Extra notes (optional)</span>
            <textarea
              value={realmForm.extraNotes}
              onChange={(e) =>
                setRealmForm((f) => ({ ...f, extraNotes: e.target.value }))
              }
              rows={3}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Constraints, inspirations to avoid, safety tools, level band, or specific races/ancestries…"
            />
          </label>
          <div
            className="rounded-lg border p-3 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Your realm arrives as table-ready pages and{" "}
              <strong className="text-[var(--text)]">saves itself as a CF</strong>{" "}
              in the Library — named from your working title, and you can rename
              it there anytime.                   For travel or locale map images, open the{" "}
              <button
                type="button"
                onClick={() => selectWorkspace("maps")}
                className="font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-90"
              >
                {MODE_TAB_LABEL.maps}
              </button>{" "}
              workspace and attach your saved realm CF under Library references.
            </p>
          </div>
        </>
      ) : null}
      {workspace === "adventure" ? (
        <div
          className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
          style={{ borderColor: "var(--border)" }}
        >
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-[var(--muted)]">Number of sessions</span>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={form.sessionCount}
              onChange={(e) => {
                const sessionCount = Math.min(
                  20,
                  Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                );
                setForm((f) => ({
                  ...f,
                  sessionCount,
                  adventureLength: adventureLengthFromSessionCount(sessionCount),
                  sessionLength: formatSessionLengthField(sessionCount, f.hoursPerSession),
                }));
              }}
              className="rounded border px-2 py-1.5 text-sm tabular-nums"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              aria-label="Number of sessions"
            />
            <span className="text-[10px] text-[var(--text-soft)]">1–20 sessions for this arc</span>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-[var(--muted)]">Average time per session</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={form.hoursPerSession}
                onChange={(e) => {
                  const hoursPerSession = Math.min(
                    12,
                    Math.max(0.5, Number.parseFloat(e.target.value) || 3),
                  );
                  setForm((f) => ({
                    ...f,
                    hoursPerSession,
                    sessionLength: formatSessionLengthField(f.sessionCount, hoursPerSession),
                  }));
                }}
                className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm tabular-nums"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                aria-label="Average hours per session"
              />
              <span className="shrink-0 text-xs text-[var(--text-soft)]">hours</span>
            </div>
            <span className="text-[10px] text-[var(--text-soft)]">
              ≈ {Math.round(form.sessionCount * form.hoursPerSession * 10) / 10}h total table time
            </span>
          </label>
        </div>
      ) : null}
      {workspace === "adventure" ? (
        <div
          className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <SeedMultiSelect
            label="Your saved CFs (optional)"
            seeds={ddeasySeeds}
            selectedIds={selectedSourceSeedIds}
            onChange={setSelectedSourceSeedIds}
            workshopTab="adventure"
            emptyHint="Generate a realm or adventure first; it saves itself here automatically."
            description="CFs are your saved story notes. Pick one or more to anchor the adventure's places, factions, and lore — the details you fill in below still control plot, levels, and tone."
          />
          <p className="text-xs text-[var(--muted)]">
            Add or edit CFs by hand in the{" "}
            <Link
              href="/library"
              className="font-medium text-[var(--accent)] underline underline-offset-2"
            >
              Library
            </Link>
            .
          </p>
        </div>
      ) : null}
      {workspace === "characters" ? (
        <div
          className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <SeedMultiSelect
            label="Your saved CFs (optional)"
            seeds={ddeasySeeds}
            selectedIds={selectedSourceSeedIds}
            onChange={setSelectedSourceSeedIds}
            workshopTab="characters"
            emptyHint="Save a realm or adventure CF in the Library first."
            description="CFs are your saved story notes. Pick one or more to ground the party's backstories, faction ties, and world flavor — the class, race, and concept fields below still apply."
          />
          <p className="text-xs text-[var(--muted)]">
            Manage CFs in the{" "}
            <Link
              href="/library"
              className="font-medium text-[var(--accent)] underline underline-offset-2"
            >
              Library
            </Link>
            .
          </p>
        </div>
      ) : null}
      {workspace === "adventure" ? (
        <div
          className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-[var(--muted)]">
              Combat focus (1–5)
            </span>
            <span className="tabular-nums text-[var(--text)]">
              <span className="font-semibold">{form.combatIntensity}</span>
              <span className="text-[var(--muted)]"> / 5 — </span>
              <span className="text-[var(--muted)]">
                {form.combatIntensity <= 2
                  ? "lighter on fights"
                  : form.combatIntensity >= 4
                    ? "more fights"
                    : "balanced"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 px-0.5">
            <span className="w-11 shrink-0 text-xs text-[var(--muted)]">
              Light
            </span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={form.combatIntensity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  combatIntensity: Number(
                    e.target.value,
                  ) as CombatIntensity,
                }))
              }
              className="h-2 flex-1 cursor-pointer accent-[var(--accent)]"
              aria-label="Combat focus from 1 light to 5 heavy"
            />
            <span className="w-11 shrink-0 text-right text-xs text-[var(--muted)]">
              Heavy
            </span>
          </div>
        </div>
      ) : null}
      {workspace === "adventure" || workspace === "characters" ? (
        <>
          <Field
            label={
              workspace === "adventure"
                ? "Title or theme hint (optional)"
                : "Party concept or theme (optional)"
            }
            value={form.titleHint}
            onChange={(v) => setForm((f) => ({ ...f, titleHint: v }))}
            placeholder={
              workspace === "adventure"
                ? "e.g. The Drowned Choir"
                : "e.g. Disgraced city watch turned monster slayers"
            }
          />
          <Field
            label="Level range (optional)"
            value={form.levelRange}
            onChange={(v) => setForm((f) => ({ ...f, levelRange: v }))}
            placeholder={
              workspace === "adventure"
                ? ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER
                : CHARACTERS_SAMPLE_LEVEL_PLACEHOLDER
            }
          />
          <Field
            label="Tone (optional)"
            value={form.tone}
            onChange={(v) => setForm((f) => ({ ...f, tone: v }))}
            placeholder={
              workspace === "adventure"
                ? ADVENTURE_SAMPLE_TONE_PLACEHOLDER
                : "e.g. hopeful, witty banter"
            }
          />
          <Field
            label={
              workspace === "adventure" ? "Setting (optional)" : "World flavor (optional)"
            }
            value={form.setting}
            onChange={(v) => setForm((f) => ({ ...f, setting: v }))}
            placeholder={
              workspace === "adventure"
                ? ADVENTURE_SAMPLE_SETTING_PLACEHOLDER
                : "e.g. trade-road kingdoms and old battlefields"
            }
          />
          {workspace === "adventure" ? (
            <Field
              label="Villain / threat (optional)"
              value={form.villainOrThreat}
              onChange={(v) =>
                setForm((f) => ({ ...f, villainOrThreat: v }))
              }
              placeholder={ADVENTURE_SAMPLE_VILLAIN_PLACEHOLDER}
            />
          ) : null}
          {workspace === "adventure" ? (
            <Field
              label="Party size (optional)"
              value={form.partySize}
              onChange={(v) => setForm((f) => ({ ...f, partySize: v }))}
              placeholder={ADVENTURE_SAMPLE_PARTY_PLACEHOLDER}
            />
          ) : null}
          {workspace === "characters" ? (
            <fieldset
              className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <legend className="px-1 text-sm font-medium text-[var(--muted)]">
                Party members ({characterSlots.length})
              </legend>
              <p className="text-xs text-[var(--muted)]">
                Built from the free rules included with the app. Leave{" "}
                <strong className="text-[var(--text)]">Any</strong> on a slot to let the AI
                pick a hero that rounds out the party. Add or remove members below (up to{" "}
                {MAX_PARTY_SIZE}).
              </p>
              <div className="flex flex-col gap-2">
                {characterSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-md border p-3"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-wide text-[var(--text)]">
                        Hero {index + 1}
                      </span>
                      {characterSlots.length > MIN_PARTY_SIZE ? (
                        <button
                          type="button"
                          onClick={() => {
                            const next = removeCharacterSlot(characterSlots, index);
                            setCharacterSlots(next);
                            setForm((f) => ({ ...f, partySize: String(next.length) }));
                          }}
                          className="rounded border px-2 py-1 text-[11px] font-semibold text-red-800"
                          style={{ borderColor: "var(--border)" }}
                          aria-label={`Remove hero ${index + 1}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <SrdNamedSelect
                        label="Class (included rules)"
                        value={slot.className}
                        emptyLabel="Any — AI chooses"
                        options={SRD_CLASS_NAMES}
                        onChange={(className) => {
                          setCharacterSlots((slots) => {
                            const next = [...slots];
                            next[index] = { ...next[index]!, className };
                            return next;
                          });
                        }}
                        placeholder="e.g. Fighter"
                      />
                      <SrdSpeciesSelect
                        value={slot.race}
                        emptyLabel="Any — AI chooses"
                        onChange={(race) => {
                          setCharacterSlots((slots) => {
                            const next = [...slots];
                            next[index] = { ...next[index]!, race };
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {characterSlots.length < MAX_PARTY_SIZE ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = addCharacterSlot(characterSlots);
                    setCharacterSlots(next);
                    setForm((f) => ({ ...f, partySize: String(next.length) }));
                  }}
                  className="self-start rounded-md border px-3 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: "var(--accent-dim)",
                    background: "rgba(201,162,39,0.15)",
                  }}
                >
                  + Add party member
                </button>
              ) : (
                <p className="text-[11px] text-[var(--muted)]">
                  Maximum party size ({MAX_PARTY_SIZE}) reached.
                </p>
              )}
            </fieldset>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--muted)]">
              Extra notes (optional)
            </span>
            <SrdMarkdownTextarea
              value={form.extraNotes}
              onChange={(extraNotes) => setForm((f) => ({ ...f, extraNotes }))}
              rows={3}
              showInsertBar={false}
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="Puzzles to avoid, safety tools, recurring hero hooks…"
            />
          </label>
        </>
      ) : null}

      <ProgressPanel
        mode={workspace}
        stage={progressStage}
        loading={loading}
        imageLoading={imageLoading}
        autoMapEnabled={autoGenerateAdventureMap}
        autoPropsEnabled={autoGenerateAdventureProps}
      />
      {partySaveMessage ? (
        <p
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--accent-dim)",
            background: "rgba(201,162,39,0.12)",
            color: "var(--text)",
          }}
          role="status"
        >
          {partySaveMessage}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {imageError ? (
        <p
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {imageError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-md mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generating…"
          : workspace === "realm"
            ? "Generate realm"
            : workspace === "adventure"
              ? "Generate adventure"
              : workspace === "characters"
                ? "Generate heroes"
                : workspace === "props"
                  ? "Generate item image"
                  : "Generate maps"}
      </button>
    </form>
    </section>
  );
}
