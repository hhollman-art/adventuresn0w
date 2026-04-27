"use client";

import { use, useState } from "react";
import {
  ADVENTURE_LENGTH_HOVER_HELP,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import type { MapPackKind } from "@/lib/mapImagePrompt";
import type { PropType } from "@/lib/propImagePrompt";
import {
  extractAdventureScenes,
  MAX_AUTO_SCENE_IMAGES,
  type AdventureSceneSnippet,
} from "@/lib/extractAdventureScenes";
import { PROP_IDEA_CATEGORIES, type PropIdea } from "@/lib/propIdeaCatalog";

type GenerateMode = "adventure" | "characters" | "maps" | "props";

type GeneratedImage = {
  kind: string;
  label?: string;
  imageDataUrl: string;
};
type ProgressStage =
  | "idle"
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
  propType: PropType;
  title: string;
  bodyText: string;
  style: string;
  ageWear: string;
  settingHint: string;
  extraNotes: string;
  imageSize: "1024x1024" | "1536x1024" | "1024x1536";
  imageQuality: "medium" | "high";
};

const initialMapForm: MapFormState = {
  mapKind: "both",
  locationName: "Sunken ring-fort at Blacktarn",
  levelRange: "3–4",
  partySize: "4",
  tone: "rain-slick stone, broken walkways, cold bioluminescence",
  context:
    "Party corners a beast in the flooded lower ring: a chokepoint skirmish in a gatehouse, then a balcony finale over black water.",
  gridNotes:
    "5 ft. squares; rooms ~25–40 ft. Clear lines and open shapes for movement—less painterly detail, more plan readability.",
  extraNotes: "",
  imageSize: "1536x1024",
  imageQuality: "high",
};

const initialPropForm: PropFormState = {
  propType: "letter",
  title: "Letter to Captain Varn",
  bodyText:
    "Captain, the third bell shipment never arrived. Meet me by the east quay before dawn. Burn this.",
  style: "ink on parchment, medieval calligraphy",
  ageWear: "creased corners, faint water stains, wax seal remnants",
  settingHint: "rainy port city in a grim fantasy kingdom",
  extraNotes: "",
  imageSize: "1024x1536",
  imageQuality: "high",
};

const initialPropFormStandalone: PropFormState = {
  propType: "letter",
  title: "",
  bodyText: "",
  style: "ink on cream paper, legible for a table handout",
  ageWear: "light edge wear, believable for adventuring use",
  settingHint: "generic fantasy, any tone you set below",
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
  levelRange: "3–4",
  tone: "heroic, slightly spooky",
  setting: "misty river valley with ruined shrines",
  villainOrThreat: "a pact-bound beast and its charmed villagers",
  partySize: "4",
  sessionLength: "3–4 hours",
  extraNotes: "",
};

const initialFormCharacters: FormState = {
  adventureLength: "short",
  combatIntensity: 3,
  titleHint: "wandering relic-hunters bound by a shared oath",
  levelRange: "3",
  tone: "hopeful, witty banter",
  setting: "trade-road kingdoms and old battlefields",
  villainOrThreat: "",
  partySize: "4",
  sessionLength: "",
  extraNotes: "",
};

async function fetchMapImageResult(payload: MapFormState): Promise<{
  images: Array<{ kind: string; imageDataUrl: string }>;
  model: string | null;
  error: string | null;
}> {
  try {
    const res = await fetch("/api/generate-map-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
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
    const data = (await res.json()) as {
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
): Promise<{ markdown: string; model: string | null; error: string | null }> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ ...payload, stream: true }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        markdown: "",
        model: null,
        error: data.error ?? `Request failed (${res.status})`,
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
  use(props.params);
  use(props.searchParams);

  const [mode, setMode] = useState<GenerateMode>("adventure");
  const [form, setForm] = useState<FormState>(initialForm);
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
  const [progressStage, setProgressStage] = useState<ProgressStage>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
          : "adventure_generating",
    );

    try {
      if (mode === "maps") {
        const ok = await generateMapImage(mapForm);
        if (ok) {
          setProgressStage("complete");
        }
        return;
      }
      if (mode === "props") {
        if (!propForm.title.trim() && !propForm.bodyText.trim()) {
          setError("Add a short title and/or the text to show on the handout (or pick an idea).");
          setProgressStage("idle");
          return;
        }
        const ok = await generateStandalonePropImage(propForm);
        if (ok) {
          setProgressStage("complete");
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
        const streamed = await fetchAdventureResultStream(form, {
          onChunk: (chunk) => setMarkdown((prev) => prev + chunk),
          onModel: (m) => setModel(m),
        });
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
        const data = (await res.json()) as {
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
            form.adventureLength === "campaign"
              ? "Focus on Session 1 playable map details."
              : "",
            `Adventure combat focus ${form.combatIntensity}/5 (${
              form.combatIntensity <= 2
                ? "fewer fights—favor exploration layouts"
                : form.combatIntensity >= 4
                  ? "combat-heavy—favor tactical arenas, cover, chokepoints"
                  : "balanced—mix open and tactical spaces"
            }).`,
            "Visual style: cartography first (line, symbol, flat tone)—minimize painterly or illustrative rendering.",
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
              "5 ft. squares; keep rooms, corridors, and blocked edges obvious. Prefer clear line weights and flat terrain fills over artistic shading.",
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
                const r = await fetchMapImageResult(mapBase);
                if (r.error) workflowError = r.error;
                else {
                  collected.push(...r.images.map((img) => ({ ...img })));
                  workflowModel = r.model;
                }
              } else {
                const rLocale = await fetchMapImageResult({
                  ...mapBase,
                  mapKind: "overland",
                  context: mapContext,
                });
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
                        const r = await fetchMapImageResult({
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
                          ),
                        });
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

  async function handleGenerateMapImage() {
    await generateMapImage(mapForm);
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

  async function generateMapImage(payload: MapFormState) {
    setImageLoading(true);
    setImageError(null);
    setMapImages([]);
    setImageModel(null);

    try {
      const result = await fetchMapImageResult(payload);
      if (result.error) {
        setImageError(result.error);
        setProgressStage("error");
        return false;
      }
      const hasLocale = result.images.some((img) => img.kind === "locale");
      const hasBattle = result.images.some((img) => img.kind === "battle");
      if (hasLocale) {
        setProgressStage(hasBattle ? "map_battle_generating" : "map_locale_generating");
      }
      setMapImages(result.images.map((img) => ({ ...img })));
      setImageModel(result.model);
      setProgressStage("map_done");
      return true;
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Network error");
      setProgressStage("error");
      return false;
    } finally {
      setImageLoading(false);
    }
  }

  function applyPropIdea(idea: PropIdea) {
    setPropForm((f) => ({
      ...f,
      title: idea.title,
      bodyText: idea.bodyText,
      propType: idea.propType,
      style: idea.style,
      ageWear: idea.ageWear,
      settingHint: idea.settingHint,
      extraNotes: idea.extraNotes ?? "",
    }));
  }

  async function generateStandalonePropImage(payload: PropFormState) {
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
        return false;
      }
      const label = payload.title.trim() || "Prop handout";
      setMapImages(
        result.images.map((img) => ({
          ...img,
          label,
        })),
      );
      setImageModel(result.model);
      return true;
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Network error");
      setProgressStage("error");
      return false;
    } finally {
      setImageLoading(false);
    }
  }

  function copyMarkdown() {
    if (!markdown) return;
    void navigator.clipboard.writeText(markdown);
  }

  function downloadMarkdown() {
    if (!markdown) return;
    const name = `${fileBaseName(markdown, mode)}.md`;
    triggerDownload(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      name,
    );
  }

  function downloadHtml() {
    if (!markdown) return;
    const title =
      firstHeading(markdown) ??
      (mode === "adventure"
        ? "Adventure"
        : mode === "characters"
          ? "Characters"
          : mode === "props"
            ? "Props"
            : "Maps");
    const doc = buildStandaloneHtmlDocument(title, markdownToBasicHtml(markdown));
    const name = `${fileBaseName(markdown, mode)}.html`;
    triggerDownload(
      new Blob([doc], { type: "text/html;charset=utf-8" }),
      name,
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-10">
      <section
        className="w-full shrink-0 rounded-xl border p-6 lg:max-w-md"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
          {mode === "adventure"
            ? "Adventure (5.2)"
            : mode === "characters"
              ? "Pre-made characters (5.2)"
              : mode === "props"
                ? "Props (handouts)"
                : "Maps (5.2)"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {mode === "adventure"
            ? "Pick a length: short session, one-nighter, or campaign framework. Original and SRD-aware—not official WotC content."
            : mode === "characters"
              ? "Claude builds a ready-to-play party: stats, gear, and hooks. SRD-open options only."
              : mode === "props"
                ? "Build written handouts (letters, notices, map scraps, inscriptions) with OpenAI. Browse idea lists by theme, then edit and generate—no adventure required."
                : "Generate cartographic-style locale and battle maps with OpenAI (top-down, grid-friendly, not fine-art illustrations)."}
        </p>

        <div
          className="mt-4 grid grid-cols-2 gap-1 rounded-lg border p-1 text-xs font-medium sm:grid-cols-4"
          style={{ borderColor: "var(--border)" }}
          role="tablist"
          aria-label="Generation mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "adventure"}
            onClick={() => {
              setMode("adventure");
              setForm(initialForm);
            }}
            className="rounded-md px-2 py-2 transition sm:px-3"
            style={{
              background: mode === "adventure" ? "var(--accent)" : "transparent",
              color: mode === "adventure" ? "#000" : "var(--muted)",
            }}
          >
            Adventure
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "characters"}
            onClick={() => {
              setMode("characters");
              setForm(initialFormCharacters);
            }}
            className="rounded-md px-2 py-2 transition sm:px-3"
            style={{
              background:
                mode === "characters" ? "var(--accent)" : "transparent",
              color: mode === "characters" ? "#000" : "var(--muted)",
            }}
          >
            Characters
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "props"}
            onClick={() => {
              setMode("props");
              setPropForm(initialPropFormStandalone);
            }}
            className="rounded-md px-2 py-2 transition sm:px-3"
            style={{
              background: mode === "props" ? "var(--accent)" : "transparent",
              color: mode === "props" ? "#000" : "var(--muted)",
            }}
          >
            Props
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "maps"}
            onClick={() => {
              setMode("maps");
              setMapForm(initialMapForm);
            }}
            className="rounded-md px-2 py-2 transition sm:px-3"
            style={{
              background: mode === "maps" ? "var(--accent)" : "transparent",
              color: mode === "maps" ? "#000" : "var(--muted)",
            }}
          >
            Maps
          </button>
        </div>

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
              <Field
                label="Location or region name"
                value={mapForm.locationName}
                onChange={(v) => setMapForm((f) => ({ ...f, locationName: v }))}
                placeholder="e.g. The Saltfen Catacombs"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Level range"
                  value={mapForm.levelRange}
                  onChange={(v) => setMapForm((f) => ({ ...f, levelRange: v }))}
                />
                <Field
                  label="Party size"
                  value={mapForm.partySize}
                  onChange={(v) => setMapForm((f) => ({ ...f, partySize: v }))}
                />
              </div>
              <Field
                label="Tone / biome"
                value={mapForm.tone}
                onChange={(v) => setMapForm((f) => ({ ...f, tone: v }))}
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">
                  Scene or adventure context
                </span>
                <textarea
                  value={mapForm.context}
                  onChange={(e) =>
                    setMapForm((f) => ({ ...f, context: e.target.value }))
                  }
                  rows={5}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Describe locations, travel routes, and encounter spaces so the map reads like a plan your table can use."
                />
              </label>
              <Field
                label="Grid / scale preferences (optional)"
                value={mapForm.gridNotes}
                onChange={(v) => setMapForm((f) => ({ ...f, gridNotes: v }))}
                placeholder="e.g. 5 ft squares, 40 ft wide temple interior"
              />
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
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Verticality, hazards to emphasize, no water levels, etc."
                />
              </label>
              <button
                type="button"
                onClick={handleGenerateMapImage}
                disabled={imageLoading}
                className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition enabled:hover:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: "var(--border)" }}
              >
                {imageLoading ? "Rendering map image…" : "Generate map image"}
              </button>
            </>
          ) : null}
          {mode === "props" ? (
            <>
              <SelectField
                label="Handout format"
                value={propForm.propType}
                onChange={(v) =>
                  setPropForm((f) => ({
                    ...f,
                    propType: v as PropType,
                  }))
                }
                options={[
                  { value: "letter", label: "Letter" },
                  { value: "scroll", label: "Scroll / decree" },
                  { value: "journal", label: "Journal / ledger page" },
                  { value: "notice", label: "Posted notice" },
                  { value: "map_handout", label: "Small map / diagram" },
                  { value: "rune_tablet", label: "Rune tablet / inscription" },
                ]}
              />
              <p className="text-xs text-[var(--muted)]">
                Idea lists (weapons, kitchen, warehouse, and more) fill the fields below. Edit any text, then use{" "}
                <span className="text-[var(--text)]/90">Generate prop image</span> at the bottom.
              </p>
              <div className="flex flex-col gap-2">
                {PROP_IDEA_CATEGORIES.map((cat) => (
                  <details
                    key={cat.id}
                    className="group rounded-lg border text-xs"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <summary className="cursor-pointer list-none px-3 py-2 font-medium text-[var(--text)] marker:content-none">
                      <span className="text-[var(--muted)] group-open:opacity-80">{cat.label}</span>
                      <span className="ml-1 block text-[0.7rem] font-normal text-[var(--muted)] sm:inline sm:pl-1">
                        — {cat.description}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-1 border-t p-2" style={{ borderColor: "var(--border)" }}>
                      {cat.ideas.map((idea) => (
                        <button
                          key={idea.title}
                          type="button"
                          onClick={() => applyPropIdea(idea)}
                          className="rounded-md border px-2 py-1.5 text-left text-xs leading-snug text-[var(--text)] transition hover:bg-[var(--bg)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <span className="font-medium">{idea.title}</span>
                          <span className="mt-0.5 block line-clamp-2 text-[var(--muted)]">
                            {idea.bodyText.replace(/\n/g, " · ").slice(0, 120)}
                            {idea.bodyText.length > 120 ? "…" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              <Field
                label="Prop title"
                value={propForm.title}
                onChange={(v) => setPropForm((f) => ({ ...f, title: v }))}
                placeholder="e.g. Warehouse tally — barge 7"
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">Text to show (in-world writing)</span>
                <textarea
                  value={propForm.bodyText}
                  onChange={(e) => setPropForm((f) => ({ ...f, bodyText: e.target.value }))}
                  rows={6}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-xs text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="What should appear on the object—decrees, tallies, warnings, runes, etc."
                />
              </label>
              <Field
                label="Look / materials"
                value={propForm.style}
                onChange={(v) => setPropForm((f) => ({ ...f, style: v }))}
                placeholder="e.g. ink on parchment, chalk on board, stenciled crate"
              />
              <Field
                label="Age and wear"
                value={propForm.ageWear}
                onChange={(v) => setPropForm((f) => ({ ...f, ageWear: v }))}
                placeholder="e.g. water stains, torn corner, fresh wax"
              />
              <Field
                label="Setting hint"
                value={propForm.settingHint}
                onChange={(v) => setPropForm((f) => ({ ...f, settingHint: v }))}
                placeholder="Where it comes from in your world (tone, place)"
              />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">Extra notes (optional)</span>
                <textarea
                  value={propForm.extraNotes}
                  onChange={(e) => setPropForm((f) => ({ ...f, extraNotes: e.target.value }))}
                  rows={2}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
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
                    {
                      id: "campaign" as const,
                      label: "Campaign",
                      hint: "Multi-session + Session 1",
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
                    ? "Title or theme hint"
                    : "Party concept or theme"
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
                label="Level range"
                value={form.levelRange}
                onChange={(v) => setForm((f) => ({ ...f, levelRange: v }))}
              />
              <Field
                label="Tone"
                value={form.tone}
                onChange={(v) => setForm((f) => ({ ...f, tone: v }))}
              />
              <Field
                label={
                  mode === "adventure" ? "Setting" : "World flavor (optional)"
                }
                value={form.setting}
                onChange={(v) => setForm((f) => ({ ...f, setting: v }))}
              />
              {mode === "adventure" ? (
                <Field
                  label="Villain / threat"
                  value={form.villainOrThreat}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, villainOrThreat: v }))
                  }
                />
              ) : null}
              {mode === "adventure" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Party size"
                    value={form.partySize}
                    onChange={(v) => setForm((f) => ({ ...f, partySize: v }))}
                  />
                  <Field
                    label="Session length"
                    value={form.sessionLength}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, sessionLength: v }))
                    }
                  />
                </div>
              ) : (
                <Field
                  label="How many PCs"
                  value={form.partySize}
                  onChange={(v) => setForm((f) => ({ ...f, partySize: v }))}
                />
              )}
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--muted)]">
                  Extra notes
                </span>
                <textarea
                  value={form.extraNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, extraNotes: e.target.value }))
                  }
                  rows={3}
                  className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Puzzles to avoid, safety tools, recurring PC hooks…"
                />
              </label>
            </>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading
              ? "Generating…"
              : mode === "adventure"
                ? "Generate adventure"
                : mode === "characters"
                  ? "Generate characters"
                  : mode === "props"
                    ? "Generate prop image"
                    : "Generate maps"}
          </button>
        </form>
      </section>

      <section
        className="min-h-[50vh] flex-1 rounded-xl border p-6"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Output</h2>
          {markdown || mapImages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {markdown ? (
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
            </div>
          ) : null}
        </div>
        {model || imageModel ? (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {model ? `Text model: ${model}` : null}
            {model && imageModel ? " · " : null}
            {imageModel ? `Image model: ${imageModel}` : null}
          </p>
        ) : null}
        <ProgressPanel
          mode={mode}
          stage={progressStage}
          loading={loading}
          imageLoading={imageLoading}
          autoMapEnabled={autoGenerateAdventureMap}
          autoPropsEnabled={autoGenerateAdventureProps}
        />
        {markdown ? (
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Tip: open the <strong className="text-[var(--text)]/80">.md</strong> file in
            Obsidian or VS Code; open the <strong className="text-[var(--text)]/80">.html</strong>{" "}
            in your browser and use <strong className="text-[var(--text)]/80">Print → Save as PDF</strong>{" "}
            for a PDF.{" "}
            {mode === "maps"
              ? "You can download locale and battle images as PNG for VTTs or handouts."
                : "You can also paste Markdown into Google Docs / Word."}
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {imageError ? (
          <p
            className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {imageError}
          </p>
        ) : null}

        {mapImages.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {mapImages.map((img, idx) => {
              const heading =
                img.label ??
                (img.kind === "locale" || img.kind === "battle"
                  ? `${img.kind} map`
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
                      onClick={() => downloadMapImage(img.imageDataUrl, downloadSlug)}
                      className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Download PNG
                    </button>
                  </div>
                  <img
                    src={img.imageDataUrl}
                    alt={heading}
                    className="h-auto w-full rounded-md"
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {markdown && mode !== "maps" && mode !== "props" ? (
          <article
            className="adventure-md mt-6 max-w-none text-[var(--text)]"
            dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(markdown) }}
          />
        ) : !loading && !error && mapImages.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--muted)]">
            {mode === "adventure"
              ? "Submit to generate a 5.2-style adventure in Markdown (length matches your selection)."
              : mode === "characters"
                ? "Submit the form to generate pre-made PCs (Markdown). Copy to your notes or VTT."
                : mode === "props"
                  ? "Pick a theme, click an idea to load it, edit if you like, then generate a handout image—or write your own from scratch."
                  : "Submit to generate top-down, cartography-style locale and battle maps (grid-friendly, not scene illustrations)."}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-8 animate-pulse text-sm text-[var(--muted)]">
            {mode === "adventure" || mode === "characters"
              ? "Calling Claude…"
              : "Working on images… this can take a minute."}
          </p>
        ) : null}
        {imageLoading ? (
          <p className="mt-2 animate-pulse text-sm text-[var(--muted)]">
            {mode === "props"
              ? "Rendering prop image…"
              : "Rendering maps and handouts (batched API calls)…"}
          </p>
        ) : null}
      </section>
    </main>
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
                ? "text-xs font-medium text-emerald-400"
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

/** Minimal Markdown → HTML for headings, lists, bold, fenced code, paragraphs. */
function simpleMarkdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inFence = false;
  const codeBuf: string[] = [];

  const flushUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };

  const flushCode = () => {
    if (codeBuf.length === 0) return;
    const raw = codeBuf.join("\n");
    codeBuf.length = 0;
    const escaped = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");
    out.push(
      `<pre class="my-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-black/50 p-3 text-left font-mono text-xs leading-tight text-[var(--text)]"><code>${escaped}</code></pre>`,
    );
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushUl();
      if (inFence) {
        flushCode();
        inFence = false;
      } else {
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      codeBuf.push(line);
      continue;
    }

    const t = line.trim();
    if (t.startsWith("# ")) {
      flushUl();
      out.push(`<h1 class="text-2xl font-bold mt-6 mb-3">${inline(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      flushUl();
      out.push(
        `<h2 class="text-lg font-semibold mt-6 mb-2 text-[var(--accent)]">${inline(t.slice(3))}</h2>`,
      );
      continue;
    }
    if (t.startsWith("### ")) {
      flushUl();
      out.push(`<h3 class="text-base font-semibold mt-4 mb-2">${inline(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inUl) {
        out.push('<ul class="list-disc pl-5 space-y-1 my-2">');
        inUl = true;
      }
      out.push(`<li>${inline(t.slice(2))}</li>`);
      continue;
    }
    flushUl();
    if (t === "") {
      out.push("<br/>");
    } else {
      out.push(`<p class="my-2 leading-relaxed text-[var(--text)]/95">${inline(t)}</p>`);
    }
  }
  flushUl();
  if (inFence) flushCode();
  return out.join("\n");
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
  const fromTitle = firstHeading(md);
  const slug = slugify(fromTitle ?? "");
  if (slug) return slug;
  const prefix =
    mode === "adventure"
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

function markdownToBasicHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inFence = false;
  const codeBuf: string[] = [];

  const flushUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };

  const flushCode = () => {
    if (codeBuf.length === 0) return;
    const raw = codeBuf.join("\n");
    codeBuf.length = 0;
    const escaped = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");
    out.push(
      `<pre class="map-pre"><code>${escaped}</code></pre>`,
    );
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushUl();
      if (inFence) {
        flushCode();
        inFence = false;
      } else {
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      codeBuf.push(line);
      continue;
    }

    const t = line.trim();
    if (t.startsWith("# ")) {
      flushUl();
      out.push(`<h1>${inline(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      flushUl();
      out.push(`<h2>${inline(t.slice(3))}</h2>`);
      continue;
    }
    if (t.startsWith("### ")) {
      flushUl();
      out.push(`<h3>${inline(t.slice(4))}</h3>`);
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(t.slice(2))}</li>`);
      continue;
    }
    flushUl();
    if (t === "") {
      out.push("<p><br /></p>");
    } else {
      out.push(`<p>${inline(t)}</p>`);
    }
  }
  flushUl();
  if (inFence) flushCode();
  return out.join("\n");
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
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 0; color: #111; background: #fff; }
    main { max-width: 44rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; line-height: 1.55; }
    h1 { font-size: 1.75rem; margin: 0 0 1rem; }
    h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    h3 { font-size: 1.05rem; margin: 1.25rem 0 0.5rem; }
    p { margin: 0.5rem 0; }
    ul { margin: 0.5rem 0 0.75rem 1.25rem; }
    li { margin: 0.25rem 0; }
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
      body { background: #fff; }
      main { max-width: none; padding: 0; }
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
): string {
  const toneBlock = buildAutoMapContextFromAdventure(fullMarkdown, form);
  return [
    "Generate ONE top-down tactical battle map for this scene only. Cartographic / floor-plan clarity: walls, doorways, cover, and walkable space must read like a survey map, not a painted set or cinematic key art. VTT-ready, implied 5 ft. grid, no labels or room names on the image.",
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

const PREFERRED_PROP_TYPES_FOR_SCENES: PropType[] = [
  "notice",
  "map_handout",
  "rune_tablet",
  "scroll",
  "journal",
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

function chooseScenePropType(scene: AdventureSceneSnippet, index: number): PropType {
  const lowered = `${scene.title}\n${scene.context}`.toLowerCase();
  if (/\b(map|route|path|trail|passage|layout|region)\b/.test(lowered)) {
    return "map_handout";
  }
  if (/\b(rune|glyph|ward|sigil|inscription)\b/.test(lowered)) {
    return "rune_tablet";
  }
  if (/\b(notice|warning|proclamation|wanted|bounty|sign|poster)\b/.test(lowered)) {
    return "notice";
  }
  if (/\b(log|record|diary|journal|ledger|entry)\b/.test(lowered)) {
    return "journal";
  }
  if (/\b(scroll|decree|edict|ritual|prayer)\b/.test(lowered)) {
    return "scroll";
  }
  return PREFERRED_PROP_TYPES_FOR_SCENES[index % PREFERRED_PROP_TYPES_FOR_SCENES.length]!;
}

function buildSceneArtifactText(subject: string, propType: PropType): string {
  const s = subject.charAt(0).toUpperCase() + subject.slice(1);
  switch (propType) {
    case "map_handout":
      return [
        "Hand-drawn route: main path east through the pines; two X marks past the second fork; watchtower ringed and redrawn.",
        `Focus: ${s}.`,
        'Margin (small): "Not after the third bell."',
      ].join("\n");
    case "rune_tablet":
      return [
        "Runes in a broken ring: outer lines warn strangers off; one line names the place or keeper.",
        `Center, worn smooth: ${s}.`,
        "Hairline crack along the base—the ward failed here once.",
      ].join("\n");
    case "notice":
      return [
        "PUBLIC NOTICE",
        `Subject: ${s}. This is a real risk—do not treat it as gossip.`,
        "Anyone with information: report to the wardhouse by the next full moon. Do not go out after dark alone; take a lantern and company.",
        "—Posted in haste; seal still soft at one corner.",
      ].join("\n");
    case "journal":
      return [
        "Weather wrong—fog came early.",
        `Note on ${s}: the bells you hear before their time are not the usual watch.`,
        "Supplies left under the third stair, oiled and wrapped. Head east if I do not return.",
      ].join("\n");
    case "scroll":
      return [
        "Decree (official seal):",
        `${s}.`,
        "The river-locked door stays barred. If the seal breaks, sound the iron horn once—no more.",
        "Signed and sealed; wax unbroken on the fold.",
      ].join("\n");
    default:
      return [
        "Short note, folded small:",
        `About ${s}: carry this; show it to the priest or the sergeant before you act.`,
        "—End of the note; no more room on the page.",
      ].join("\n");
  }
}

function buildAutoPropPayloadFromScene(
  scene: AdventureSceneSnippet,
  form: FormState,
  index: number,
): PropFormState {
  const propType = chooseScenePropType(scene, index);
  const sceneSubject = inferSceneSubject(scene);
  return {
    ...initialPropForm,
    propType,
    title: `Handout — ${scene.title}`.slice(0, 120),
    bodyText: buildSceneArtifactText(sceneSubject, propType).slice(0, 950),
    settingHint: form.setting || initialPropForm.settingHint,
    style: initialPropForm.style,
    ageWear: initialPropForm.ageWear,
    extraNotes: [
      form.extraNotes,
      "Text on the object should read as in-world only (no labels like DM, handout, sketch, or prop).",
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
    "Generate a combat-usable, cartography-style map for the main conflict and a clear locale overview (paths and regions, not a scenic painting).",
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

  const bodyText = [
    "To whoever finds this,",
    hooks[0] || "The town is not safe after dark.",
    hooks[1] || "Do not trust anyone wearing the old crest.",
    secrets[0] || "The key is where the river meets the old stone—under the silt.",
    secrets[1] || "Destroy this after you read it.",
  ].join("\n");

  return {
    ...initialPropForm,
    propType: "letter",
    title: `Handout: ${title}`,
    bodyText,
    settingHint: form.setting || initialPropForm.settingHint,
    extraNotes: form.extraNotes,
  };
}
