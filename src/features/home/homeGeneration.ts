import type { RealmSize } from "@/lib/realmPrompt";
import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { PropItemCategory } from "@/lib/propImagePrompt";
import { suggestedSeedName, appendRealmSeed, type SavedRealmSeed, type SeedKind } from "@/lib/realmSeeds";
import { postHeartbeatJson } from "@/lib/sseClient";
import {
  buildBattleMapGridNotes,
  buildBattleMapScenePromptLead,
  imageSizeForVttGrid,
} from "@/lib/tabletop/gridPresets";
import type { AdventureSceneSnippet } from "@/lib/extractAdventureScenes";
import {
  type FormState,
  type MapFormState,
  type MapImagePayload,
  type PropFormState,
  type RealmFormState,
  initialPropForm,
  MAP_PACK_LABEL,
} from "./homeTypes";

export async function autoSaveGeneratedSeed(params: {
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

export function buildMapSeedMarkdown(form: MapFormState): string {
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

export function buildPropSeedMarkdown(form: PropFormState): string {
  const title =
    form.title.trim() ||
    form.description.trim().slice(0, 72) ||
    "Item handout";
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

export function mapPayloadForGeneration(
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

export function parseResponseBodyJson(
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

export async function fetchMapImageResult(
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

export async function fetchPropImageResult(payload: PropFormState): Promise<{
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

export const AUTO_IMAGE_CONCURRENCY = 2;

export async function mapWithConcurrency<T, R>(
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

export type StreamResult = { markdown: string; model: string | null; error: string | null };

/**
 * Heuristic for phones/tablets. Auto image generation makes several long
 * (often minute-plus) requests; mobile OSes drop those idle connections when
 * the screen locks or the browser backgrounds the tab, which surfaces as a
 * "load failure" right after the text result. We default that heavy work off
 * on mobile so the primary text result loads reliably (users can still opt in).
 */
export function isLikelyMobileDevice(): boolean {
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
export async function fetchMarkdownResultNonStreaming(
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

export async function fetchAdventureResultStream(
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

export async function fetchRealmResultStream(
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

export function firstHeading(md: string): string | null {
  const line = md
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return null;
  return line.replace(/^#\s+/, "").trim() || null;
}

export function buildSceneBattleMapPrompt(
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

export function buildAutoPropPayloadFromScene(
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

export function buildAutoMapContextFromAdventure(markdown: string, form: FormState): string {
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

export function buildAutoPropPayloadFromAdventure(
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
