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
      ? "Top-down overland / locale map focused on navigation, terrain identity, and landmarks."
      : "Top-down tactical battle map focused on movement lanes, cover, and readable floor spaces (no depictions of harm).";

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

Create ONE high-detail fantasy map image for tabletop play.

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
- Top-down 2D map (not isometric, not side view).
- Highly detailed terrain dressing, paths, elevation cues, and environmental storytelling.
- Clear walkable/readable spaces for movement.
- Include a subtle but visible square grid suitable for VTT use.
- No text labels, no watermark, no logos, no UI overlays.
- Keep style consistent with classic painted fantasy tabletop map art (PG-13).
- Output only the image.`;
}
