import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
  MAP_CARTOGRAPHER_HAND_LOOK,
} from "@/lib/openaiImagePrompt";
import { REALM_SIZE_LABEL, type RealmSize } from "@/lib/realmPrompt";

/** Flatten Markdown to plain text for image prompts (keep length down). */
export function stripRealmMarkdownForImage(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export type RealmImageInput = {
  realmSize: RealmSize;
  titleHint: string;
  /** Full or partial realm document in Markdown */
  realmMarkdown: string;
};

/**
 * Smaller chosen realm → richer map, with more on-map **labels** for key places; still not a full gazetteer or battlemat.
 * Larger → broader strokes, fewer fine features.
 */
export const REALM_MAP_DETAIL_BY_SIZE: Record<RealmSize, string> = {
  world:
    "Broad strategic map: ocean basins, continent-sized landmasses, a few great mountain belts and archipelagos. **Labels:** a **small** set of short names on the map for the most iconic seas, continents, or realm-scale regions (from the source text)—sparing, like a world chart.",
  continent:
    "Regional map: large terrain bands, major rivers and passes, hub points. **Labels:** name **key** regions, straits, or famous cities the source emphasizes—enough to orient, not every feature.",
  country:
    "Country-scale: provinces, roads, borders, forests, ports. **Labels:** principal regions, the capital or one other **iconic** city, and any critical geographic names from the source—clear, not a gazetteer.",
  region:
    "Regional zoom: duchy or border march—roads, woods, sites. **Labels:** the province or march name plus **key** towns, fords, keeps, or rivers named in the source that matter for play.",
  local:
    "Tightest zoom: valley, sites, short road network—most geographic detail here. **Labels:** name **key** and iconic local places from the source (village, ruin, wood, pass, etc.) in short hand-lettered text; many labels are OK only where they stay legible—still a map, not a novel on parchment.",
};

/**
 * In-margin **distance legend** (graphic scale bar) so the map reads as usable cartography, not a mood poster.
 * Units and bar length are tuned to the chosen realm size.
 */
export const REALM_MAP_SCALE_LEGEND_BY_SIZE: Record<RealmSize, string> = {
  world:
    "Include a **scale bar** in a free margin (e.g. lower edge): a short horizontal line with **tick marks** and a small printed-style label in **in-world** distance units (e.g. *thousands of miles* or a chart-scale great-circle band) that fits a world or plane chart. Keep it small, legible, and ink-on-parchment, like an atlas key.",
  continent:
    "Include a **scale bar** in a margin with ticks and a label in **hundreds of miles** or long **leagues** (fantasy-appropriate) matching a subcontinental or ocean-basin map.",
  country:
    "Include a **scale bar** in a corner margin with ticks and a clear label in **miles** or **leagues** for a single kingdom- or country-scale map.",
  region:
    "Include a **scale bar** in a margin labeled in **miles** (or a plausible regional unit) for a province, duchy, or march; short bar, mid-range distances.",
  local:
    "Include a **scale bar** in a margin labeled in **miles** (or a short local unit) for a valley, district, or cluster of sites; **short** bar, close-terrain scale.",
};

/**
 * Single top-down overview map of the realm. Detail scales inversely to chosen scope (local = richest).
 * Prompt avoids art-historical “style” direction; functional cartography + scope + source excerpt only.
 */
export function buildRealmCartographyImagePrompt(input: RealmImageInput): string {
  const { label, detail } = REALM_SIZE_LABEL[input.realmSize];
  const scope = clampImagePromptText(`${label}. ${detail}`, 400);
  const detailLine = REALM_MAP_DETAIL_BY_SIZE[input.realmSize];
  const scaleLegend = REALM_MAP_SCALE_LEGEND_BY_SIZE[input.realmSize];
  const title = clampImagePromptText(input.titleHint || "Unnamed realm", 120);
  const body = stripRealmMarkdownForImage(input.realmMarkdown);
  const excerpt = clampImagePromptText(body || input.realmMarkdown.slice(0, 500), 2800);

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE top-down **fantasy realm map** graphic (plan view, not isometric, not a landscape painting, not a minimap). Use clear map conventions: water, land, major terrain, routes or implied travel where relevant.

${MAP_CARTOGRAPHER_HAND_LOOK}

**Detail and labels (matches realm size—smaller scope allows more names on the art):**
${detailLine}

**Distance legend (required):**
${scaleLegend}

Overland realm map, not a battlemat floor plan. Not an illustrated “scene” map—**ink-on-scroll** clarity; labels are **short cartographic** names, not long prose. **No redundant labels** (one name per sea, range, or settlement on the art; optional small title in the margin must not be duplicated as an interior label of the same wording).

Geographic scope: ${scope}
Map title (optional, small, top margin or corner): ${title}

Source (geography, places, and names; ignore tone, story, or literary “style” if present). **Prefer labels drawn from names that appear here** for key or iconic areas:
${excerpt}

Hard requirements:
- Original fantasy geography; not copying real-world coastlines or modern maps.
- PG-13; no graphic violence or gore.
- **Include a graphic distance scale (scale bar) with labeled units** in a margin, as above—an atlas / chart convention, not a modern GPS or app UI.
- **Include text on the map** for **key and iconic** places as above—**each** named **once**; no watermarks, no modern UI, no URLs, no out-of-world meta captions.
- Output only the image.`;

}
