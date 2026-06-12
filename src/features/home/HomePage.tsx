"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ADVENTURE_LENGTH_HOVER_HELP,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import { REALM_SIZE_LABEL, type RealmSize } from "@/lib/realmPrompt";
import {
  appendGenerationLibraryItem,
  clearGenerationLibrary,
  deleteGenerationLibraryItem,
  deleteGenerationLibraryItems,
  LIBRARY_KIND_LABEL,
  loadGenerationLibraryItems,
  type LibraryItem,
  type LibraryKind,
} from "@/lib/generationLibrary";
import {
  appendRealmSeed,
  deleteRealmSeed,
  loadRealmSeeds,
  realmSeedOptionLabel,
  suggestedSeedName,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";
import type { MapPackKind } from "@/lib/mapImagePrompt";
import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { PropItemCategory } from "@/lib/propImagePrompt";
import { renderMarkdownToHtml } from "@/lib/markdownRender";
import {
  extractAdventureScenes,
  MAX_AUTO_SCENE_IMAGES,
  type AdventureSceneSnippet,
} from "@/lib/extractAdventureScenes";
import {
  AUTO_ADVENTURE_BATTLE_GRID_NOTES,
  AUTO_ADVENTURE_BATTLE_GRID_NOTES_METRIC,
  BATTLE_MAP_SCENE_PROMPT_LEAD,
  BATTLE_MAP_SCENE_PROMPT_LEAD_METRIC,
  SAMPLE_MAP_FORM_GRID_NOTES,
} from "@/lib/battleMapDirectives";

type GenerateMode =
  | "realm"
  | "adventure"
  | "characters"
  | "maps"
  | "props"
  | "library";

/** Sidebar width is capped (~max-w-md); never squeeze six tabs in one row there. */
const MODE_TAB_ORDER: readonly GenerateMode[] = [
  "realm",
  "adventure",
  "characters",
  "props",
  "maps",
  "library",
] as const;

const MODE_TAB_LABEL: Record<GenerateMode, string> = {
  realm: "Realm",
  adventure: "Adventure",
  characters: "Characters",
  props: "Props",
  maps: "Maps",
  library: "Library",
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

type PendingRealmSeed = {
  realmSize: RealmSize;
  titleHint: string;
  briefDescription: string;
  markdown: string;
};

type GeneratedImage = {
  kind: string;
  label?: string;
  imageDataUrl: string;
};
type ProgressStage =
  | "idle"
  | "realm_generating"
  | "realm_image_generating"
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
  gridNotes: string;
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
const CHARACTERS_SAMPLE_PARTY_PLACEHOLDER = "e.g. 4";

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
  gridNotes: "",
  extraNotes: "",
  imageSize: "1536x1024",
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
  payload: MapFormState,
  libraryReferenceMarkdown: string | undefined,
  mapDistanceUnits: MapDistanceUnits,
): Promise<{
  images: Array<{ kind: string; imageDataUrl: string }>;
  model: string | null;
  error: string | null;
}> {
  try {
    const trimmedRef = libraryReferenceMarkdown?.trim();
    const res = await fetch("/api/generate-map-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        mapDistanceUnits,
        ...(trimmedRef ? { libraryReferenceMarkdown: trimmedRef } : {}),
      }),
    });
    const raw = await res.text();
    const parsed = parseResponseBodyJson(res, raw);
    if (!parsed.ok) {
      return { images: [], model: null, error: parsed.userMessage };
    }
    const data = parsed.data as {
      images?: Array<{ kind: string; imageDataUrl: string }>;
      model?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        images: [],
        model: null,
        error: data.error ?? `Image request failed (${res.status})`,
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

type RealmImagePayload = {
  realmSize: RealmSize;
  titleHint: string;
  realmMarkdown: string;
  mapDistanceUnits: MapDistanceUnits;
  imageSize: "1024x1024" | "1536x1024" | "1024x1536";
  imageQuality: "medium" | "high";
};

async function fetchRealmImageResult(
  payload: RealmImagePayload,
): Promise<{
  images: Array<{ kind: string; imageDataUrl: string }>;
  model: string | null;
  error: string | null;
}> {
  try {
    const res = await fetch("/api/generate-realm-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    const parsed = parseResponseBodyJson(res, raw);
    if (!parsed.ok) {
      return { images: [], model: null, error: parsed.userMessage };
    }
    const data = parsed.data as {
      images?: Array<{ kind: string; imageDataUrl: string }>;
      model?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        images: [],
        model: null,
        error: data.error ?? `Image request failed (${res.status})`,
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
    const res = await fetch("/api/generate-prop-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    const parsed = parseResponseBodyJson(res, raw);
    if (!parsed.ok) {
      return { images: [], model: null, error: parsed.userMessage };
    }
    const data = parsed.data as {
      images?: Array<{ kind: string; imageDataUrl: string }>;
      model?: string;
      error?: string;
    };
    if (!res.ok) {
      return {
        images: [],
        model: null,
        error: data.error ?? `Image request failed (${res.status})`,
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

async function fetchAdventureResultStream(
  payload: FormState,
  callbacks: { onChunk: (chunk: string) => void; onModel: (model: string) => void },
  realmSeedMarkdown?: string,
): Promise<{ markdown: string; model: string | null; error: string | null }> {
  try {
    const trimmedSeed = realmSeedMarkdown?.trim();
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        ...payload,
        ...(trimmedSeed ? { realmSeedMarkdown: trimmedSeed } : {}),
        stream: true,
      }),
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
      return { markdown: "", model: null, error: "No response stream received." };
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
  } catch (err) {
    return {
      markdown: "",
      model: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

const REALM_SIZES: RealmSize[] = [
  "world",
  "continent",
  "country",
  "region",
  "local",
];

async function fetchRealmResultStream(
  payload: RealmFormState,
  callbacks: { onChunk: (chunk: string) => void; onModel: (model: string) => void },
  realmSeedMarkdown?: string,
): Promise<{ markdown: string; model: string | null; error: string | null }> {
  try {
    const trimmedSeed = realmSeedMarkdown?.trim();
    const res = await fetch("/api/generate-realm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        realmSize: payload.realmSize,
        titleHint: payload.titleHint,
        description: payload.description,
        extraNotes: payload.extraNotes,
        ...(trimmedSeed ? { realmSeedMarkdown: trimmedSeed } : {}),
        stream: true,
      }),
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
      return { markdown: "", model: null, error: "No response stream received." };
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
  } catch (err) {
    return {
      markdown: "",
      model: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export default function Home(props: PageProps<"/">) {
  void props;

  const [mode, setMode] = useState<GenerateMode>("adventure");
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
  const [autoGenerateRealmMapImage, setAutoGenerateRealmMapImage] = useState(true);
  const [mapDistanceUnits, setMapDistanceUnits] =
    useState<MapDistanceUnits>("imperial");
  const [progressStage, setProgressStage] = useState<ProgressStage>("idle");
  const [realmSeeds, setRealmSeeds] = useState<SavedRealmSeed[]>([]);
  const [selectedRealmSeedId, setSelectedRealmSeedId] = useState("");
  /** Realm tab: optional saved realm whose Markdown grounds a new realm run. */
  const [selectedRealmCreationSeedId, setSelectedRealmCreationSeedId] =
    useState("");
  const [pendingRealmSeed, setPendingRealmSeed] = useState<PendingRealmSeed | null>(
    null,
  );
  const [pendingSeedNameDraft, setPendingSeedNameDraft] = useState("");
  const [realmSeedDialogError, setRealmSeedDialogError] = useState("");

  useEffect(() => {
    setRealmSeeds(loadRealmSeeds());
  }, []);

  useEffect(() => {
    if (!selectedRealmSeedId) return;
    if (!realmSeeds.some((s) => s.id === selectedRealmSeedId)) {
      setSelectedRealmSeedId("");
    }
  }, [realmSeeds, selectedRealmSeedId]);

  useEffect(() => {
    if (!selectedRealmCreationSeedId) return;
    if (!realmSeeds.some((s) => s.id === selectedRealmCreationSeedId)) {
      setSelectedRealmCreationSeedId("");
    }
  }, [realmSeeds, selectedRealmCreationSeedId]);

  useEffect(() => {
    if (pendingRealmSeed) setRealmSeedDialogError("");
  }, [pendingRealmSeed]);

  function selectMode(next: GenerateMode) {
    setMode(next);
    switch (next) {
      case "realm":
        setRealmForm(initialRealmForm);
        break;
      case "adventure":
        setForm(initialForm);
        break;
      case "characters":
        setForm(initialFormCharacters);
        break;
      case "props":
        setPropForm(initialPropFormStandalone);
        break;
      case "maps":
        setMapForm(initialMapForm);
        break;
      case "library":
        break;
      default:
        break;
    }
  }

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(
    null,
  );
  const [libraryKindFilter, setLibraryKindFilter] = useState<
    LibraryKind | "all"
  >("all");
  /** Checked rows for bulk delete (ids may include items hidden by filter). */
  const [libraryCheckedIds, setLibraryCheckedIds] = useState<string[]>([]);
  /** Maps tab: optional Library entry whose Markdown grounds the image prompt. */
  const [mapLibraryReferenceId, setMapLibraryReferenceId] = useState("");

  useEffect(() => {
    void loadGenerationLibraryItems().then(setLibraryItems);
  }, []);

  useEffect(() => {
    const valid = new Set(libraryItems.map((i) => i.id));
    setLibraryCheckedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [libraryItems]);

  useEffect(() => {
    if (!mapLibraryReferenceId) return;
    if (!libraryItems.some((i) => i.id === mapLibraryReferenceId)) {
      setMapLibraryReferenceId("");
    }
  }, [libraryItems, mapLibraryReferenceId]);

  function mapLibraryReferenceMarkdownForApi(): string | undefined {
    if (!mapLibraryReferenceId.trim()) return undefined;
    const item = libraryItems.find((i) => i.id === mapLibraryReferenceId);
    if (!item) return undefined;
    const md = item.markdown.trim();
    if (md) return md;
    return `# ${item.title}\n\n*(${LIBRARY_KIND_LABEL[item.kind]} — this library entry has no saved text; use the map form fields as the primary brief.)*`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "library") return;
    setLoading(true);
    setError(null);
    setPendingRealmSeed(null);
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
        const mapResult = await generateMapImage(
          mapForm,
          mapLibraryReferenceMarkdownForApi(),
        );
        if (mapResult.ok) {
          setProgressStage("complete");
          setLibraryItems(
            await appendGenerationLibraryItem({
              kind: "maps",
              title: mapForm.locationName.trim() || "Maps",
              markdown: "",
              textModel: null,
              imageModel: mapResult.model,
              images: mapResult.images,
            }),
          );
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
          setLibraryItems(
            await appendGenerationLibraryItem({
              kind: "props",
              title:
                propForm.title.trim() ||
                propForm.description.trim().slice(0, 72) ||
                "Prop handout",
              markdown: "",
              textModel: null,
              imageModel: propResult.model,
              images: propResult.images,
            }),
          );
        }
        return;
      }
      if (mode === "realm") {
        if (!realmForm.description.trim()) {
          setError("Describe the realm: tone, key factions, terrain, and what you need at the table.");
          setProgressStage("idle");
          return;
        }
        const realmCreationSeedMd = selectedRealmCreationSeedId
          ? realmSeeds.find((s) => s.id === selectedRealmCreationSeedId)
              ?.markdown
          : undefined;
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
          let realmLibImages: GeneratedImage[] = [];
          let realmLibImgModel: string | null = null;
          setPendingRealmSeed({
            realmSize: realmForm.realmSize,
            titleHint: titleSnap,
            briefDescription,
            markdown: streamed.markdown,
          });
          setPendingSeedNameDraft(
            suggestedSeedName(streamed.markdown, titleSnap),
          );
          if (autoGenerateRealmMapImage) {
            setImageLoading(true);
            setImageError(null);
            setMapImages([]);
            setImageModel(null);
            setProgressStage("realm_image_generating");
            try {
              const r = await fetchRealmImageResult({
                realmSize: realmForm.realmSize,
                titleHint: realmForm.titleHint,
                realmMarkdown: streamed.markdown,
                mapDistanceUnits,
                imageSize: "1536x1024",
                imageQuality: "medium",
              });
              if (r.error) {
                setImageError(r.error);
              } else {
                const imgs = r.images.map((img) => ({
                  ...img,
                  label: "Realm map",
                }));
                setMapImages(imgs);
                setImageModel(r.model);
                realmLibImages = imgs;
                realmLibImgModel = r.model;
              }
            } finally {
              setImageLoading(false);
            }
            setProgressStage("complete");
          } else {
            setProgressStage("complete");
          }
          const realmLibTitle =
            firstHeading(streamed.markdown) ?? (titleSnap || "Realm");
          setLibraryItems(
            await appendGenerationLibraryItem({
              kind: "realm",
              title: realmLibTitle,
              markdown: streamed.markdown,
              textModel: streamed.model ?? null,
              imageModel: realmLibImgModel,
              images: realmLibImages,
            }),
          );
          setRealmForm(emptyRealmForm);
        } else {
          setError("No generated text returned.");
          setProgressStage("error");
        }
        return;
      }
      const url =
        mode === "adventure" ? "/api/generate" : "/api/generate-characters";
      const payload =
        mode === "adventure"
          ? form
          : {
              partyConcept: form.titleHint,
              levelRange: form.levelRange,
              tone: form.tone,
              setting: form.setting,
              characterCount: form.partySize,
              extraNotes: form.extraNotes,
            };
      let generatedMarkdown = "";
      let generatedModel: string | null = null;
      if (mode === "adventure") {
        const seedMarkdown = selectedRealmSeedId
          ? realmSeeds.find((s) => s.id === selectedRealmSeedId)?.markdown
          : undefined;
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
            "Overview / locale map: **full-color atlas** (distinct oceans, seas, major lakes, sharp coasts, **capitals + major cities**, **primary trade routes**)—functional reference, not painterly world art. Battle maps: **graph-paper** tactical diagrams; short legible labels for key areas from context.",
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
            gridNotes:
              mapDistanceUnits === "metric"
                ? AUTO_ADVENTURE_BATTLE_GRID_NOTES_METRIC
                : AUTO_ADVENTURE_BATTLE_GRID_NOTES,
            extraNotes: mapExtraNotes,
            imageSize: "1536x1024",
            imageQuality: "high",
          };

          const scenes = extractAdventureScenes(generatedMarkdown, MAX_AUTO_SCENE_IMAGES);
          const collected: GeneratedImage[] = [];
          let workflowModel: string | null = null;
          let workflowError: string | null = null;

          try {
            if (autoGenerateAdventureMap) {
              setProgressStage("map_locale_generating");
              if (scenes.length === 0) {
                const r = await fetchMapImageResult(mapBase, undefined, mapDistanceUnits);
                if (r.error) workflowError = r.error;
                else {
                  collected.push(...r.images.map((img) => ({ ...img })));
                  workflowModel = r.model;
                }
              } else {
                const rLocale = await fetchMapImageResult(
                  {
                    ...mapBase,
                    mapKind: "overland",
                    context: mapContext,
                  },
                  undefined,
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
                          undefined,
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
        setLibraryItems(
          await appendGenerationLibraryItem({
            kind: libKind,
            title: libTitle,
            markdown: generatedMarkdown,
            textModel: generatedModel,
            imageModel: recordImageModel,
            images: recordImages,
          }),
        );
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
    const lib = activeLibraryExport();
    if (lib) {
      return slugify(lib.title) || `ddeasy-${lib.kind}`;
    }
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
        payload,
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

  function activeLibraryExport(): LibraryItem | null {
    return mode === "library" && selectedLibraryId
      ? libraryItems.find((i) => i.id === selectedLibraryId) ?? null
      : null;
  }

  function exportMarkdownForDownload(): string {
    return activeLibraryExport()?.markdown ?? markdown;
  }

  function exportModeForDownload(): GenerateMode {
    const lib = activeLibraryExport();
    if (lib) return lib.kind;
    if (mode === "library") return "adventure";
    return mode;
  }

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
      markdownToBasicHtml(md, m === "adventure" || m === "realm"),
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

  const selectedLibraryItem =
    mode === "library" && selectedLibraryId
      ? libraryItems.find((i) => i.id === selectedLibraryId) ?? null
      : null;
  const filteredLibraryItems =
    libraryKindFilter === "all"
      ? libraryItems
      : libraryItems.filter((i) => i.kind === libraryKindFilter);
  const previewMarkdown =
    mode === "library" ? (selectedLibraryItem?.markdown ?? "") : markdown;
  const previewImages: GeneratedImage[] =
    mode === "library"
      ? selectedLibraryItem
        ? (selectedLibraryItem.images as GeneratedImage[])
        : []
      : mapImages;
  const previewTextModel =
    mode === "library" && selectedLibraryItem
      ? selectedLibraryItem.textModel
      : model;
  const previewImageModel =
    mode === "library" && selectedLibraryItem
      ? selectedLibraryItem.imageModel
      : imageModel;
  const outputLayoutKind: LibraryKind =
    mode === "library"
      ? selectedLibraryItem?.kind ?? "adventure"
      : (mode as LibraryKind);
  /** Cover + per-## “sheets” for print/PDF and merging into a binder or magazine-style compilation */
  const bookletPaperModuleLayout =
    outputLayoutKind === "adventure" || outputLayoutKind === "realm";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-10">
      {pendingRealmSeed ? (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="realm-seed-name-title"
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-lg"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <h2
              id="realm-seed-name-title"
              className="text-lg font-semibold text-[var(--text)]"
            >
              Save realm seed
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Give this realm a name for the adventure tab library. You can edit the
              suggestion or skip if you do not need a saved seed.
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--muted)]">Seed name</span>
              <input
                value={pendingSeedNameDraft}
                onChange={(e) => {
                  setRealmSeedDialogError("");
                  setPendingSeedNameDraft(e.target.value);
                }}
                className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                placeholder="e.g. Ash Covenant coast — player-facing name"
                autoFocus
              />
            </label>
            {realmSeedDialogError ? (
              <p className="mt-2 text-sm text-red-500">{realmSeedDialogError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const name = pendingSeedNameDraft.trim();
                  if (!name) {
                    setRealmSeedDialogError("Enter a name, or choose Skip.");
                    return;
                  }
                  setRealmSeeds(
                    appendRealmSeed({
                      seedName: name,
                      realmSize: pendingRealmSeed.realmSize,
                      titleHint: pendingRealmSeed.titleHint,
                      briefDescription: pendingRealmSeed.briefDescription,
                      markdown: pendingRealmSeed.markdown,
                    }),
                  );
                  setPendingRealmSeed(null);
                }}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Save to library
              </button>
              <button
                type="button"
                onClick={() => {
                  setRealmSeedDialogError("");
                  setPendingRealmSeed(null);
                }}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--bg)]"
                style={{ borderColor: "var(--border)" }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section
        className="fantasy-panel no-print w-full shrink-0 rounded-xl border p-6 lg:max-w-md"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div>
          <p
            id="mode-tablist-label"
            className="mb-2 text-sm font-semibold text-[var(--text)]"
          >
            What do you want to create?
          </p>
          <div
            className="rounded-xl border p-2"
            style={{
              borderColor: "var(--border)",
              background: "rgba(154,116,22,0.08)",
            }}
          >
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
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
                    className={`min-h-[2.75rem] rounded-lg border px-2 py-2 text-center text-sm font-medium leading-tight transition sm:min-h-[2.5rem] sm:px-3 sm:py-2.5 ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"
                    } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`}
                  >
                    <span aria-hidden="true">{MODE_TAB_ICON[tabId]} </span>
                    {MODE_TAB_LABEL[tabId]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <h1 className="font-display mt-6 text-xl font-bold text-[var(--text)]">
          {mode === "library"
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
        <p className="mt-2 text-sm text-[var(--muted)]">
          {mode === "library"
            ? "Browse everything this app has generated in this browser—text and images. Open an entry to preview it in Output, copy Markdown, or download files."
            : mode === "realm"
              ? "Choose the scale of the place (from a whole world down to a local cluster), then describe what you want. Claude returns table-ready setting Markdown—original, not WotC copy."
              : mode === "adventure"
                ? "Pick a length: short session or one-nighter. Original and SRD-aware—not official WotC content."
                : mode === "characters"
                  ? "Claude builds a ready-to-play party: stats, gear, and hooks. SRD-open options only."
                  : mode === "props"
                    ? "Build handout images: paper props, potions, arms and armor, tools, and more. Pick an item type, describe it, generate—no adventure required."
                    : "Generate **full-color** locale / overland maps (atlas-style: cities, routes, clear water) and **graph-paper** battle maps for miniatures with OpenAI—top-down, not scenic illustrations."}
        </p>

        {mode === "library" ? (
          <div className="mt-6 flex max-h-[min(70vh,560px)] flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <SelectField
                label="Show"
                value={libraryKindFilter}
                onChange={(v) =>
                  setLibraryKindFilter(v as LibraryKind | "all")
                }
                options={[
                  { value: "all", label: "All kinds" },
                  { value: "realm", label: LIBRARY_KIND_LABEL.realm },
                  { value: "adventure", label: LIBRARY_KIND_LABEL.adventure },
                  {
                    value: "characters",
                    label: LIBRARY_KIND_LABEL.characters,
                  },
                  { value: "maps", label: LIBRARY_KIND_LABEL.maps },
                  { value: "props", label: LIBRARY_KIND_LABEL.props },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const visible = filteredLibraryItems.map((i) => i.id);
                    const allVisibleChecked =
                      visible.length > 0 &&
                      visible.every((id) => libraryCheckedIds.includes(id));
                    if (allVisibleChecked) {
                      setLibraryCheckedIds((prev) =>
                        prev.filter((id) => !visible.includes(id)),
                      );
                    } else {
                      setLibraryCheckedIds((prev) =>
                        Array.from(new Set([...prev, ...visible])),
                      );
                    }
                  }}
                  disabled={filteredLibraryItems.length === 0}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-[var(--text)] transition enabled:hover:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  {filteredLibraryItems.length > 0 &&
                  filteredLibraryItems.every((i) =>
                    libraryCheckedIds.includes(i.id),
                  )
                    ? "Clear selection"
                    : "Select visible"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (libraryCheckedIds.length === 0) return;
                    if (
                      !window.confirm(
                        `Delete ${libraryCheckedIds.length} selected item(s)? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    const remove = new Set(libraryCheckedIds);
                    setLibraryItems(
                      await deleteGenerationLibraryItems(libraryCheckedIds),
                    );
                    setLibraryCheckedIds([]);
                    if (selectedLibraryId && remove.has(selectedLibraryId)) {
                      setSelectedLibraryId(null);
                    }
                  }}
                  disabled={libraryCheckedIds.length === 0}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-[var(--text)] transition enabled:hover:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: "var(--border)" }}
                >
                  Delete selected
                  {libraryCheckedIds.length > 0
                    ? ` (${libraryCheckedIds.length})`
                    : ""}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      libraryItems.length > 0 &&
                      !window.confirm(
                        "Remove every saved generation from this browser?",
                      )
                    ) {
                      return;
                    }
                    setLibraryItems(await clearGenerationLibrary());
                    setSelectedLibraryId(null);
                    setLibraryCheckedIds([]);
                  }}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  style={{ borderColor: "rgba(248,113,113,0.45)" }}
                >
                  DELETE ALL
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Stored in this browser using IndexedDB, with a small localStorage
              backup. Larger image packs fit than with localStorage alone; if
              space still runs out, oldest entries drop first. Use the checkbox to
              select entries; click the title area to preview in Output.
            </p>
            {filteredLibraryItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Nothing here yet. Each successful realm, adventure, character
                sheet, map pack, or prop run is added automatically.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {filteredLibraryItems.map((item) => {
                  const isChecked = libraryCheckedIds.includes(item.id);
                  const isPreview = selectedLibraryId === item.id;
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex gap-3 rounded-lg border p-3 text-sm transition ${
                          isChecked ? "bg-[rgba(201,162,39,0.09)]" : ""
                        }`}
                        style={{
                          borderColor: "var(--border)",
                          outline: isPreview
                            ? "2px solid var(--accent)"
                            : "none",
                        }}
                      >
                        <label className="mt-1 flex shrink-0 cursor-pointer items-start">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setLibraryCheckedIds((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((x) => x !== item.id)
                                  : [...prev, item.id],
                              );
                            }}
                            className="h-4 w-4 accent-[var(--accent)]"
                            aria-label={`Select “${item.title}” for bulk delete`}
                          />
                        </label>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedLibraryId(item.id)}
                        >
                          <span className="font-semibold text-[var(--text)]">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {LIBRARY_KIND_LABEL[item.kind]} ·{" "}
                            {new Date(item.createdAt).toLocaleString()}
                            {!item.markdown.trim() && item.images.length > 0
                              ? " · images only"
                              : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="shrink-0 self-start rounded-md border px-2 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                          style={{ borderColor: "var(--border)" }}
                          onClick={async () => {
                            const next = await deleteGenerationLibraryItem(item.id);
                            setLibraryItems(next);
                            setLibraryCheckedIds((prev) =>
                              prev.filter((x) => x !== item.id),
                            );
                            if (selectedLibraryId === item.id) {
                              setSelectedLibraryId(null);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "maps" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-[var(--muted)]">
                  Map pack type
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
                        hint: "Travel, regions, sites",
                      },
                      {
                        id: "battle" as const,
                        label: "Battle maps",
                        hint: "Tactical image arenas",
                      },
                      {
                        id: "both" as const,
                        label: "Both",
                        hint: "Overview + fights",
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
              <SelectField
                label="Library reference"
                value={mapLibraryReferenceId}
                onChange={setMapLibraryReferenceId}
                options={[
                  {
                    value: "",
                    label:
                      libraryItems.length > 0
                        ? "None — map form only"
                        : "None — save runs in Library first",
                  },
                  ...libraryItems.map((i) => ({
                    value: i.id,
                    label: `${i.title.length > 52 ? `${i.title.slice(0, 52)}…` : i.title} (${LIBRARY_KIND_LABEL[i.kind]})`,
                  })),
                ]}
              />
              <p className="text-xs text-[var(--muted)]">
                Optional: pick any Library item so geography and names from that
                saved text guide the map. Your scene context and grid notes below
                still apply; entries with images only use title and kind as a
                thin hint.
              </p>
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
                label="Tone / biome (optional)"
                value={mapForm.tone}
                onChange={(v) => setMapForm((f) => ({ ...f, tone: v }))}
                placeholder={MAP_SAMPLE_TONE_PLACEHOLDER}
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--text)]">
                  Scene or adventure context
                </span>
                <span className="text-xs text-[var(--muted)]">
                  Locations, encounter spaces, and names you want on the map. Stronger briefs yield clearer maps.
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
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--text)]">
                  Grid / scale preferences (optional)
                </span>
                <span className="text-xs text-[var(--muted)]">
                  Square size, zoom, line weight—anything the image model should enforce.
                </span>
                <textarea
                  value={mapForm.gridNotes}
                  onChange={(e) =>
                    setMapForm((f) => ({ ...f, gridNotes: e.target.value }))
                  }
                  rows={3}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder={SAMPLE_MAP_FORM_GRID_NOTES}
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
                    { value: "1536x1024", label: "Landscape (1536x1024)" },
                    { value: "1024x1024", label: "Square (1024x1024)" },
                    { value: "1024x1536", label: "Portrait (1024x1536)" },
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
                  What it looks like, materials, color, and any in-world text or marks. Be specific—the image model follows this.
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
                  placeholder="Anything else for the image model (e.g. no gore, keep text legible)"
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
                    { value: "1024x1536", label: "Portrait (1024×1536)" },
                    { value: "1536x1024", label: "Landscape (1536×1024)" },
                    { value: "1024x1024", label: "Square (1024×1024)" },
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
                <SelectField
                  label="Realm seed (optional)"
                  value={selectedRealmCreationSeedId}
                  onChange={setSelectedRealmCreationSeedId}
                  options={[
                    {
                      value: "",
                      label:
                        realmSeeds.length > 0
                          ? "None — new realm from your brief only"
                          : "None — save a realm after generating to use as a seed",
                    },
                    ...realmSeeds.map((s) => ({
                      value: s.id,
                      label: realmSeedOptionLabel(s),
                    })),
                  ]}
                />
                <p className="text-xs text-[var(--muted)]">
                  Pick a saved realm to stay consistent with its geography and lore, or to
                  zoom or expand—the realm size you chose above and your description still
                  drive this run.
                </p>
                {selectedRealmCreationSeedId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedRealmCreationSeedId;
                      const next = deleteRealmSeed(id);
                      setRealmSeeds(next);
                      setSelectedRealmCreationSeedId("");
                      if (selectedRealmSeedId === id) {
                        setSelectedRealmSeedId("");
                      }
                    }}
                    className="self-start rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--bg)]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Delete this saved realm
                  </button>
                ) : null}
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
                  Tone, geography, who holds power, conflicts, and what you need to run at the table. Required.
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
                  placeholder="Constraints, inspirations to avoid, safety tools, level band…"
                />
              </label>
              <fieldset
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <legend className="text-sm font-medium text-[var(--muted)]">
                  Realm map scale
                </legend>
                <p className="text-xs text-[var(--muted)]">
                  Applies to the auto-generated realm map image (scale bar units).
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="mapDistanceUnitsRealm"
                      checked={mapDistanceUnits === "imperial"}
                      onChange={() => setMapDistanceUnits("imperial")}
                      className="accent-[var(--accent)]"
                    />
                    <span>Imperial (miles, leagues)</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="mapDistanceUnitsRealm"
                      checked={mapDistanceUnits === "metric"}
                      onChange={() => setMapDistanceUnits("metric")}
                      className="accent-[var(--accent)]"
                    />
                    <span>Metric (km)</span>
                  </label>
                </div>
              </fieldset>
              <label
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <input
                  type="checkbox"
                  checked={autoGenerateRealmMapImage}
                  onChange={(e) => setAutoGenerateRealmMapImage(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-[var(--muted)]">
                  Auto-generate a realm map image after the text
                </span>
              </label>
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
              <SelectField
                label="Realm seed"
                value={selectedRealmSeedId}
                onChange={setSelectedRealmSeedId}
                options={[
                  {
                    value: "",
                    label:
                      realmSeeds.length > 0
                        ? "None — setting comes from the fields below only"
                        : "None — generate a realm first; it is saved automatically",
                  },
                  ...realmSeeds.map((s) => ({
                    value: s.id,
                    label: realmSeedOptionLabel(s),
                  })),
                ]}
              />
              <p className="text-xs text-[var(--muted)]">
                Finished realms are stored in this browser and can anchor adventure geography,
                factions, and lore. Your adventure brief below still controls plot, level band,
                and tone.
              </p>
              {selectedRealmSeedId ? (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedRealmSeedId;
                    const next = deleteRealmSeed(id);
                    setRealmSeeds(next);
                    setSelectedRealmSeedId("");
                    if (selectedRealmCreationSeedId === id) {
                      setSelectedRealmCreationSeedId("");
                    }
                  }}
                  className="self-start rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--bg)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Delete this saved realm
                </button>
              ) : null}
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
            <label
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                type="checkbox"
                checked={autoGenerateAdventureMap}
                onChange={(e) => setAutoGenerateAdventureMap(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--muted)]">
                Auto-generate maps with adventure (overview + one battle map per scene, up to{" "}
                {MAX_AUTO_SCENE_IMAGES})
              </span>
            </label>
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
            </fieldset>
          ) : null}
          {mode === "adventure" ? (
            <label
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                type="checkbox"
                checked={autoGenerateAdventureProps}
                onChange={(e) => setAutoGenerateAdventureProps(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[var(--muted)]">
                Auto-generate prop handouts with adventure (one per scene when scenes are found, up to{" "}
                {MAX_AUTO_SCENE_IMAGES}; otherwise one handout)
              </span>
            </label>
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
              ) : (
                <Field
                  label="How many PCs (optional)"
                  value={form.partySize}
                  onChange={(v) => setForm((f) => ({ ...f, partySize: v }))}
                  placeholder={CHARACTERS_SAMPLE_PARTY_PLACEHOLDER}
                />
              )}
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
            className="mt-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--accent)" }}
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

      <section
        className="fantasy-panel print-generation-root min-h-[50vh] flex-1 rounded-xl border p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-[var(--accent)]">
            <span aria-hidden="true">&#10022; </span>Output
          </h2>
          {previewMarkdown.trim() || previewImages.length > 0 ? (
            <div className="no-print flex flex-wrap gap-2">
              {previewMarkdown.trim() ? (
                <>
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
        {mode !== "library" ? (
          <div className="no-print">
            <ProgressPanel
              mode={mode}
              stage={progressStage}
              loading={loading}
              imageLoading={imageLoading}
              autoMapEnabled={autoGenerateAdventureMap}
              autoPropsEnabled={autoGenerateAdventureProps}
              autoRealmMapEnabled={autoGenerateRealmMapImage}
            />
          </div>
        ) : null}
        {previewMarkdown.trim() ? (
          <p className="no-print mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Tip: use <strong className="text-[var(--text)]/80">Print</strong> above for markdown and
            map images together. For long docs, export <strong className="text-[var(--text)]/80">.md</strong>{" "}
            (Obsidian / VS Code) or <strong className="text-[var(--text)]/80">.html</strong> and use{" "}
            <strong className="text-[var(--text)]/80">Print → Save as PDF</strong>.{" "}
            {outputLayoutKind === "maps"
              ? "You can download locale and battle images as PNG for VTTs or handouts."
              : bookletPaperModuleLayout
                ? "Adventures and realms render as cover + chapter **sheets**—print or PDF each, then combine PDFs in your viewer for a booklet or magazine-style compilation."
                : "You can also paste Markdown into Google Docs / Word."}
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

        {outputLayoutKind === "realm" ? (
          <>
            {previewMarkdown.trim() ? (
              <article
                className={`adventure-md mt-6 max-w-none text-[var(--text)]${bookletPaperModuleLayout ? " paper-module-layout" : ""}`}
                dangerouslySetInnerHTML={{
                  __html: simpleMarkdownToHtml(
                    previewMarkdown,
                    bookletPaperModuleLayout,
                  ),
                }}
              />
            ) : null}
            <MapImageOutputBlock
              mapImages={previewImages}
              onDownloadMap={downloadMapImage}
            />
          </>
        ) : (
          <>
            <MapImageOutputBlock
              mapImages={previewImages}
              onDownloadMap={downloadMapImage}
            />
            {previewMarkdown.trim() &&
            outputLayoutKind !== "maps" &&
            outputLayoutKind !== "props" ? (
              <article
                className={`adventure-md mt-6 max-w-none text-[var(--text)]${bookletPaperModuleLayout ? " paper-module-layout" : ""}`}
                dangerouslySetInnerHTML={{
                  __html: simpleMarkdownToHtml(
                    previewMarkdown,
                    bookletPaperModuleLayout,
                  ),
                }}
              />
            ) : null}
          </>
        )}

        {mode === "library" && !selectedLibraryItem ? (
          <p className="no-print mt-8 text-sm text-[var(--muted)]">
            Select an entry in the Library list to preview its text and images
            here.
          </p>
        ) : null}
        {!loading &&
        !error &&
        !previewMarkdown.trim() &&
        previewImages.length === 0 &&
        mode !== "library" ? (
          <p className="no-print mt-8 text-sm text-[var(--muted)]">
            {mode === "realm"
              ? "Pick a realm size, describe what you want, and generate table-ready setting Markdown."
              : mode === "adventure"
                ? "Submit to generate a 5.2-style adventure in Markdown (length matches your selection)."
                : mode === "characters"
                  ? "Submit the form to generate pre-made PCs (Markdown). Copy to your notes or VTT."
                  : mode === "props"
                    ? "Choose an item type, write a description, and generate a handout image."
                    : "Submit to generate **full-color** locale / overland maps (atlas clarity, cities & routes) and **graph-paper** battle maps for minis."}
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
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
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
  autoRealmMapEnabled,
}: {
  mode: GenerateMode;
  stage: ProgressStage;
  loading: boolean;
  imageLoading: boolean;
  autoMapEnabled: boolean;
  autoPropsEnabled: boolean;
  autoRealmMapEnabled: boolean;
}) {
  const items = getProgressItems(
    mode,
    stage,
    autoMapEnabled,
    autoPropsEnabled,
    autoRealmMapEnabled,
  );
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
  autoRealmMapEnabled: boolean,
): Array<{ label: string; state: "pending" | "active" | "done" }> {
  if (mode === "library") {
    return [];
  }

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

  if (mode === "realm" && !autoRealmMapEnabled) {
    return [
      {
        label: "Generate realm",
        state: stateFor(stage, "realm_generating", "complete"),
      },
    ];
  }

  if (mode === "realm" && autoRealmMapEnabled) {
    return [
      {
        label: "Generate realm",
        state:
          stage === "realm_generating"
            ? "active"
            : stage === "idle"
              ? "pending"
              : "done",
      },
      {
        label: "Draw Realm",
        state:
          stage === "realm_generating"
            ? "pending"
            : stage === "realm_image_generating"
              ? "active"
              : stage === "complete" || stage === "error"
                ? "done"
                : "pending",
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

function simpleMarkdownToHtml(md: string, paperModuleLayout = false): string {
  return renderMarkdownToHtml(md, "preview", paperModuleLayout);
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
  const lead =
    mapDistanceUnits === "metric"
      ? BATTLE_MAP_SCENE_PROMPT_LEAD_METRIC
      : BATTLE_MAP_SCENE_PROMPT_LEAD;
  return [
    lead,
    "",
    scene.context.slice(0, 4000),
    "",
    "Adventure tone / setting:",
    mapBase.tone,
    "",
    "Grid / layout notes:",
    mapBase.gridNotes,
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
    "Generate **full-color atlas-style** locale / area overview (oceans vs seas vs lakes, borders, **capitals**, **major cities**, **trade routes**) and a **graph-paper** tactical battle diagram for the main conflict—not scenic painted art.",
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
