import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
  MAP_BATTLE_GRAPH_PAPER_LOOK,
  MAP_CARTOGRAPHER_HAND_LOOK,
} from "@/lib/openaiImagePrompt";
import { stripRealmMarkdownForImage } from "@/lib/realmImagePrompt";
import { DEFAULT_BATTLE_GRID_NOTES_FALLBACK } from "@/lib/battleMapDirectives";

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
  /** Optional Library Markdown — geography, names, and layout hints from a saved generation. */
  libraryReferenceMarkdown?: string;
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
      : "Top-down tactical map as a **graph-paper-style floor diagram**: walls, doorways, columns, and cover read as **flat linework and simple symbols** for miniature battles—**not** a rendered scene or illustration (no depictions of harm).";

  const battleFramingBlock =
    variant === "battle"
      ? `
**Battle map scale (critical):**
- **5 ft × 5 ft lock:** orthogonal square grid only; **every cell = exactly 5 feet × 5 feet** (D&D-style tactical scale). **Uniform** cell size across the whole map—no irregular rhombuses, no perspective-foreshortened tiles, no mixed scales.
- **Tight zoom only:** show the **immediate encounter footprint**—usually **one to three connected play spaces** (rooms plus short halls, a modest clearing, one deck or roof section, a bridge span). **Do not** depict a whole building, dungeon level, village, forest, or battlefield unless the user’s context text explicitly demands that full extent.
- **Large-read squares:** compose so roughly **12–22 cells** (each **5×5 ft**) span the **shorter** image dimension. If squares look tiny or the layout reads like a site-wide blueprint, **crop tighter**—you are too zoomed out.
- **No distant “establishing” floorplans** where the action is a small zone; frame where PCs stand and roll initiative.`
      : "";

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
    input.gridNotes ||
      (variant === "battle"
        ? DEFAULT_BATTLE_GRID_NOTES_FALLBACK
        : "5 ft square battle-map readability where applicable"),
    400,
  );
  const extraNotes = clampImagePromptText(input.extraNotes || "(none)", 500);

  const refRaw = input.libraryReferenceMarkdown?.trim();
  const referenceBlock = refRaw
    ? `\n**Saved library reference (geography and names — align the map when compatible):**\nThe user attached text from this app’s **Library** (a saved realm, adventure, character sheet, or other run). Treat **named places, terrain, routes, architecture, and scale cues** as **authoritative** when they fit this map type. For a **locale / overland** image, favor regional layout and exterior geography; for a **battle** map, zoom to encounter-sensible rooms, chokepoints, or site interiors **without** contradicting names or relationships in the reference, and use a **uniform 5 ft × 5 ft** tactical square grid. If the reference implies a broader scope than this single map, **extract** only what belongs on this plate.\n\n---\n${clampImagePromptText(stripRealmMarkdownForImage(refRaw) || refRaw.slice(0, 4000), 4000)}\n---\n`
    : "";

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE fantasy map graphic for tabletop play.${variant === "battle" ? " **For this battle map:** treat the piece as a **functional diagram for miniatures**, not as decorative illustration—see rendering rules below." : ""} Prioritize cartography (clear symbols, line weights, and regions players can use) over illustration (no fine-art painting, dramatic lighting, or “concept art” scene).

${variant === "battle" ? MAP_BATTLE_GRAPH_PAPER_LOOK : MAP_CARTOGRAPHER_HAND_LOOK}

${mapTypeLine}
${battleFramingBlock}
${referenceBlock}
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
${variant === "battle"
    ? "- **Diagram / graph-paper energy:** ink on **light squared or plain drafting paper**; readable like a **measured plan for minis**, not concept art. Walls, pits, and furniture as **flat schematic shapes**."
    : "- Hand-made map appearance: as if from a surveyor or ship’s cartographer (quill, brush for flat tone)—not a digital matte painting, not an illustrated “scene.”"}
${variant === "battle"
    ? "- **Anti-illustration:** no cinematic lighting, cast shadows, volumetric glow, or painterly “set dressing.” **Flat symbols** for terrain; if color or wash appears, keep it **subtle** and **under** the grid—**mini placement always obvious**."
    : "- Cartographic style: legible linework, simple fills or light hatching for terrain, conventional symbols for woods/rock/water/built work; avoid oil-paint texture, heavy atmosphere, storybook art direction, or illustrative rendering that hides the grid."}
${variant === "battle"
    ? "- Readability for miniature battles: **every square** usable at a glance; no busy texture or decorative clutter in movement lanes."
    : "- Readability for play: distinct paths, rooms, and terrain categories; avoid “busy” painterly detail that obscures the grid and edges."}
- Clear walkable vs blocked areas; cover and obstacles as${variant === "battle" ? " **simple schematic** shapes—**never** fussy illustration that steals focus from the grid" : " simple shapes, not highly rendered set dressing"}.
- Square grid:${
    variant === "battle"
      ? " **5 × 5 ft cells** (see scale lock above). Lines in **near-black or deep brown ink**, **substantial pen weight**—clearly **thicker and darker** than wall hatches, terrain texture, or shadows; **not** washed out by overlays. Keep **walkable floor tones comparatively light** so the grid **dominates for gameplay**; extend grid lines **fully and orthogonally** across playable space where it makes sense. A player at the table must trace **every** cell edge without squinting—**gameplay legibility beats atmosphere**."
      : " clearly visible and regular where a grid belongs (helper lines, not a decorative afterthought)."
  }
- **Labels:** Add **short, legible cartographic text** (as if hand-lettered or small print on a real map) naming **key and iconic** areas—regions, major rooms, important doors, chokes, or landmarks that appear in the context above. **Each** room, path, or landmark **at most once**—no duplicate callouts, no name repeated with leader lines from two places, and no second label that duplicates the **title** (if a title line is used). Use only a **modest** number of labels so the map stays clear; do not cover the image in paragraphs or a legend block.
- No watermarks, no modern UI, no out-of-world meta text (no “FIGURE 1”, URLs, or app chrome). A small optional **title** line echoing the location name is fine.
- PG-13; no graphic harm.
- Output only the image.`;
}
