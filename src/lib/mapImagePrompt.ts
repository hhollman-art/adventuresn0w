import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
} from "@/lib/openaiImagePrompt";

export type MapPackKind = "overland" | "battle" | "both";

export type MapImageInput = {
  mapKind: MapPackKind;
  locationName: string;
  levelRange: string;
  partySize: string;
  tone: string;
  context: string;
  gridNotes: string;
  extraNotes: string;
};

export type MapImageDetail = "medium" | "high";
export type MapImageSize = "1024x1024" | "1536x1024" | "1024x1536";

type MapVariant = "locale" | "battle";

export function buildMapImagePrompt(
  input: MapImageInput,
  variant: MapVariant,
): string {
  const mapTypeLine =
    variant === "locale"
      ? "Top-down overland or regional map in cartographic form: water, land cover, paths, and landmarks read like a field survey or atlas plate—not a landscape painting or scenic poster."
      : "Top-down tactical map as a clear floor plan: walls, doorways, columns, and cover read as line-and-symbol cartography; movement and blocked space are obvious, not hidden in art detail (no depictions of harm).";

  const locationName = clampImagePromptText(
    input.locationName || "Unnamed frontier site",
    200,
  );
  const levelRange = clampImagePromptText(input.levelRange, 40);
  const partySize = clampImagePromptText(input.partySize, 20);
  const tone = clampImagePromptText(input.tone, 500);
  const context = clampImagePromptText(
    input.context ||
      "(infer sensible encounter context from location and tone; keep descriptions PG-13 and non-graphic)",
    2500,
  );
  const gridNotes = clampImagePromptText(
    input.gridNotes || "5 ft square battle-map readability",
    400,
  );
  const extraNotes = clampImagePromptText(input.extraNotes || "(none)", 500);

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE fantasy map graphic for tabletop play. Prioritize cartography (clear symbols, line weights, and regions players can use) over illustration (no fine-art painting, dramatic lighting, or “concept art” scene).

${mapTypeLine}

Context:
- Location name: ${locationName}
- Party level band: ${levelRange}
- Party size: ${partySize}
- Tone / biome: ${tone}
- Adventure scene context: ${context}
- Grid/scale notes: ${gridNotes}
- Extra notes: ${extraNotes}

Rendering requirements:
- Top-down 2D orthographic map only (not isometric, not side view, not perspective illustration).
- Cartographic style: legible linework, simple fills or light hatching for terrain, conventional symbols for woods/rock/water/built work; avoid oil-paint texture, heavy atmosphere, or storybook art direction.
- Readability for play: distinct paths, rooms, and terrain categories; avoid “busy” painterly detail that obscures the grid and edges.
- Clear walkable vs blocked areas; cover and obstacles as simple shapes, not highly rendered set dressing.
- Square grid: clearly visible and regular for VTT (helper lines, not a decorative afterthought).
- No readable text, no watermark, no logos, no UI. Do not add room names, labels, or paragraphs on the image.
- PG-13; no graphic harm.
- Output only the image.`;
}
