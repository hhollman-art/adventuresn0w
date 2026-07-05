"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ADVENTURE_LENGTH_HOVER_HELP,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import { REALM_SIZE_LABEL, REALM_SIZES, type RealmSize } from "@/lib/realmPrompt";
import {
  combineLabeledSeedMarkdown,
  combineSavedSeedMarkdown,
  pruneSeedIds,
} from "@/lib/seedReference";
import { SEED_TAG_SUGGESTIONS } from "@/lib/seedTags";
import { MAX_LIBRARY_REF_CHARS } from "@/lib/requestLimits";
import SeedMultiSelect from "@/features/workshop/SeedMultiSelect";
import WorkshopLibraryPanel, {
  type LibraryViewSelection,
} from "@/features/workshop/WorkshopLibraryPanel";
import WorkflowTutorialOverlay from "@/features/workshop/WorkflowTutorialOverlay";
import { isWorkflowTutorialId } from "@/lib/workshop/workflowTutorials";
import { scheduleLibrarySnapshot } from "@/lib/workshop/librarySync";
import {
  appendGenerationLibraryItem,
  deleteGenerationLibraryItem,
  LIBRARY_KIND_LABEL,
  loadGenerationLibraryItems,
  updateGenerationLibraryItem,
  type LibraryImage,
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
  suggestedSeedName,
  updateRealmSeed,
  SEED_KIND_LABEL,
  SEED_KINDS,
  type SavedRealmSeed,
  type SeedKind,
} from "@/lib/realmSeeds";
import type { MapPackKind } from "@/lib/mapImagePrompt";
import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { PropItemCategory } from "@/lib/propImagePrompt";
import { SrdNamedSelect, SrdSpeciesSelect } from "@/features/ui/SrdPickers";
import { SRD_CLASS_NAMES } from "@/lib/srd";
import { fetchDnd5eResource } from "@/lib/srd/dnd5eApi";
import { dnd5eResourceToMarkdown } from "@/lib/srd/dnd5eApiMarkdown";
import {
  addCharacterSlot,
  defaultCharacterSlots,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  removeCharacterSlot,
  type CharacterSlotSpec,
} from "@/lib/srdCharacterOptions";
import {
  deleteSavedCharacterRoster,
  loadSavedCharacterRosters,
  onRostersChanged,
  saveCharacterRoster,
  type SavedCharacterRoster,
} from "@/lib/tabletop/characterRoster";
import { parseCharactersMarkdown } from "@/lib/tabletop/parseCharactersMarkdown";
import { queuePartyImport } from "@/lib/tabletop/partyCampaign";
import { renderMarkdownToHtml } from "@/lib/markdownRender";
import OutputMarkdownCarousel from "@/features/workshop/OutputMarkdownCarousel";
import { postHeartbeatJson } from "@/lib/sseClient";
import {
  extractAdventureScenes,
  MAX_AUTO_SCENE_IMAGES,
  type AdventureSceneSnippet,
} from "@/lib/extractAdventureScenes";
import {
  buildBattleMapGridNotes,
  buildBattleMapScenePromptLead,
  clampVttGridSize,
  DEFAULT_VTT_GRID_COLS,
  DEFAULT_VTT_GRID_ROWS,
  findVttGridPreset,
  imageSizeForVttGrid,
  MAX_VTT_GRID_SIDE,
  MIN_VTT_GRID_SIDE,
  VTT_GRID_PRESETS,
} from "@/lib/tabletop/gridPresets";

type GenerateMode =
  | "realm"
  | "adventure"
  | "characters"
  | "maps"
  | "props"
  | "library";

type CreationMode = Exclude<GenerateMode, "library">;

/** Creation tabs only — Library lives in the site title bar (/library). */
const MODE_TAB_ORDER: readonly CreationMode[] = [
  "realm",
  "adventure",
  "characters",
  "props",
  "maps",
] as const;

const MODE_TAB_LABEL: Record<GenerateMode, string> = {
  realm: "Realm",
  adventure: "Adventure",
  characters: "Characters",
  props: "Props",
  maps: "Maps",
  library: "Library",
};

/** One-line plain-language answer to "what will this make?" under each tab label. */
const MODE_TAB_HINT: Record<CreationMode, string> = {
  realm: "Build a world or town",
  adventure: "Write a night's quest",
  characters: "Make a ready party",
  props: "Craft handout images",
  maps: "Draw travel & battle maps",
};

/** Decorative tab icons (fantasy theme); hidden from screen readers. */
const MODE_TAB_ICON: Record<GenerateMode, string> = {
  realm: "\u{1F3F0}", // castle
  adventure: "\u2694\uFE0F", // crossed swords
  characters: "\u{1F9D9}", // mage
  props: "\u{1F3FA}", // amphora
  maps: "\u{1F5FA}\uFE0F", // world map
  library: "\u{1F4DC}", // scroll
};

async function autoSaveGeneratedSeed(params: {
  kind: SeedKind;
  realmSize?: RealmSize;
  titleHint: string;
  briefDescription: string;
  markdown: string;
}): Promise<{ savedSeedId: string; seeds: SavedRealmSeed[] }> {
  const seedName = suggestedSeedName(
    params.markdown,
    params.titleHint,
    params.kind,
  );
  const titleHint = params.titleHint.trim() || seedName;
  const seeds = await appendRealmSeed({
    kind: params.kind,
    seedName,
    realmSize: params.realmSize,
    titleHint,
    briefDescription: params.briefDescription,
    markdown: params.markdown,
  });
  return { savedSeedId: seeds[0]!.id, seeds };
}

const MAP_PACK_LABEL: Record<MapFormState["mapKind"], string> = {
  overland: "Locale / overland",
  battle: "Battle maps",
  both: "Both (overland + battle)",
};

function buildMapSeedMarkdown(form: MapFormState): string {
  const title = form.locationName.trim() || "Map pack";
  const lines = [`# ${title}`, ""];
  lines.push(`- **Pack type:** ${MAP_PACK_LABEL[form.mapKind]}`);
  if (form.tone.trim()) lines.push(`- **Tone / biome:** ${form.tone.trim()}`);
  if (form.levelRange.trim()) {
    lines.push(`- **Level range:** ${form.levelRange.trim()}`);
  }
  if (form.partySize.trim()) {
    lines.push(`- **Party size:** ${form.partySize.trim()}`);
  }
  if (form.mapKind !== "overland") {
    lines.push(
      `- **VTT grid:** ${form.battleGridCols} × ${form.battleGridRows} squares (grid overlaid by Virtual Table, not printed on art)`,
    );
  }
  if (form.context.trim()) {
    lines.push("", "## Scene context", "", form.context.trim());
  }
  if (form.extraNotes.trim()) {
    lines.push("", "## Extra notes", "", form.extraNotes.trim());
  }
  return lines.join("\n");
}

function propCategoryLabel(category: PropFormState["itemCategory"]): string {
  return category.replace(/_/g, " ");
}

function buildPropSeedMarkdown(form: PropFormState): string {
  const title =
    form.title.trim() ||
    form.description.trim().slice(0, 72) ||
    "Prop handout";
  const lines = [`# ${title}`, ""];
  lines.push(`- **Item type:** ${propCategoryLabel(form.itemCategory)}`);
  if (form.description.trim()) {
    lines.push("", "## Description", "", form.description.trim());
  }
  if (form.style.trim()) {
    lines.push("", "## Style", "", form.style.trim());
  }
  if (form.ageWear.trim()) {
    lines.push("", "## Age / wear", "", form.ageWear.trim());
  }
  if (form.settingHint.trim()) {
    lines.push("", "## Setting hint", "", form.settingHint.trim());
  }
  if (form.extraNotes.trim()) {
    lines.push("", "## Extra notes", "", form.extraNotes.trim());
  }
  return lines.join("\n");
}

/**
 * Working draft for the manual seed editor. `id` is null when creating a brand
 * new seed by hand, or the existing seed id when editing one in place.
 */
type SeedEditorDraft = {
  id: string | null;
  kind: SeedKind;
  name: string;
  realmSize: RealmSize;
  briefDescription: string;
  tagsInput: string;
  markdown: string;
};

const EMPTY_SEED_DRAFT: SeedEditorDraft = {
  id: null,
  kind: "realm",
  name: "",
  realmSize: "region",
  briefDescription: "",
  tagsInput: "",
  markdown: "",
};

type GeneratedImage = LibraryImage;

type MapImagePayload = MapFormState & { gridNotes: string };

function mapPayloadForGeneration(
  form: MapFormState,
  units: MapDistanceUnits,
): MapImagePayload {
  const usesBattleGrid = form.mapKind === "battle" || form.mapKind === "both";
  if (!usesBattleGrid) return { ...form, gridNotes: "" };
  return {
    ...form,
    gridNotes: buildBattleMapGridNotes(form.battleGridCols, form.battleGridRows, units),
    imageSize: imageSizeForVttGrid(form.battleGridCols, form.battleGridRows),
  };
}
type ProgressStage =
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

type MapFormState = {
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

type PropFormState = {
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
const MAP_SAMPLE_CONTEXT_PLACEHOLDER = [
  "Party corners a beast in the flooded lower ring: a chokepoint skirmish in a gatehouse, then a balcony finale over black water.",
  "Name regions, rooms, and landmarks you want labeled on the map.",
].join(" ");

const MAP_SAMPLE_TONE_PLACEHOLDER =
  "e.g. rain-slick stone, broken walkways, cold bioluminescence";

const ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER = "e.g. 3–4";
const ADVENTURE_SAMPLE_TONE_PLACEHOLDER = "e.g. heroic, slightly spooky";
const ADVENTURE_SAMPLE_SETTING_PLACEHOLDER = "e.g. misty river valley with ruined shrines";
const ADVENTURE_SAMPLE_VILLAIN_PLACEHOLDER = "e.g. a pact-bound beast and its charmed villagers";
const ADVENTURE_SAMPLE_PARTY_PLACEHOLDER = "e.g. 4";
const ADVENTURE_SAMPLE_SESSION_PLACEHOLDER = "e.g. 3–4 hours";

const CHARACTERS_SAMPLE_LEVEL_PLACEHOLDER = "e.g. 3";

/** Defaults merged into auto-generated prop payloads (not shown in the empty props form). */
const AUTO_PROP_FALLBACK_STYLE = "ink on cream paper, legible for a table handout";
const AUTO_PROP_FALLBACK_AGE_WEAR =
  "light edge wear, believable for adventuring use";
const AUTO_PROP_FALLBACK_SETTING = "generic focal tone from your adventure fields above";

const initialMapForm: MapFormState = {
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
const initialPropForm: PropFormState = {
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

const initialPropFormStandalone: PropFormState = {
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

type FormState = {
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

const initialForm: FormState = {
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

const initialFormCharacters: FormState = {
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

type RealmFormState = {
  realmSize: RealmSize;
  titleHint: string;
  description: string;
  extraNotes: string;
};

/** Grey placeholder in “Describe what you want” (clears on focus via globals.css). */
const REALM_SAMPLE_DESCRIPTION = [
  "A trade kingdom wedged between old forest and a fault-line sea, where guild charters matter as much as crowns.",
  "I want port politics, a haunted interior road, and one religion split between reformers and inquisitors.",
].join(" ");

const initialRealmForm: RealmFormState = {
  realmSize: "country",
  titleHint: "",
  description: "",
  extraNotes: "",
};

/** After a successful realm run: same blank form; sample lives in the textarea placeholder. */
const emptyRealmForm: RealmFormState = {
  realmSize: "country",
  titleHint: "",
  description: "",
  extraNotes: "",
};

/**
 * Many error paths return plain text or HTML (e.g. "Internal Server Error"), which breaks `res.json()`.
 */
function parseResponseBodyJson(
  res: Response,
  bodyText: string,
): { ok: true; data: unknown } | { ok: false; userMessage: string } {
  const t = bodyText.trim();
  if (!t) {
    if (!res.ok) {
      return { ok: false, userMessage: `Request failed (${res.status})` };
    }
    return { ok: true, data: {} };
  }
  try {
    return { ok: true, data: JSON.parse(t) as unknown };
  } catch {
    const snippet = t.length > 280 ? `${t.slice(0, 280)}…` : t;
    if (!res.ok) {
      return {
        ok: false,
        userMessage: snippet || `Request failed (${res.status})`,
      };
    }
    return {
      ok: false,
      userMessage: `Invalid response (not JSON, status ${res.status}): ${snippet}`,
    };
  }
}

async function fetchMapImageResult(
  payload: MapImagePayload,
  libraryReferenceMarkdown: string | undefined,
  mapDistanceUnits: MapDistanceUnits,
): Promise<{
  images: Array<{ kind: string; imageDataUrl: string }>;
  model: string | null;
  error: string | null;
}> {
  try {
    const trimmedRef = libraryReferenceMarkdown?.trim();
    const { status, body } = await postHeartbeatJson("/api/generate-map-image", {
      ...payload,
      mapDistanceUnits,
      ...(trimmedRef ? { libraryReferenceMarkdown: trimmedRef } : {}),
    });
    const data = body as {
      images?: Array<{ kind: string; imageDataUrl: string }>;
      model?: string;
      error?: string;
    };
    if (status < 200 || status >= 300 || data.error) {
      return {
        images: [],
        model: null,
        error: data.error ?? `Image request failed (${status})`,
      };
    }
    if (!data.images?.length) {
      return { images: [], model: null, error: "No image returned." };
    }
    return { images: data.images, model: data.model ?? null, error: null };
  } catch (err) {
    return {
      images: [],
      model: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

async function fetchPropImageResult(payload: PropFormState): Promise<{
  images: Array<{ kind: string; imageDataUrl: string }>;
  model: string | null;
  error: string | null;
}> {
  try {
    const { status, body } = await postHeartbeatJson(
      "/api/generate-prop-image",
      payload as unknown as Record<string, unknown>,
    );
    const data = body as {
      images?: Array<{ kind: string; imageDataUrl: string }>;
      model?: string;
      error?: string;
    };
    if (status < 200 || status >= 300 || data.error) {
      return {
        images: [],
        model: null,
        error: data.error ?? `Image request failed (${status})`,
      };
    }
    if (!data.images?.length) {
      return { images: [], model: null, error: "No image returned." };
    }
    return { images: data.images, model: data.model ?? null, error: null };
  } catch (err) {
    return {
      images: [],
      model: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

const AUTO_IMAGE_CONCURRENCY = 2;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await worker(items[current]!, current);
    }
  };

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

type StreamResult = { markdown: string; model: string | null; error: string | null };

/**
 * Heuristic for phones/tablets. Auto image generation makes several long
 * (often minute-plus) requests; mobile OSes drop those idle connections when
 * the screen locks or the browser backgrounds the tab, which surfaces as a
 * "load failure" right after the text result. We default that heavy work off
 * on mobile so the primary text result loads reliably (users can still opt in).
 */
function isLikelyMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const mobileUa =
    /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(
      ua,
    );
  const narrow = window.matchMedia?.("(max-width: 820px)").matches ?? false;
  return mobileUa || narrow;
}

/**
 * Non-streaming fallback used when the SSE connection drops mid-result, which
 * is common on mobile networks that close idle streamed connections. Sends a
 * single request and waits for the whole result in one response.
 */
async function fetchMarkdownResultNonStreaming(
  url: string,
  requestBody: Record<string, unknown>,
  onModel: (model: string) => void,
): Promise<StreamResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, stream: false }),
    });
    const raw = await res.text();
    const p = parseResponseBodyJson(res, raw);
    if (!p.ok) {
      return { markdown: "", model: null, error: p.userMessage };
    }
    const data = p.data as { markdown?: string; model?: string; error?: string };
    if (!res.ok) {
      return {
        markdown: "",
        model: null,
        error: data.error ?? `Request failed (${res.status})`,
      };
    }
    const model = data.model ?? null;
    if (model) onModel(model);
    return { markdown: (data.markdown ?? "").trim(), model, error: null };
  } catch (err) {
    return {
      markdown: "",
      model: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

async function fetchAdventureResultStream(
  payload: FormState,
  callbacks: { onChunk: (chunk: string) => void; onModel: (model: string) => void },
  realmSeedMarkdown?: string,
): Promise<StreamResult> {
  const trimmedSeed = realmSeedMarkdown?.trim();
  const requestBody: Record<string, unknown> = {
    ...payload,
    ...(trimmedSeed ? { realmSeedMarkdown: trimmedSeed } : {}),
  };
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ ...requestBody, stream: true }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      const p = parseResponseBodyJson(res, errBody);
      const data = (p.ok ? p.data : {}) as { error?: string };
      return {
        markdown: "",
        model: null,
        error:
          (p.ok ? data.error : p.userMessage) ?? `Request failed (${res.status})`,
      };
    }
    if (!res.body) {
      // Browser doesn't expose a readable stream; use the non-streaming path.
      return fetchMarkdownResultNonStreaming(
        "/api/generate",
        requestBody,
        callbacks.onModel,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let markdown = "";
    let model: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const lines = rawEvent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data: "));
        if (lines.length === 0) continue;
        const dataText = lines.map((line) => line.slice(6)).join("\n");
        const evt = JSON.parse(dataText) as
          | { type: "meta"; model?: string }
          | { type: "chunk"; text?: string }
          | { type: "done"; markdown?: string; model?: string }
          | { type: "error"; error?: string };
        if (evt.type === "meta" && evt.model) {
          model = evt.model;
          callbacks.onModel(evt.model);
        } else if (evt.type === "chunk" && evt.text) {
          markdown += evt.text;
          callbacks.onChunk(evt.text);
        } else if (evt.type === "done") {
          markdown = evt.markdown ?? markdown;
          if (evt.model) {
            model = evt.model;
            callbacks.onModel(evt.model);
          }
        } else if (evt.type === "error") {
          return {
            markdown: "",
            model: null,
            error: evt.error ?? "Streamed request failed.",
          };
        }
      }
    }
    return { markdown: markdown.trim(), model, error: null };
  } catch {
    // Stream interrupted (typical on mobile networks). Retry once without
    // streaming so the user still gets a complete result.
    return fetchMarkdownResultNonStreaming(
      "/api/generate",
      requestBody,
      callbacks.onModel,
    );
  }
}

async function fetchRealmResultStream(
  payload: RealmFormState,
  callbacks: { onChunk: (chunk: string) => void; onModel: (model: string) => void },
  realmSeedMarkdown?: string,
): Promise<StreamResult> {
  const trimmedSeed = realmSeedMarkdown?.trim();
  const requestBody: Record<string, unknown> = {
    realmSize: payload.realmSize,
    titleHint: payload.titleHint,
    description: payload.description,
    extraNotes: payload.extraNotes,
    ...(trimmedSeed ? { realmSeedMarkdown: trimmedSeed } : {}),
  };
  try {
    const res = await fetch("/api/generate-realm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ ...requestBody, stream: true }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      const p = parseResponseBodyJson(res, errBody);
      const data = (p.ok ? p.data : {}) as { error?: string };
      return {
        markdown: "",
        model: null,
        error:
          (p.ok ? data.error : p.userMessage) ?? `Request failed (${res.status})`,
      };
    }
    if (!res.body) {
      return fetchMarkdownResultNonStreaming(
        "/api/generate-realm",
        requestBody,
        callbacks.onModel,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let markdown = "";
    let model: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const lines = rawEvent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data: "));
        if (lines.length === 0) continue;
        const dataText = lines.map((line) => line.slice(6)).join("\n");
        const evt = JSON.parse(dataText) as
          | { type: "meta"; model?: string }
          | { type: "chunk"; text?: string }
          | { type: "done"; markdown?: string; model?: string }
          | { type: "error"; error?: string };
        if (evt.type === "meta" && evt.model) {
          model = evt.model;
          callbacks.onModel(evt.model);
        } else if (evt.type === "chunk" && evt.text) {
          markdown += evt.text;
          callbacks.onChunk(evt.text);
        } else if (evt.type === "done") {
          markdown = evt.markdown ?? markdown;
          if (evt.model) {
            model = evt.model;
            callbacks.onModel(evt.model);
          }
        } else if (evt.type === "error") {
          return {
            markdown: "",
            model: null,
            error: evt.error ?? "Streamed request failed.",
          };
        }
      }
    }
    return { markdown: markdown.trim(), model, error: null };
  } catch {
    // Stream interrupted (typical on mobile networks). Retry once without
    // streaming so the user still gets a complete result.
    return fetchMarkdownResultNonStreaming(
      "/api/generate-realm",
      requestBody,
      callbacks.onModel,
    );
  }
}

export default function Home(props: PageProps<"/">) {
  void props;

  const [mode, setMode] = useState<CreationMode>("realm");
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
  /** Library tab: selected asset shown in the Output panel. */
  const [librarySelection, setLibrarySelection] = useState<LibraryViewSelection>(null);
  const [libraryResults, setLibraryResults] = useState<LibraryItem[]>([]);
  const [libraryParties, setLibraryParties] = useState<SavedCharacterRoster[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<WorkshopLibraryCategory>("all");
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
    return autoSaved.savedSeedId;
  }

  // Auto-save: mirror the library to the user's chosen folder after changes.
  // The snapshot is rebuilt from storage at write time, so firing on mount is harmless.
  useEffect(() => {
    scheduleLibrarySnapshot();
  }, [ddeasySeeds, libraryResults, libraryParties]);

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
  }, [ddeasySeeds, libraryResults, libraryParties, librarySelection]);

  function refreshLibraryData() {
    void loadRealmSeeds().then(setDdeasySeeds);
    void loadGenerationLibraryItems().then(setLibraryResults);
    void loadSavedCharacterRosters().then(setLibraryParties);
  }

  useEffect(() => {
    if (!isLibraryView) return;
    refreshLibraryData();
    return onRostersChanged(() => {
      void loadSavedCharacterRosters().then(setLibraryParties);
    });
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
      setSeedEditorError("Enter a name for this seed.");
      return;
    }
    if (!markdown) {
      setSeedEditorError("Add seed details—the content cannot be empty.");
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
    }
    setSeedEditor(null);
    setSeedEditorError("");
  }

  function selectMode(next: CreationMode) {
    if (isLibraryView) {
      router.push("/");
    }
    setMode(next);
    setLibrarySelection(null);
    setLibraryStatus(null);
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

  function navigateTutorialMode(
    next: "realm" | "adventure" | "characters" | "maps" | "props" | "library",
  ) {
    if (next === "library") {
      router.push("/library");
      refreshLibraryData();
      setLibraryCategory("all");
      return;
    }
    selectMode(next);
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
            `# ${seedDisplayName(seed)}\n\n*(${SEED_KIND_LABEL[seed.kind]} — this seed has no saved text; use the map form fields as the primary brief.)*`,
        };
      });
    return combineLabeledSeedMarkdown(parts, MAX_LIBRARY_REF_CHARS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLibraryView) return;
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
          await appendGenerationLibraryItem({
            kind: "maps",
            title: mapForm.locationName.trim() || "Maps",
            markdown: mapSeedMarkdown,
            textModel: null,
            imageModel: mapResult.model,
            images: mapResult.images,
          });
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
          await appendGenerationLibraryItem({
            kind: "props",
            title:
              propForm.title.trim() ||
              propForm.description.trim().slice(0, 72) ||
              "Prop handout",
            markdown: propSeedMarkdown,
            textModel: null,
            imageModel: propResult.model,
            images: propResult.images,
          });
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
            (libKind === "characters" ? "Characters" : "Adventure"));
        const textLib = await appendGenerationLibraryItem({
          kind: libKind,
          title: libTitle,
          markdown: generatedMarkdown,
          textModel: generatedModel,
          imageModel: recordImageModel,
          images: recordImages,
        });
        setCurrentResultLibraryId(textLib[0]?.id ?? null);
        if (mode === "adventure" || mode === "characters") {
          const titleSnap = form.titleHint.trim();
          const briefDescription =
            mode === "adventure"
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

  function imageDownloadBaseName(): string {
    if (markdown.trim()) {
      return fileBaseName(markdown, mode);
    }
    if (mode === "props") {
      return slugify(propForm.title) || "ddeasy-prop";
    }
    return slugify(mapForm.locationName) || "ddeasy-maps";
  }

  function downloadMapImage(imageDataUrl: string, labelOrKind: string) {
    const base = imageDownloadBaseName();
    const part = slugFilePart(labelOrKind);
    const filename = `${base}-${part}.png`;
    triggerDownloadFromDataUrl(imageDataUrl, filename);
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
      const label = payload.title.trim() || "Prop handout";
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

  function exportMarkdownForDownload(): string {
    return previewMarkdown;
  }

  function exportModeForDownload(): GenerateMode {
    if (viewingSeed) return viewingSeed.kind;
    if (viewingResult) return viewingResult.kind;
    if (viewingParty) return "characters";
    if (isLibraryView) return "library";
    return mode;
  }

  const viewingSeed =
    librarySelection?.kind === "seed"
      ? ddeasySeeds.find((s) => s.id === librarySelection.id)
      : undefined;
  const viewingResult =
    librarySelection?.kind === "result"
      ? libraryResults.find((r) => r.id === librarySelection.id)
      : undefined;
  const viewingParty =
    librarySelection?.kind === "party"
      ? libraryParties.find((p) => p.id === librarySelection.id)
      : undefined;

  useEffect(() => {
    if (!isLibraryView || libraryCategory !== "srd") {
      setSrdPreviewMarkdown("");
      setSrdPreviewLoading(false);
      return;
    }
    if (librarySelection?.kind !== "srd") {
      setSrdPreviewMarkdown("");
      setSrdPreviewLoading(false);
      return;
    }

    const { resource, index, name } = librarySelection;
    let cancelled = false;
    setSrdPreviewLoading(true);
    setSrdPreviewMarkdown("");

    void fetchDnd5eResource(resource, index)
      .then((data) => {
        if (cancelled) return;
        setSrdPreviewMarkdown(dnd5eResourceToMarkdown(resource, data));
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
  }, [isLibraryView, libraryCategory, librarySelection]);

  const previewMarkdown =
    isLibraryView
      ? libraryCategory === "srd"
        ? librarySelection?.kind === "srd"
          ? srdPreviewMarkdown
          : ""
        : (viewingSeed?.markdown ??
          viewingResult?.markdown ??
          viewingParty?.markdown ??
          "")
      : markdown;

  function copyMarkdown() {
    const md = exportMarkdownForDownload();
    if (!md.trim()) return;
    void navigator.clipboard.writeText(md);
  }

  function downloadMarkdown() {
    const md = exportMarkdownForDownload();
    if (!md.trim()) return;
    const m = exportModeForDownload();
    const name = `${fileBaseName(md, m)}.md`;
    triggerDownload(
      new Blob([md], { type: "text/markdown;charset=utf-8" }),
      name,
    );
  }

  function downloadHtml() {
    const md = exportMarkdownForDownload();
    if (!md.trim()) return;
    const m = exportModeForDownload();
    const title =
      firstHeading(md) ??
      (m === "realm"
        ? "Realm"
        : m === "adventure"
          ? "Adventure"
          : m === "characters"
            ? "Characters"
            : m === "props"
              ? "Props"
              : "Maps");
    const doc = buildStandaloneHtmlDocument(
      title,
      markdownToBasicHtml(md, Boolean(md.trim())),
    );
    const name = `${fileBaseName(md, m)}.html`;
    triggerDownload(
      new Blob([doc], { type: "text/html;charset=utf-8" }),
      name,
    );
  }

  function printGeneration() {
    if (!previewMarkdown.trim() && previewImages.length === 0) return;
    window.print();
  }

  async function savePartyForVtt() {
    const md = exportMarkdownForDownload();
    if (!md.trim()) return;
    setPartySaveMessage(null);
    const parsed = parseCharactersMarkdown(md);
    if (parsed.players.length === 0) {
      setPartySaveMessage(
        "Could not find any characters. Each PC needs a ### heading under ## Characters.",
      );
      return;
    }
    try {
      await saveCharacterRoster({
        name: parsed.rosterName,
        markdown: md,
        source: "workshop",
        players: parsed.players,
      });
      setPartySaveMessage(
        `Saved ${parsed.players.length} character${parsed.players.length === 1 ? "" : "s"} as "${parsed.rosterName}". Open the Party library or Virtual Table to load them.`,
      );
    } catch (err) {
      setPartySaveMessage(
        err instanceof Error ? err.message : "Could not save party to your library.",
      );
    }
  }

  const previewImages: GeneratedImage[] =
    isLibraryView ? (viewingResult?.images ?? []) : mapImages;
  const previewTextModel =
    isLibraryView ? (viewingResult?.textModel ?? null) : model;
  const previewImageModel =
    isLibraryView ? (viewingResult?.imageModel ?? null) : imageModel;
  const outputLayoutKind: LibraryKind = viewingSeed
    ? viewingSeed.kind
    : viewingResult
      ? viewingResult.kind
      : viewingParty
        ? "characters"
        : isLibraryView
          ? "adventure"
          : (mode as LibraryKind);
  const previewSectionLayout = Boolean(previewMarkdown.trim());

  const libraryPanel = (
    <WorkshopLibraryPanel
      wideLayout
      seeds={ddeasySeeds}
      results={libraryResults}
      parties={libraryParties}
      category={libraryCategory}
      selection={librarySelection}
      statusMessage={libraryStatus}
      onCategoryChange={setLibraryCategory}
      onSelect={setLibrarySelection}
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
      onDeleteParty={async (id) => {
        const next = await deleteSavedCharacterRoster(id);
        setLibraryParties(next);
        if (librarySelection?.kind === "party" && librarySelection.id === id) {
          setLibrarySelection(null);
        }
      }}
      onPartiesChange={setLibraryParties}
      onRestore={(outcome) => {
        setDdeasySeeds(outcome.seeds);
        setLibraryResults(outcome.results);
        setLibraryParties(outcome.parties);
      }}
      onStatus={setLibraryStatus}
    />
  );

  return (
    <main
      className={`app-main app-main--workshop mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 ${
        isLibraryView
          ? "app-main--library gap-4 lg:gap-5"
          : "gap-8 lg:flex-row lg:gap-10"
      }`}
    >
      {seedEditor ? (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seed-editor-title"
        >
          <div
            className="flex max-h-full w-full max-w-lg flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <h2
              id="seed-editor-title"
              className="text-lg font-semibold text-[var(--text)]"
            >
              {seedEditor.id
                ? `Edit ${SEED_KIND_LABEL[seedEditor.kind].toLowerCase()} seed`
                : "Add seed manually"}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Seeds are story notes the generators build from. Type or paste
              anything — places, people, plots — and future realms, adventures,
              characters, maps, and props will stay true to them. Plain text or
              Markdown formatting both work.
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">Seed type</span>
              <select
                value={seedEditor.kind}
                onChange={(e) => {
                  const kind = e.target.value as SeedKind;
                  setSeedEditor((d) => (d ? { ...d, kind } : d));
                }}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
              >
                {SEED_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SEED_KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">Seed name</span>
              <input
                value={seedEditor.name}
                onChange={(e) => {
                  setSeedEditorError("");
                  setSeedEditor((d) => (d ? { ...d, name: e.target.value } : d));
                }}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                placeholder="e.g. The Ash Covenant coast"
                autoFocus
              />
            </label>
            {seedEditor.kind === "realm" ? (
              <label className="mt-3 flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">
                  Realm size
                </span>
                <select
                  value={seedEditor.realmSize}
                  onChange={(e) => {
                    const realmSize = e.target.value as RealmSize;
                    setSeedEditor((d) => {
                      if (!d) return d;
                      const tagsInput = formatSeedTagsInput(
                        mergeRealmSeedTags(
                          parseSeedTagsInput(d.tagsInput),
                          "realm",
                          realmSize,
                        ),
                      );
                      return { ...d, realmSize, tagsInput };
                    });
                  }}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  {REALM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {REALM_SIZE_LABEL[size].label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">
                Short description (optional)
              </span>
              <span className="text-xs text-[var(--muted)]">
                A one-line summary shown in the seed picker for recognition.
              </span>
              <input
                value={seedEditor.briefDescription}
                onChange={(e) => {
                  setSeedEditor((d) =>
                    d ? { ...d, briefDescription: e.target.value } : d,
                  );
                }}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                placeholder="e.g. Volcanic coast ruled by a fire-priest covenant"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">Tags (optional)</span>
              <span className="text-xs text-[var(--muted)]">
                Comma-separated labels to filter seeds in the Library and on workshop
                tabs — e.g. campaign, one-shot, faction. Realm scope (world, city,
                village, …) is set automatically from realm size above.
              </span>
              <input
                value={seedEditor.tagsInput}
                onChange={(e) => {
                  setSeedEditor((d) =>
                    d ? { ...d, tagsInput: e.target.value } : d,
                  );
                }}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                placeholder="campaign, location, session-3"
              />
              <div className="flex flex-wrap gap-1.5">
                {SEED_TAG_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSeedEditor((d) => {
                        if (!d) return d;
                        const current = parseSeedTagsInput(d.tagsInput);
                        if (current.includes(tag)) return d;
                        const next = [...current, tag];
                        return { ...d, tagsInput: formatSeedTagsInput(next) };
                      });
                    }}
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--text)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">Seed details</span>
              <span className="text-xs text-[var(--muted)]">
                The brief, notes, or generated text that should carry into future
                runs on this tab (and related tabs). Required.
              </span>
              <textarea
                value={seedEditor.markdown}
                onChange={(e) => {
                  setSeedEditorError("");
                  setSeedEditor((d) =>
                    d ? { ...d, markdown: e.target.value } : d,
                  );
                }}
                rows={12}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                placeholder={"# The Ash Covenant Coast\n\nA volcanic stretch of coastline where..."}
              />
            </label>
            {seedEditorError ? (
              <p className="mt-2 text-sm text-red-500">{seedEditorError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveSeedEditor()}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                {seedEditor.id ? "Save changes" : "Add to library"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSeedEditorError("");
                  setSeedEditor(null);
                }}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {resultEditor ? (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-editor-title"
        >
          <div
            className="flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-xl border p-6 shadow-lg"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <h2
              id="result-editor-title"
              className="text-lg font-semibold text-[var(--text)]"
            >
              Edit generated text
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Rewrite any part of this result in your own words. Edits update
              the preview and everything you copy, download, or print, and are
              kept with the saved copy in your library.
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">
                Content (plain text or Markdown)
              </span>
              <textarea
                value={resultEditor.markdown}
                onChange={(e) => {
                  setResultEditorError("");
                  setResultEditor((d) =>
                    d ? { ...d, markdown: e.target.value } : d,
                  );
                }}
                rows={20}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                autoFocus
              />
            </label>
            {resultEditorError ? (
              <p className="mt-2 text-sm text-red-500">{resultEditorError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveResultEditor()}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setResultEditorError("");
                  setResultEditor(null);
                }}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section
        className={`fantasy-panel no-print rounded-xl border p-6 ${
          isLibraryView
            ? "library-workshop-nav w-full shrink-0"
            : "w-full shrink-0 lg:max-w-md"
        }`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div>
          {isLibraryView ? (
            <>
              <p className="zone-badge mb-3">Your repository</p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Browse seeds, saved results, parties, and bundled SRD rules in the center panel.
                Use <strong className="text-[var(--text)]">Workshop</strong> in the title bar to
                create new content.
              </p>
            </>
          ) : (
            <>
              <p className="zone-badge mb-3">Creation workshop</p>
              <p
                id="mode-tablist-label"
                className="mb-2 text-sm font-semibold text-[var(--text)]"
              >
                What do you want to create?
              </p>
              <div className="workshop-mode-shell">
                <div
                  className="workshop-mode-grid"
                  role="tablist"
                  aria-labelledby="mode-tablist-label"
                >
                  {MODE_TAB_ORDER.map((tabId) => {
                    const selected = mode === tabId;
                    return (
                      <button
                        key={tabId}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => selectMode(tabId)}
                        className={`btn btn-tab workshop-mode-btn w-full text-center leading-tight${
                          selected ? " btn-tab-active" : ""
                        }`}
                      >
                        <span className="workshop-mode-btn-title">
                          <span aria-hidden="true">{MODE_TAB_ICON[tabId]} </span>
                          {MODE_TAB_LABEL[tabId]}
                        </span>
                        <span className="workshop-mode-btn-hint">
                          {MODE_TAB_HINT[tabId]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                When your content is ready, open{" "}
                <strong className="text-[var(--text)]">Virtual Table</strong> in the title bar to
                run encounters live.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowTutorialPicker(true)}
            className="btn btn-sm btn-accent mt-4 w-full"
          >
            Workflow guides
          </button>
        </div>

        <h1 className="font-display mt-6 text-xl font-bold text-[var(--text)]">
          {isLibraryView
            ? "Library"
            : mode === "realm"
              ? "Realm (5.2)"
              : mode === "adventure"
                ? "Adventure (5.2)"
                : mode === "characters"
                  ? "Pre-made characters (5.2)"
                  : mode === "props"
                    ? "Props (handouts)"
                    : "Maps (5.2)"}
        </h1>
        <div className="fantasy-divider mt-2" aria-hidden="true">
          <span className="text-sm leading-none">&#10022;</span>
        </div>
        {!isLibraryView ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {mode === "realm"
              ? "Pick how big the place is — a whole world down to a single village — then describe it in your own words. You get table-ready pages you can read, print, or edit. Everything is original to your game."
              : mode === "adventure"
                ? "Pick a length — a short session or a full one-nighter — and describe the story you want. You get a ready-to-run quest, original to your game."
                : mode === "characters"
                  ? "Get a ready-to-play party: stats, gear, and story hooks for each hero, built from the free rules included with the app."
                  : mode === "props"
                    ? "Make handout images to show your players: letters, potions, weapons, tools, and more. Pick an item type, describe it, and craft it — no adventure required."
                    : "Draw full-color travel maps (cities, roads, coastlines) and battle maps ready for the Virtual Table — top-down views made for play, not scenic art."}
        </p>
        ) : null}

        {isLibraryView ? null : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "maps" ? (
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
                label="Your saved seeds (recommended)"
                seeds={ddeasySeeds}
                selectedIds={mapLibraryReferenceIds}
                onChange={setMapLibraryReferenceIds}
                workshopTab="maps"
                emptyHint="Save a realm or adventure first — it will appear here as a source to draw from."
                description="Seeds are your saved story notes. Pick one or more and the map follows their places and names first; the scene notes below just add detail."
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
                    ? "Encounter layout and extra labels not already in your seed sources. Geography and place names defer to the seeds above."
                    : "Locations, encounter spaces, and names you want on the map. Attach seed sources above when you have a saved realm or adventure."}
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
          {mode === "props" ? (
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
          {mode === "realm" ? (
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
                  label="Your saved seeds (optional)"
                  seeds={ddeasySeeds}
                  selectedIds={selectedRealmCreationSeedIds}
                  onChange={setSelectedRealmCreationSeedIds}
                  workshopTab="realm"
                  emptyHint="Generate a realm or adventure first; it saves itself here automatically."
                  description="Seeds are your saved story notes. Pick one or more to stay consistent with their places and lore, or to zoom in or expand — the size and description you set here still lead."
                />
                <p className="text-xs text-[var(--muted)]">
                  Add or edit seeds by hand in the{" "}
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
                <textarea
                  value={realmForm.description}
                  onChange={(e) =>
                    setRealmForm((f) => ({ ...f, description: e.target.value }))
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
                  <strong className="text-[var(--text)]">saves itself as a seed</strong>{" "}
                  in the Library — named from your working title, and you can rename
                  it there anytime. For travel or locale map images, open the{" "}
                  <button
                    type="button"
                    onClick={() => selectMode("maps")}
                    className="font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-90"
                  >
                    {MODE_TAB_LABEL.maps}
                  </button>{" "}
                  tab and attach your saved realm seed under Library references.
                </p>
              </div>
            </>
          ) : null}
          {mode === "adventure" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-[var(--muted)]">
                Adventure length
              </legend>
              <div
                className="flex flex-col gap-2 rounded-lg border p-2 text-xs sm:flex-row sm:flex-wrap sm:gap-1"
                style={{ borderColor: "var(--border)" }}
              >
                {(
                  [
                    {
                      id: "short" as const,
                      label: "Short",
                      hint: "~1 session, 3–5 scenes",
                    },
                    {
                      id: "one_night" as const,
                      label: "One-nighter",
                      hint: "Single evening, tight",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    title={ADVENTURE_LENGTH_HOVER_HELP[opt.id]}
                    className="flex cursor-help items-start gap-2 rounded-md px-2 py-2 sm:flex-1 sm:flex-col sm:px-3"
                    style={{
                      background:
                        form.adventureLength === opt.id
                          ? "rgba(201, 162, 39, 0.15)"
                          : "transparent",
                      outline:
                        form.adventureLength === opt.id
                          ? "1px solid var(--accent)"
                          : "none",
                    }}
                  >
                    <input
                      type="radio"
                      name="adventureLength"
                      value={opt.id}
                      checked={form.adventureLength === opt.id}
                      onChange={() =>
                        setForm((f) => ({ ...f, adventureLength: opt.id }))
                      }
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="font-semibold text-[var(--text)]">
                        {opt.label}
                      </span>
                      <span className="block text-[var(--muted)]">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {mode === "adventure" ? (
            <div
              className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <SeedMultiSelect
                label="Your saved seeds (optional)"
                seeds={ddeasySeeds}
                selectedIds={selectedSourceSeedIds}
                onChange={setSelectedSourceSeedIds}
                workshopTab="adventure"
                emptyHint="Generate a realm or adventure first; it saves itself here automatically."
                description="Seeds are your saved story notes. Pick one or more to anchor the adventure's places, factions, and lore — the details you fill in below still control plot, levels, and tone."
              />
              <p className="text-xs text-[var(--muted)]">
                Add or edit seeds by hand in the{" "}
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
          {mode === "characters" ? (
            <div
              className="flex flex-col gap-3 rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <SeedMultiSelect
                label="Your saved seeds (optional)"
                seeds={ddeasySeeds}
                selectedIds={selectedSourceSeedIds}
                onChange={setSelectedSourceSeedIds}
                workshopTab="characters"
                emptyHint="Save a realm or adventure seed in the Library first."
                description="Seeds are your saved story notes. Pick one or more to ground the party's backstories, faction ties, and world flavor — the class, race, and concept fields below still apply."
              />
              <p className="text-xs text-[var(--muted)]">
                Manage seeds in the{" "}
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
          {mode === "adventure" ? (
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
          {mode === "adventure" ? (
            <AutoGenerateToggle
              checked={autoGenerateAdventureMap}
              onChange={setAutoGenerateAdventureMap}
              icon={"\u{1F5FA}\uFE0F"}
            >
              Auto-generate maps with adventure (overview + one battle map per scene, up to{" "}
              {MAX_AUTO_SCENE_IMAGES})
            </AutoGenerateToggle>
          ) : null}
          {mode === "adventure" && autoGenerateAdventureMap ? (
            <fieldset
              className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <legend className="text-sm font-medium text-[var(--muted)]">
                Auto-map scale
              </legend>
              <p className="text-xs text-[var(--muted)]">
                Same as the Maps tab: units for overview scale bars and battle grids.
              </p>
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
          {mode === "adventure" ? (
            <AutoGenerateToggle
              checked={autoGenerateAdventureProps}
              onChange={setAutoGenerateAdventureProps}
              icon={"\u{1F3FA}"}
            >
              Auto-generate prop handouts with adventure (one per scene when scenes are found, up to{" "}
              {MAX_AUTO_SCENE_IMAGES}; otherwise one handout)
            </AutoGenerateToggle>
          ) : null}

          {mode === "adventure" || mode === "characters" ? (
            <>
              <Field
                label={
                  mode === "adventure"
                    ? "Title or theme hint (optional)"
                    : "Party concept or theme (optional)"
                }
                value={form.titleHint}
                onChange={(v) => setForm((f) => ({ ...f, titleHint: v }))}
                placeholder={
                  mode === "adventure"
                    ? "e.g. The Drowned Choir"
                    : "e.g. Disgraced city watch turned monster slayers"
                }
              />
              <Field
                label="Level range (optional)"
                value={form.levelRange}
                onChange={(v) => setForm((f) => ({ ...f, levelRange: v }))}
                placeholder={
                  mode === "adventure"
                    ? ADVENTURE_SAMPLE_LEVEL_PLACEHOLDER
                    : CHARACTERS_SAMPLE_LEVEL_PLACEHOLDER
                }
              />
              <Field
                label="Tone (optional)"
                value={form.tone}
                onChange={(v) => setForm((f) => ({ ...f, tone: v }))}
                placeholder={
                  mode === "adventure"
                    ? ADVENTURE_SAMPLE_TONE_PLACEHOLDER
                    : "e.g. hopeful, witty banter"
                }
              />
              <Field
                label={
                  mode === "adventure" ? "Setting (optional)" : "World flavor (optional)"
                }
                value={form.setting}
                onChange={(v) => setForm((f) => ({ ...f, setting: v }))}
                placeholder={
                  mode === "adventure"
                    ? ADVENTURE_SAMPLE_SETTING_PLACEHOLDER
                    : "e.g. trade-road kingdoms and old battlefields"
                }
              />
              {mode === "adventure" ? (
                <Field
                  label="Villain / threat (optional)"
                  value={form.villainOrThreat}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, villainOrThreat: v }))
                  }
                  placeholder={ADVENTURE_SAMPLE_VILLAIN_PLACEHOLDER}
                />
              ) : null}
              {mode === "adventure" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Party size (optional)"
                    value={form.partySize}
                    onChange={(v) => setForm((f) => ({ ...f, partySize: v }))}
                    placeholder={ADVENTURE_SAMPLE_PARTY_PLACEHOLDER}
                  />
                  <Field
                    label="Session length (optional)"
                    value={form.sessionLength}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, sessionLength: v }))
                    }
                    placeholder={ADVENTURE_SAMPLE_SESSION_PLACEHOLDER}
                  />
                </div>
              ) : null}
              {mode === "characters" ? (
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
                            PC {index + 1}
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
                              aria-label={`Remove PC ${index + 1}`}
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
                <textarea
                  value={form.extraNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, extraNotes: e.target.value }))
                  }
                  rows={3}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Puzzles to avoid, safety tools, recurring PC hooks…"
                />
              </label>
            </>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-md mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Generating…"
              : mode === "realm"
                ? "Generate realm"
                : mode === "adventure"
                  ? "Generate adventure"
                  : mode === "characters"
                    ? "Generate characters"
                    : mode === "props"
                      ? "Generate prop image"
                      : "Generate maps"}
          </button>
        </form>
        )}
      </section>

      {isLibraryView ? (
        <section
          className="library-workshop-browse fantasy-panel no-print flex min-h-[28rem] flex-col rounded-xl border p-4 sm:min-h-[32rem] lg:min-h-0"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="font-display mb-1 shrink-0 text-base font-bold text-[var(--text)]">
            Browse repository
          </h2>
          <p className="mb-2 shrink-0 text-xs text-[var(--muted)]">
            Click an item to preview on the right. Seeds, results, and parties stay on this device.
          </p>
          {libraryPanel}
        </section>
      ) : null}

      <section
        className={`fantasy-panel print-generation-root rounded-xl border p-6 ${
          isLibraryView
            ? "library-workshop-preview min-h-[28rem] w-full flex-1 lg:min-h-0"
            : "min-h-[50vh] flex-1"
        }`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--accent)]">
              <span aria-hidden="true">&#10022; </span>
              {isLibraryView ? "Preview" : "Output"}
            </h2>
            {viewingSeed ? (
              <p className="no-print mt-0.5 text-xs text-[var(--muted)]">
                Viewing seed:{" "}
                <strong className="text-[var(--text)]">
                  {seedDisplayName(viewingSeed)}
                </strong>{" "}
                ({SEED_KIND_LABEL[viewingSeed.kind]})
              </p>
            ) : viewingResult ? (
              <p className="no-print mt-0.5 text-xs text-[var(--muted)]">
                Viewing result:{" "}
                <strong className="text-[var(--text)]">{viewingResult.title}</strong> (
                {LIBRARY_KIND_LABEL[viewingResult.kind]})
              </p>
            ) : viewingParty ? (
              <p className="no-print mt-0.5 text-xs text-[var(--muted)]">
                Viewing party:{" "}
                <strong className="text-[var(--text)]">{viewingParty.name}</strong> (
                {viewingParty.players.length} PCs)
              </p>
            ) : libraryCategory === "srd" && librarySelection?.kind === "srd" ? (
              <p className="no-print mt-0.5 text-xs text-[var(--muted)]">
                Viewing SRD:{" "}
                <strong className="text-[var(--text)]">{librarySelection.name}</strong>{" "}
                <strong className="text-[var(--text)]">(read-only)</strong>
              </p>
            ) : null}
          </div>
          {previewMarkdown.trim() || previewImages.length > 0 ? (
            <div className="no-print flex flex-wrap gap-2">
              {previewMarkdown.trim() ? (
                <>
                  {!isLibraryView ? (
                    <button
                      type="button"
                      onClick={openResultEditor}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Edit
                    </button>
                  ) : viewingSeed ? (
                    <button
                      type="button"
                      onClick={() => openEditSeedEditor(viewingSeed.id)}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Edit seed
                    </button>
                  ) : viewingResult ? (
                    <button
                      type="button"
                      onClick={openLibraryResultEditor}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Edit result
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={copyMarkdown}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Copy Markdown
                  </button>
                  <button
                    type="button"
                    onClick={downloadMarkdown}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Download .md
                  </button>
                  <button
                    type="button"
                    onClick={downloadHtml}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Download .html
                  </button>
                  {outputLayoutKind === "characters" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void savePartyForVtt()}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                        style={{ background: "var(--accent)" }}
                        title="Parse this roster and save it for the Virtual Table party panel"
                      >
                        Save party for VTT
                      </button>
                      <Link
                        href="/parties"
                        className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Party library
                      </Link>
                      <Link
                        href="/table"
                        className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                        style={{ borderColor: "var(--accent-dim)" }}
                      >
                        Virtual Table
                      </Link>
                    </>
                  ) : null}
                  {isLibraryView && viewingParty ? (
                    <>
                      <Link
                        href="/parties"
                        className="rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Manage party
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          queuePartyImport({
                            rosterId: viewingParty.id,
                            placeTokens: true,
                            linkCampaign: true,
                            replaceExisting: true,
                          });
                          window.location.href = "/table";
                        }}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                        style={{ background: "var(--accent)" }}
                      >
                        Load to VTT
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={printGeneration}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Print
              </button>
            </div>
          ) : null}
        </div>
        {previewTextModel || previewImageModel ? (
          <p className="no-print mt-1 text-xs text-[var(--muted)]">
            {previewTextModel ? `Text model: ${previewTextModel}` : null}
            {previewTextModel && previewImageModel ? " · " : null}
            {previewImageModel ? `Image model: ${previewImageModel}` : null}
          </p>
        ) : null}
        {partySaveMessage ? (
          <p
            className="no-print mt-2 rounded-lg border px-3 py-2 text-xs"
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
        {!isLibraryView ? (
          <div className="no-print">
            <ProgressPanel
              mode={mode}
              stage={progressStage}
              loading={loading}
              imageLoading={imageLoading}
              autoMapEnabled={autoGenerateAdventureMap}
              autoPropsEnabled={autoGenerateAdventureProps}
            />
          </div>
        ) : null}
        {previewMarkdown.trim() ? (
          <p className="no-print mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Tip: use <strong className="text-[var(--text)]/80">Print</strong> above to get text and
            map images together (choose &ldquo;Save as PDF&rdquo; in the print window). You can also
            export as <strong className="text-[var(--text)]/80">.md</strong> or{" "}
            <strong className="text-[var(--text)]/80">.html</strong> files for notes apps.{" "}
            {outputLayoutKind === "maps" && previewSectionLayout
              ? "Use Previous / Next to page through the document. Map images download as PNG for virtual tabletops or handouts."
              : outputLayoutKind === "maps"
                ? "Map images download as PNG for virtual tabletops or handouts."
                : previewSectionLayout
                  ? "Use Previous / Next to page through the document, and scroll inside a page to read."
                  : "You can also copy the text straight into Google Docs or Word."}
          </p>
        ) : null}

        {error ? (
          <p
            className="no-print mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {imageError ? (
          <p
            className="no-print mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {imageError}
          </p>
        ) : null}

        {previewMarkdown.trim() ? (
          <OutputMarkdownCarousel
            html={
              isLibraryView && libraryCategory === "srd"
                ? renderMarkdownToHtml(previewMarkdown, "preview", false)
                : simpleMarkdownToHtml(previewMarkdown)
            }
          />
        ) : null}
        {isLibraryView && libraryCategory === "srd" && srdPreviewLoading ? (
          <p className="no-print mt-4 text-sm text-[var(--muted)]">Loading SRD entry…</p>
        ) : null}
        <MapImageOutputBlock
          mapImages={previewImages}
          onDownloadMap={downloadMapImage}
        />

        {isLibraryView && !previewMarkdown.trim() && previewImages.length === 0 ? (
          <div className="library-preview-empty no-print mt-6">
            <p className="text-sm text-[var(--muted)]">
              {libraryCategory === "srd" ? (
                <>
                  Pick a category and entry in{" "}
                  <strong className="text-[var(--text)]">Browse repository</strong> to preview
                  SRD rules here.
                </>
              ) : (
                <>
                  Select an item in{" "}
                  <strong className="text-[var(--text)]">Browse repository</strong> to preview it
                  here — then copy, export, or print.
                </>
              )}
            </p>
          </div>
        ) : null}
        {isLibraryView && (previewMarkdown.trim() || previewImages.length > 0) ? (
          <p className="no-print mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Tip: use <strong className="text-[var(--text)]/80">Print</strong> to save as PDF, or
            export <strong className="text-[var(--text)]/80">.md</strong> /{" "}
            <strong className="text-[var(--text)]/80">.html</strong>. User-owned imports stay on
            this device only — see{" "}
            <Link href="/legal" className="font-semibold text-[var(--accent)] underline">
              Licenses &amp; content
            </Link>
            .
          </p>
        ) : null}
        {!loading &&
        !error &&
        !previewMarkdown.trim() &&
        previewImages.length === 0 &&
        !isLibraryView ? (
          <p className="no-print mt-8 text-sm text-[var(--muted)]">
            {mode === "realm"
              ? "Pick a realm size, describe what you want, and your setting pages will appear here — ready to read, print, or edit. Use the Maps tab for map images."
              : mode === "adventure"
                ? "Fill in the form and your quest will appear here, sized to the length you picked."
                : mode === "characters"
                  ? "Fill in the form and your ready-to-play heroes will appear here — copy them to your notes or load them at the Virtual Table."
                  : mode === "props"
                    ? "Choose an item type, write a description, and your handout image will appear here."
                    : "Submit to generate **full-color** locale / overland maps (atlas clarity, cities & routes) and **grid-free** battle maps for the VTT."}
          </p>
        ) : null}

        {loading ? (
          <p className="no-print mt-8 animate-pulse text-sm text-[var(--muted)]">
            {mode === "adventure" || mode === "characters" || mode === "realm"
              ? "Calling Claude…"
              : "Working on images… this can take a minute."}
          </p>
        ) : null}
        {imageLoading ? (
          <p className="no-print mt-2 animate-pulse text-sm text-[var(--muted)]">
            {mode === "props"
              ? "Rendering prop image…"
              : mode === "realm"
                ? "Draw Realm…"
                : "Rendering maps and handouts (batched API calls)…"}
          </p>
        ) : null}
      </section>

      <WorkflowTutorialOverlay
        workflowId={tutorialWorkflowId}
        stepIndex={tutorialStep}
        showPicker={showTutorialPicker}
        handlers={{
          onSelectMode: navigateTutorialMode,
          onLibraryCategory: setLibraryCategory,
          onOpenSeedEditor: openNewSeedEditor,
        }}
        onWorkflowChange={setTutorialWorkflowId}
        onStepChange={setTutorialStep}
        onShowPickerChange={setShowTutorialPicker}
      />
    </main>
  );
}

function MapImageOutputBlock({
  mapImages,
  onDownloadMap,
}: {
  mapImages: GeneratedImage[];
  onDownloadMap: (imageDataUrl: string, labelOrKind: string) => void;
}) {
  if (mapImages.length === 0) return null;
  return (
    <div className="mt-6 grid gap-4">
      {mapImages.map((img, idx) => {
        const heading =
          img.label ??
          (img.kind === "locale" || img.kind === "battle"
            ? `${img.kind} map`
            : img.kind === "realm"
              ? "Realm map"
              : `${img.kind} image`);
        const downloadSlug = img.label ?? img.kind;
        return (
          <div
            key={`${idx}-${img.kind}-${downloadSlug}`}
            className="rounded-lg border p-2"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">{heading}</p>
              <button
                type="button"
                onClick={() => onDownloadMap(img.imageDataUrl, downloadSlug)}
                className="no-print shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                Download PNG
              </button>
            </div>
            <Image
              src={img.imageDataUrl}
              alt={heading}
              width={1536}
              height={1024}
              unoptimized
              className="h-auto w-full rounded-md"
            />
          </div>
        );
      })}
    </div>
  );
}

function AutoGenerateToggle({
  checked,
  onChange,
  icon,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition hover:border-[var(--accent)]"
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "rgba(201, 162, 39, 0.14)" : "rgba(201, 162, 39, 0.07)",
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        style={{
          background: "rgba(201, 162, 39, 0.28)",
        }}
        title="Auto-generate"
      >
        {icon}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-2.5 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0 flex-1 pt-2 font-medium text-[var(--text)]">
        {children}
      </span>
    </label>
  );
}

function BattleMapGridFieldset({
  mapForm,
  compactLegend,
  embedded = false,
  onApplyPreset,
  onCustomSize,
}: {
  mapForm: MapFormState;
  compactLegend?: string;
  embedded?: boolean;
  onApplyPreset: (cols: number, rows: number) => void;
  onCustomSize: (cols: number, rows: number) => void;
}) {
  const presetMatch = findVttGridPreset(mapForm.battleGridCols, mapForm.battleGridRows);
  const legend = compactLegend ?? "VTT battle map grid";

  const body = (
    <>
      <p className="text-xs text-[var(--muted)]">
        {compactLegend
          ? "One battle map per scene uses these settings so art aligns on the VTT overlay grid."
          : (
            <>
              Battle maps are generated <strong className="font-medium text-[var(--text)]/90">without printed grid lines</strong>—load on{" "}
              <Link href="/table" className="text-[var(--accent)] underline-offset-2 hover:underline">
                /table
              </Link>{" "}
              and the Virtual Table draws the grid. Pick dimensions so the overlay aligns with the art.
            </>
          )}
      </p>

      <div>
        <p className="mb-1 text-xs font-medium text-[var(--text)]">VTT presets</p>
        <div className="flex flex-wrap gap-1">
          {VTT_GRID_PRESETS.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => onApplyPreset(g.cols, g.rows)}
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor:
                  mapForm.battleGridCols === g.cols && mapForm.battleGridRows === g.rows
                    ? "var(--accent)"
                    : "var(--border)",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-[var(--text)]">Custom grid size</p>
        <p className="mb-1.5 text-[11px] text-[var(--muted)]">
          Columns × rows ({MIN_VTT_GRID_SIDE}–{MAX_VTT_GRID_SIDE} each). Values clamp on change.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--muted)]">Columns</span>
            <input
              type="number"
              min={MIN_VTT_GRID_SIDE}
              max={MAX_VTT_GRID_SIDE}
              value={mapForm.battleGridCols}
              onChange={(e) =>
                onCustomSize(Number(e.target.value), mapForm.battleGridRows)
              }
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--muted)]">Rows</span>
            <input
              type="number"
              min={MIN_VTT_GRID_SIDE}
              max={MAX_VTT_GRID_SIDE}
              value={mapForm.battleGridRows}
              onChange={(e) =>
                onCustomSize(mapForm.battleGridCols, Number(e.target.value))
              }
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>
        {!presetMatch ? (
          <p className="mt-1 text-[11px]" style={{ color: "var(--accent)" }}>
            Custom size: {mapForm.battleGridCols} × {mapForm.battleGridRows}
          </p>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--text)]">{legend}</p>
        {body}
      </div>
    );
  }

  return (
    <fieldset
      className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <legend className="text-sm font-medium text-[var(--muted)]">{legend}</legend>
      {body}
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProgressPanel({
  mode,
  stage,
  loading,
  imageLoading,
  autoMapEnabled,
  autoPropsEnabled,
}: {
  mode: GenerateMode;
  stage: ProgressStage;
  loading: boolean;
  imageLoading: boolean;
  autoMapEnabled: boolean;
  autoPropsEnabled: boolean;
}) {
  const items = getProgressItems(mode, stage, autoMapEnabled, autoPropsEnabled);
  if (items.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Progress
      </p>
      <div className="mt-2 grid gap-1">
        {items.map((item) => (
          <p
            key={item.label}
            className={
              item.state === "done"
                ? "text-xs font-medium text-emerald-700"
                : item.state === "active"
                  ? "text-xs text-[var(--text)]"
                  : "text-xs text-[var(--muted)]"
            }
          >
            {item.state === "done"
              ? "✓ Complete"
              : item.state === "active"
                ? "… In progress"
                : "○ Pending"}{" "}
            — {item.label}
          </p>
        ))}
      </div>
      {(loading || imageLoading) && stage !== "error" ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Working… this can take a minute.</p>
      ) : null}
    </div>
  );
}

function getProgressItems(
  mode: GenerateMode,
  stage: ProgressStage,
  autoMapEnabled: boolean,
  autoPropsEnabled: boolean,
): Array<{ label: string; state: "pending" | "active" | "done" }> {
  if (mode === "characters") {
    return [
      { label: "Generate characters", state: stateFor(stage, "adventure_generating", "complete") },
    ];
  }

  if (mode === "maps") {
    return [
      { label: "Generate locale map image", state: stateFor(stage, "map_locale_generating", "map_done") },
      { label: "Generate battle map image", state: stateFor(stage, "map_battle_generating", "map_done") },
    ];
  }

  if (mode === "props") {
    return [
      {
        label: "Generate prop handout image",
        state: stateFor(stage, "prop_generating", "complete"),
      },
    ];
  }

  if (mode === "realm") {
    return [
      {
        label: "Generate realm",
        state: stateFor(stage, "realm_generating", "complete"),
      },
    ];
  }

  const items: Array<{ label: string; state: "pending" | "active" | "done" }> = [
    { label: "Generate adventure text", state: stateFor(stage, "adventure_generating", "adventure_done") },
  ];

  if (autoMapEnabled) {
    items.push(
      { label: "Generate locale map image", state: stateFor(stage, "map_locale_generating", "map_done") },
      { label: "Generate battle map image", state: stateFor(stage, "map_battle_generating", "map_done") },
    );
  }
  if (autoPropsEnabled) {
    items.push({
      label: "Generate written prop image",
      state: stateFor(stage, "prop_generating", "complete"),
    });
  }

  return items;
}

function stateFor(
  stage: ProgressStage,
  activeStage: ProgressStage,
  doneStage: ProgressStage | "complete",
): "pending" | "active" | "done" {
  if (stage === activeStage) return "active";
  if (stage === doneStage || stage === "complete" || stage === "map_done") return "done";
  if (stage === "adventure_done" && activeStage === "adventure_generating") return "done";
  return "pending";
}

function simpleMarkdownToHtml(md: string): string {
  return renderMarkdownToHtml(md, "preview", true);
}

function markdownToBasicHtml(md: string, paperModuleLayout = false): string {
  return renderMarkdownToHtml(md, "export", paperModuleLayout);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerDownloadFromDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function firstHeading(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}

function fileBaseName(md: string, mode: GenerateMode): string {
  if (mode === "library") {
    return slugify(firstHeading(md) ?? "") || "ddeasy-library";
  }
  const fromTitle = firstHeading(md);
  const slug = slugify(fromTitle ?? "");
  if (slug) return slug;
  const prefix =
    mode === "realm"
      ? "ddeasy-realm"
      : mode === "adventure"
        ? "ddeasy-adventure"
        : mode === "characters"
          ? "ddeasy-characters"
          : mode === "props"
            ? "ddeasy-props"
            : "ddeasy-maps";
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

function slugify(s: string): string {
  const t = s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return t;
}

function buildStandaloneHtmlDocument(title: string, bodyHtml: string): string {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 0; color: #111; background: #f2f2f0; line-height: 1.55; }
    main { max-width: 54rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    h1 { font-size: 1.75rem; margin: 0 0 1rem; }
    h1.module-cover-title { font-size: 1.95rem; margin: 0 0 1rem; letter-spacing: -0.02em; }
    h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    h3 { font-size: 1.05rem; margin: 1.25rem 0 0.5rem; }
    h4.module-keyed-heading { margin: 1rem 0 0.35rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #555; }
    p { margin: 0.5rem 0; }
    ul { margin: 0.5rem 0 0.75rem 1.25rem; }
    li { margin: 0.25rem 0; }
    /* Stapled pamphlet sheets (exported adventures) */
    .module-adventure-document { max-width: 8.5in; margin: 0 auto; background: #fafaf8; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #dcdcd8; }
    .module-cover {
      background: #fff;
      padding: 2rem 2.25rem 2.5rem;
      margin: 0 0 1.25rem;
      border: 1px solid #d0d0cc;
      border-radius: 2px;
      min-height: 10.5in;
      box-sizing: border-box;
    }
    .module-sheet {
      background: #fff;
      padding: 1.75rem 2.25rem 2.25rem;
      margin: 0 0 1.25rem;
      border: 1px solid #d0d0cc;
      border-radius: 2px;
      min-height: 10in;
      box-sizing: border-box;
    }
    .module-sheet-heading {
      font-size: 1.28rem;
      margin: 0 0 0.85rem;
      padding-bottom: 0.35rem;
      color: #1a1a1a;
      border-bottom: 2px solid #333;
    }
    .module-h3 { font-size: 1.05rem; margin: 1.15rem 0 0.45rem; }
    blockquote.module-read-aloud {
      margin: 0.9rem 0;
      padding: 0.6rem 0.85rem;
      border-left: 4px solid #927228;
      background: #f9f9f7;
      color: #1a1a1a;
      font-style: italic;
    }
    blockquote.module-read-aloud .read-aloud-inner { margin: 0.4rem 0; }
    .module-table-scroll { overflow-x: auto; }
    .module-glance-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 0.6rem 0; }
    .module-glance-th, .module-glance-td { border: 1px solid #c8c8c8; padding: 0.4rem 0.55rem; vertical-align: top; text-align: left; }
    .module-glance-th { background: #f0f0f0; font-weight: 600; }
    .map-pre {
      overflow-x: auto;
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin: 0.75rem 0;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.72rem;
      line-height: 1.25;
    }
    .map-pre code { white-space: pre; }
    @media print {
      @page { size: letter; margin: 0.55in; }
      body { background: #fff; }
      main { max-width: none; padding: 0; }
      .module-adventure-document { border: none; box-shadow: none; background: #fff; max-width: none; }
      .module-cover {
        page-break-after: always;
        min-height: 0;
        margin: 0;
        border: none;
        padding: 0;
      }
      .module-sheet {
        min-height: 0;
        margin: 0;
        border: none;
        padding: 0;
        background: #fff;
      }
      .module-adventure-has-cover .module-sheet { page-break-before: always; }
      .module-adventure-no-cover .module-sheet ~ .module-sheet { page-break-before: always; }
      .module-read-aloud, .module-glance-table { break-inside: avoid-page; }
      .module-sheet-heading { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <main>
${bodyHtml}
  </main>
</body>
</html>`;
}

function slugFilePart(raw: string): string {
  const s = raw.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");
  const trimmed = s.replace(/^-|-$/g, "").slice(0, 80);
  return trimmed || "image";
}

function buildSceneBattleMapPrompt(
  scene: AdventureSceneSnippet,
  mapBase: MapFormState,
  fullMarkdown: string,
  form: FormState,
  mapDistanceUnits: MapDistanceUnits,
): string {
  const toneBlock = buildAutoMapContextFromAdventure(fullMarkdown, form);
  const lead = buildBattleMapScenePromptLead(
    mapBase.battleGridCols,
    mapBase.battleGridRows,
    mapDistanceUnits,
  );
  return [
    lead,
    "",
    scene.context.slice(0, 4000),
    "",
    "Adventure tone / setting:",
    mapBase.tone,
    "",
    "Grid / layout notes:",
    buildBattleMapGridNotes(
      mapBase.battleGridCols,
      mapBase.battleGridRows,
      mapDistanceUnits,
    ),
    "",
    "Reference — map briefs from the adventure (tone only):",
    toneBlock.slice(0, 2000),
    "",
    mapBase.extraNotes,
  ]
    .filter(Boolean)
    .join("\n");
}

const PREFERRED_ITEM_CATEGORIES: PropItemCategory[] = [
  "paper",
  "potion",
  "weapon",
  "relic",
  "container",
  "armor",
  "tool",
  "other",
  "food_drink",
  "wearable",
];

function inferSceneSubject(scene: AdventureSceneSnippet): string {
  const source = `${scene.title}\n${scene.context}`.replace(/\s+/g, " ").trim();
  if (!source) return "this place";

  const lowered = source.toLowerCase();
  const patterns: Array<{ re: RegExp; subject: string }> = [
    { re: /\b(altar|shrine|idol|statue)\b/, subject: "the offering niche" },
    { re: /\b(gate|door|lock|seal)\b/, subject: "the sealed threshold" },
    { re: /\b(map|route|path|trail|passage)\b/, subject: "the pilgrim road north" },
    { re: /\b(rune|glyph|ward|sigil)\b/, subject: "the broken ward" },
    { re: /\b(monster|beast|aberration|undead|dragon|fiend)\b/, subject: "what hunts past curfew" },
    { re: /\b(cult|ritual|circle|summon)\b/, subject: "the circle drawn wrong" },
    { re: /\b(water|flood|river|canal|drowned|tide)\b/, subject: "the drowned threshold" },
    { re: /\b(fire|forge|embers|lava|ash)\b/, subject: "the scorched lintel" },
    { re: /\b(trap|snare|ambush|hazard)\b/, subject: "the treacherous step" },
    { re: /\b(vault|crypt|tomb|catacomb)\b/, subject: "the barred crypt" },
  ];

  for (const pattern of patterns) {
    if (pattern.re.test(lowered)) return pattern.subject;
  }

  const nounPhrase = source
    .split(/[.?!]/)[0]
    ?.replace(/^[^a-zA-Z0-9]+/, "")
    .trim()
    .slice(0, 56);
  return nounPhrase || "the matter at hand";
}

function chooseItemCategory(scene: AdventureSceneSnippet, index: number): PropItemCategory {
  const lowered = `${scene.title}\n${scene.context}`.toLowerCase();
  if (/\b(potion|vial|elixir|phial|brew|alchem|acid|dose|tonic|serum)\b/.test(lowered)) {
    return "potion";
  }
  if (/\b(sword|axe|bow|spear|dagger|mace|hammer|crossbow|blade|halberd|glaive)\b/.test(lowered)) {
    return "weapon";
  }
  if (/\b(armor|breastplate|helmet|helm|gauntlet|shield|pauldron|mail|plate)\b/.test(lowered)) {
    return "armor";
  }
  if (/\b(chest|coffer|crate|casket|sack|bag|barrel|lockbox|cask|strongbox)\b/.test(lowered)) {
    return "container";
  }
  if (/\b(key|lock|tool|tongs|chisel|tongs|lever|pick(?!pocket)|compass)\b/.test(lowered)) {
    return "tool";
  }
  if (/\b(food|feast|roast|bread|wine|ale|cheese|supper|banquet|tankard)\b/.test(lowered)) {
    return "food_drink";
  }
  if (/\b(ring|cloak|boot|glove|amulet|circlet|necklace|brooch|jewel)\b/.test(lowered)) {
    return "wearable";
  }
  if (/\b(relic|idol|holy|shrine|amulet|talisman|symbol|altar|totem)\b/.test(lowered)) {
    return "relic";
  }
  if (/\b(map|route|path|letter|scroll|decree|notice|parchment|ledger|writ|broad|contract|journal|tally)\b/.test(
    lowered,
  )) {
    return "paper";
  }
  if (/\b(rune|glyph|ward|sigil|inscription|tablet|stone)\b/.test(lowered)) {
    return "relic";
  }
  return PREFERRED_ITEM_CATEGORIES[index % PREFERRED_ITEM_CATEGORIES.length]!;
}

function buildAutoPropDescription(
  subject: string,
  itemCategory: PropItemCategory,
): string {
  const s = subject.charAt(0).toUpperCase() + subject.slice(1);
  switch (itemCategory) {
    case "paper":
      return [
        `A paper handout for the table tied to: ${s}.`,
        "Folded or flat parchment, ink, maybe wax; short in-world text with a time or a place a local would recognize.",
        "Weathering: finger smudges, a pressed fold, a ring stain. No anachronistic print layout.",
      ].join(" ");
    case "potion":
      return [
        `A single vial or bottle relevant to: ${s}.`,
        "Glass or ceramic, stopper, possible wax seal. Liquid color described; a scratched label with one to three in-world words.",
        "Faint sediment or oil sheen; not a modern drug bottle.",
      ].join(" ");
    case "weapon":
      return [
        `A weapon on a neutral ground that fits: ${s}.`,
        "Steel, wood, and leather; honest wear, oil, small maker’s or quartermaster’s mark, no gore, no people in frame.",
      ].join(" ");
    case "armor":
      return [
        `A piece of armor or a shield for context: ${s}.`,
        "Straps, dents, paint or simple blazon as fits; the object is the whole frame, not a person wearing it.",
      ].join(" ");
    case "tool":
      return [
        `A tool or key appropriate to: ${s}.`,
        "Wood and iron, wear, maybe a small stamped mark, sized for a hand.",
      ].join(" ");
    case "container":
      return [
        `A container that could matter for: ${s}.`,
        "Wood, iron, leather; hasp or rope; travel dust, a scratched initial on the lid corner.",
      ].join(" ");
    case "wearable":
      return [
        `A wearable or accessory (laid out) suggested by: ${s}.`,
        "Metal and cloth or leather, clasp or stitch detail; not a full mannequin scene.",
      ].join(" ");
    case "food_drink":
      return [
        `A still life of food or drink fitting: ${s}.`,
        "Platter, crust, flagon, or board; period table fare, appetizing, no hands or faces.",
      ].join(" ");
    case "relic":
      return [
        `A small relic, carved stone, or metal emblem tied to: ${s}.`,
        "Patina, a chain or mount, simple carved or cast symbols; the object is the focus.",
      ].join(" ");
    case "other":
    default:
      return [
        `A single fantasy prop object connected to: ${s}.`,
        "Clear material read, believable wear, no busy background.",
      ].join(" ");
  }
}

function buildAutoPropPayloadFromScene(
  scene: AdventureSceneSnippet,
  form: FormState,
  index: number,
): PropFormState {
  const itemCategory = chooseItemCategory(scene, index);
  const sceneSubject = inferSceneSubject(scene);
  return {
    ...initialPropForm,
    itemCategory,
    title: `Handout — ${scene.title}`.slice(0, 120),
    description: buildAutoPropDescription(sceneSubject, itemCategory).slice(0, 1200),
    settingHint: form.setting || initialPropForm.settingHint,
    style: initialPropForm.style,
    ageWear: initialPropForm.ageWear,
    extraNotes: [
      form.extraNotes,
      "Any writing or marks on the object should be in-world only (no labels like DM, handout, or prop).",
    ]
      .filter(Boolean)
      .join(" "),
    imageSize: "1024x1536",
    imageQuality: "high",
  };
}

function buildAutoMapContextFromAdventure(markdown: string, form: FormState): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const captureStart = [
    "## Locale / area map concept (for image generation)",
    "## Battle map concepts (for image generation)",
    "## Regional map concept (for image generation)",
    "## Battle map concepts (Session 1)",
  ];
  const conceptLines: string[] = [];
  let capturing = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      if (captureStart.includes(trimmed)) {
        capturing = true;
        conceptLines.push(trimmed);
        continue;
      }
      if (capturing) {
        capturing = false;
      }
    }
    if (capturing) {
      conceptLines.push(line);
    }
  }

  const conceptText = conceptLines.join("\n").trim();
  if (conceptText) {
    return conceptText;
  }

  return [
    form.titleHint ? `Theme: ${form.titleHint}` : "",
    form.villainOrThreat ? `Threat: ${form.villainOrThreat}` : "",
    form.extraNotes ? `Notes: ${form.extraNotes}` : "",
    "Generate **full-color atlas-style** locale / area overview (oceans vs seas vs lakes, borders, **capitals**, **major cities**, **trade routes**) and an **illustrated tactical battle floor** (no printed grid—VTT overlays it) for the main conflict—not scenic painted art.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAutoPropPayloadFromAdventure(
  markdown: string,
  form: FormState,
): PropFormState {
  const title = (firstHeading(markdown) ?? form.titleHint) || "Adventure note";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const hooks: string[] = [];
  const secrets: string[] = [];
  let section: "hooks" | "secrets" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      if (line.toLowerCase().includes("hooks")) {
        section = "hooks";
      } else if (line.toLowerCase().includes("secrets")) {
        section = "secrets";
      } else {
        section = null;
      }
      continue;
    }
    if (!line) continue;
    if (section === "hooks" && hooks.length < 2) hooks.push(line.replace(/^[-*]\s*/, ""));
    if (section === "secrets" && secrets.length < 2) secrets.push(line.replace(/^[-*]\s*/, ""));
  }

  const description = [
    "A folded or sealed letter. To whoever finds this—",
    hooks[0] || "The town is not safe after dark.",
    hooks[1] || "Do not trust anyone wearing the old crest.",
    secrets[0] || "The key is where the river meets the old stone—under the silt.",
    secrets[1] || "Destroy this after you read it.",
    "Ink on parchment, wax seal, creased from handling.",
  ].join(" ");

  return {
    ...initialPropForm,
    itemCategory: "paper" as const,
    title: `Handout: ${title}`,
    description,
    settingHint: form.setting || initialPropForm.settingHint,
    extraNotes: form.extraNotes,
  };
}
