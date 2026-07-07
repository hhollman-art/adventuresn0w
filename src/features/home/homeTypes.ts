import type { AdventureLength, CombatIntensity } from "@/lib/adventurePrompt";
import type { RealmSize } from "@/lib/realmPrompt";
import type { LibraryImage } from "@/lib/generationLibrary";
import type { MapPackKind } from "@/lib/mapImagePrompt";
import type { PropItemCategory } from "@/lib/propImagePrompt";
import type { SeedKind } from "@/lib/realmSeeds";
import {
  DEFAULT_VTT_GRID_COLS,
  DEFAULT_VTT_GRID_ROWS,
  imageSizeForVttGrid,
} from "@/lib/tabletop/gridPresets";

export type GenerateMode =
  | "realm"
  | "adventure"
  | "characters"
  | "maps"
  | "props"
  | "library";

export type CreationMode = Exclude<GenerateMode, "library">;

/** Workshop home view — welcome hearth or a creation forge. */
export type WorkshopWorkspace = "welcome" | CreationMode;

/** Creation tabs only — Library lives in the site title bar (/library). */
export const MODE_TAB_ORDER: readonly CreationMode[] = [
  "realm",
  "adventure",
  "characters",
  "props",
  "maps",
] as const;

export const MODE_TAB_LABEL: Record<GenerateMode, string> = {
  realm: "Realm",
  adventure: "Adventure",
  characters: "Heroes",
  props: "Items",
  maps: "Maps",
  library: "Library",
};


export type SeedEditorDraft = {
  id: string | null;
  kind: SeedKind;
  name: string;
  realmSize: RealmSize;
  briefDescription: string;
  tagsInput: string;
  markdown: string;
};

export const EMPTY_SEED_DRAFT: SeedEditorDraft = {
  id: null,
  kind: "realm",
  name: "",
  realmSize: "region",
  briefDescription: "",
  tagsInput: "",
  markdown: "",
};

export type GeneratedImage = LibraryImage;

export type ProgressStage =
  | "idle"
  | "realm_generating"
  | "adventure_generating"
  | "adventure_done"
  | "map_locale_generating"
  | "map_battle_generating"
  | "prop_generating"
  | "map_done"
  | "complete"
  | "error";

export type MapFormState = {
  mapKind: MapPackKind;
  locationName: string;
  levelRange: string;
  partySize: string;
  tone: string;
  context: string;
  battleGridCols: number;
  battleGridRows: number;
  extraNotes: string;
  imageSize: "1024x1024" | "1536x1024" | "1024x1536";
  imageQuality: "medium" | "high";
};

export type MapImagePayload = MapFormState & { gridNotes: string };

export const MAP_PACK_LABEL: Record<MapFormState["mapKind"], string> = {
  overland: "Locale / overland",
  battle: "Battle maps",
  both: "Both (overland + battle)",
};

export type PropFormState = {
  itemCategory: PropItemCategory;
  title: string;
  description: string;
  style: string;
  ageWear: string;
  settingHint: string;
  extraNotes: string;
  imageSize: "1024x1024" | "1536x1024" | "1024x1536";
  imageQuality: "medium" | "high";
};

/** Long textarea placeholders (grey; hidden on focus via globals.css). */
export const MAP_SAMPLE_CONTEXT_PLACEHOLDER = [
  "Party corners a beast in the flooded lower ring: a chokepoint skirmish in a gatehouse, then a balcony finale over black water.",
  "Name regions, rooms, and landmarks you want labeled on the map.",
].join(" ");

export const MAP_SAMPLE_TONE_PLACEHOLDER =
  "e.g. rain-slick stone, broken walkways, cold bioluminescence";

export const ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER = "e.g. 3–4";
export const ADVENTURE_SAMPLE_TONE_PLACEHOLDER = "e.g. heroic, slightly spooky";
export const ADVENTURE_SAMPLE_SETTING_PLACEHOLDER = "e.g. misty river valley with ruined shrines";
export const ADVENTURE_SAMPLE_VILLAIN_PLACEHOLDER = "e.g. a pact-bound beast and its charmed villagers";
export const ADVENTURE_SAMPLE_PARTY_PLACEHOLDER = "e.g. 4";
export const ADVENTURE_SAMPLE_SESSION_PLACEHOLDER = "e.g. 3–4 hours";

export const CHARACTERS_SAMPLE_LEVEL_PLACEHOLDER = "e.g. 3";

/** Defaults merged into auto-generated prop payloads (not shown in the empty props form). */
export const AUTO_PROP_FALLBACK_STYLE = "ink on cream paper, legible for a table handout";
export const AUTO_PROP_FALLBACK_AGE_WEAR =
  "light edge wear, believable for adventuring use";
export const AUTO_PROP_FALLBACK_SETTING = "generic focal tone from your adventure fields above";

export const initialMapForm: MapFormState = {
  mapKind: "both",
  locationName: "",
  levelRange: "",
  partySize: "",
  tone: "",
  context: "",
  battleGridCols: DEFAULT_VTT_GRID_COLS,
  battleGridRows: DEFAULT_VTT_GRID_ROWS,
  extraNotes: "",
  imageSize: imageSizeForVttGrid(DEFAULT_VTT_GRID_COLS, DEFAULT_VTT_GRID_ROWS),
  imageQuality: "high",
};

/** Template spread for adventure-driven prop images (API payloads only). */
export const initialPropForm: PropFormState = {
  itemCategory: "paper",
  title: "",
  description: "",
  style: AUTO_PROP_FALLBACK_STYLE,
  ageWear: AUTO_PROP_FALLBACK_AGE_WEAR,
  settingHint: AUTO_PROP_FALLBACK_SETTING,
  extraNotes: "",
  imageSize: "1024x1536",
  imageQuality: "high",
};

export const initialPropFormStandalone: PropFormState = {
  itemCategory: "paper",
  title: "",
  description: "",
  style: "",
  ageWear: "",
  settingHint: "",
  extraNotes: "",
  imageSize: "1024x1536",
  imageQuality: "high",
};

export type FormState = {
  adventureLength: AdventureLength;
  combatIntensity: CombatIntensity;
  titleHint: string;
  levelRange: string;
  tone: string;
  setting: string;
  villainOrThreat: string;
  partySize: string;
  sessionLength: string;
  extraNotes: string;
};

export const initialForm: FormState = {
  adventureLength: "short",
  combatIntensity: 3,
  titleHint: "",
  levelRange: "",
  tone: "",
  setting: "",
  villainOrThreat: "",
  partySize: "",
  sessionLength: "",
  extraNotes: "",
};

export const initialFormCharacters: FormState = {
  adventureLength: "short",
  combatIntensity: 3,
  titleHint: "",
  levelRange: "",
  tone: "",
  setting: "",
  villainOrThreat: "",
  partySize: "",
  sessionLength: "",
  extraNotes: "",
};

export type RealmFormState = {
  realmSize: RealmSize;
  titleHint: string;
  description: string;
  extraNotes: string;
};

/** Grey placeholder in “Describe what you want” (clears on focus via globals.css). */
export const REALM_SAMPLE_DESCRIPTION = [
  "A trade kingdom wedged between old forest and a fault-line sea, where guild charters matter as much as crowns.",
  "I want port politics, a haunted interior road, and one religion split between reformers and inquisitors.",
].join(" ");

export const initialRealmForm: RealmFormState = {
  realmSize: "country",
  titleHint: "",
  description: "",
  extraNotes: "",
};

/** After a successful realm run: same blank form; sample lives in the textarea placeholder. */
export const emptyRealmForm: RealmFormState = {
  realmSize: "country",
  titleHint: "",
  description: "",
  extraNotes: "",
};
