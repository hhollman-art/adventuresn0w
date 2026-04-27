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
    "Country-scale: internal borders or marches, provinces, large forests and uplands, coasts and **principal ports** where the source implies them. **Rivers:** draw **main rivers** (and major named tributaries the source stresses) as **continuous blue courses**—show mouths, big bends, and confluences; **short river names** on-map where the text names them. **Major roads:** show a **legible network of primary routes** (royal highways, trade roads, pilgrimage spines)—**visibly stronger** than minor tracks; label **named passes, gates, or roads** from the source once each. **Landmarks:** use simple cartographic symbols for iconic peaks, ruins, battlefields, or holy sites the source highlights, with **short labels**. **Settlement labels:** capital, a few **principal** cities or ports, plus region names—prioritize what the source ties to travel and politics; not a gazetteer.",
  region:
    "Regional zoom: duchy or border march—relief, woods, and settlement pattern at readable scale. **Rivers:** map **main rivers** that cross or bound the area and **important streams** the source names—distinct blue linework; label **rivers, fords, and key crossings** that matter for play. **Roads:** show **major roads** linking **named** towns plus secondary links to keeps or border posts; **named bridges, passes, or toll gates** from the source get a label. **Landmarks:** castles, monasteries, quarries, standing stones, notorious ruins—small symbols with **short labels** for iconic sites. **Labels:** province or march name, **key** towns, fords, keeps, and geographic features the source emphasizes—legible, not crowded.",
  local:
    "Tightest zoom: valley or cluster of sites—**richest** geography and routes. **Rivers & water:** show **named** rivers and streams as a **branching network** (not one anonymous blue stroke); include marshes, mill pools, or falls if the source mentions them. **Roads:** clearly separate **main wagon roads** from lesser paths or trails; show how travel runs between labeled settlements; label **named bridges, ferries, fords, or gates**. **Landmarks:** barrows, watchtowers, border stones, abbey spires, hilltops—memorable spots from the source get **clear symbols and short labels**. **Labels:** **key and iconic** villages, ruins, woods, passes, and crossings in short hand-lettered text—many labels are fine only while the sheet stays readable; still a map, not prose on parchment.",
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
${
    input.realmSize === "country" ||
    input.realmSize === "region" ||
    input.realmSize === "local"
      ? `- **At this scope (country / region / local):** **Main rivers** must appear as **clear, continuous watercourses** with names from the source where given; **major roads** must form a **readable primary network** (stronger than footpaths), including **named passes, bridges, fords, or gates** when the source names them. **Landmarks** (peaks, ruins, seats of power, sacred sites) should be **drawn and labeled** when the source marks them as iconic—not only listed in a margin.\n`
      : ""
  }- Output only the image.`;

}
