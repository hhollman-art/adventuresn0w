import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
  MAP_BATTLE_GRAPH_PAPER_LOOK,
  MAP_BATTLE_NO_GRID_LOOK,
  MAP_LOCALE_COLOR_ATLAS_LOOK,
} from "@/lib/openaiImagePrompt";
import { stripRealmMarkdownForImage } from "@/lib/realmImagePrompt";
import { DEFAULT_BATTLE_GRID_NOTES_FALLBACK, DEFAULT_BATTLE_GRID_NOTES_FALLBACK_METRIC } from "@/lib/battleMapDirectives";
import {
  type MapDistanceUnits,
  mapDistanceUnitsPromptBlock,
  parseMapDistanceUnits,
} from "@/lib/mapDistanceUnits";

export type MapPackKind = "overland" | "battle" | "both";

export type MapImageInput = {
  mapKind: MapPackKind;
  /** Distance units for scale bars and tactical grid; default imperial. */
  mapDistanceUnits?: MapDistanceUnits;
  locationName: string;
  levelRange: string;
  partySize: string;
  tone: string;
  context: string;
  gridNotes: string;
  extraNotes: string;
  /** Exact VTT grid columns for battle maps (optional). */
  battleGridCols?: number;
  /** Exact VTT grid rows for battle maps (optional). */
  battleGridRows?: number;
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
  const units = parseMapDistanceUnits(input.mapDistanceUnits);
  const includeGridLines = false;
  const mapTypeLine =
    variant === "locale"
      ? "Top-down overland or **world-scale** map as a **rich illustrated atlas plate**: **detailed** geography—relief, biomes, hydrology, routes, and settlements—combining **reference-map clarity** with **ornate, worked cartographic art** (not an empty flat infographic, not a sideways landscape poster)."
      : "Top-down tactical map as an **illustrated battle diagram**: **grid-true** walls, doorways, cover, and terrain with **rich floor and environment rendering** for atmosphere—**still** orthographic plan view for miniatures (no depictions of harm, no isometric hero shots).";

  const localeWorldBlock =
    variant === "locale"
      ? `
**Locale / world map structure (critical):**
- **Color required:** full-color land and water; avoid monochrome parchment-only treatment for this plate.
- **Readable geography:** each landmass and major island group must have a **clear silhouette**; fix ambiguous “all one tan smear” compositions.
- **Ocean gaps, not one supercontinent:** for **world-scale** maps, default to **several major landmasses** separated by **wide open ocean** unless the user context demands a single connected land or a specific bridge/isthmus. **Do not** merge every continent into one continuous coastline “for drama.” Archipelagos and island chains **sit in blue water** between larger masses.
- **Typographic legibility:** use **clean atlas-style type**—**sans-serif or simple neutral letters** (see style block: **no** blackletter, fantasy script, or decorative medieval faces). Lettering must be **high-contrast** (dark on pale land/water or on a **simple flat backing**); **avoid whisper-thin or microscopic** type; prefer **one-line** names and **short** on-map text; **space** labels away from neighbors; when in doubt, **enlarge** one step. If a label sits on noisy terrain, use a **small halo or strip** so it stays readable from tabletop distance.
- **Countries within continents:** where scope is **world or multi-realm**, draw **closed international borders** so each **country/kingdom** is a **bounded territory** (not a vague colorwash). **Place multiple settlements inside each country**—at minimum a **capital (star)** and **2–4 other cities or towns** (dots) with **clear, name-sized** type—**symbols must be bold and large enough** that city labels can sit **beside** them (short leader ok). Do not leave entire nations as one anonymous blob.
- **Label hierarchy + category styling (must be obvious and varied):** **Continent / ocean names** = **largest** (often **all-caps** along the feature). **Country or kingdom names** = **medium**, **title case**, **inside borders**—**never** same treatment as continents. **City / port names** = smaller, **next to distinct symbols** (star vs filled dot vs port mark). **Mountain ranges / big forests** = lettering **along** the feature (often **small-caps** along spine). **Rivers** = **italic or lighter** along the course. **Routes** = **short labels on or beside the route line** in **italic or slanted** type (or distinct color from place names)—**not** the same style as city ovals.
- **Hydrology:** show **oceans vs named seas/bays** with **differentiated blues**; include **large lakes and inland seas** as **enclosed blue polygons** with labels when the context supplies names.
- **Human geography:** mark **capital(s)** with a **star** + label; mark **major cities / trade ports** with **clear, differentiated** symbols + labels. Infer or place a **sensible network** if the brief is sparse.
- **Routes:** **primary roads and major overland trade corridors** plus **important sea lanes or narrows** must appear as **obvious linework**; **each** primary corridor needs a **readable route name or short descriptor** (from context or plausible fantasy)—players should see **named arteries**, not only nameless red lines.
- **Terrain richness:** fill continents and regions with **visible illustrative detail**—shaded relief, vegetation, deserts, ice, wetlands, uplands, and coastal shallows—so every major zone feels **worked and specific**; avoid **blank** monochromatic interiors when the context allows variety.
- **Still readable geography:** detail must **support** the map—**coasts, borders, cities, and routes** stay **decodeable**; do not let texture **erase** where land ends or where a kingdom boundary runs.
`
      : "";

  const battleCellLock = includeGridLines
    ? units === "metric"
      ? "**1.5 m × 1.5 m lock:** orthogonal square grid only; **every cell = exactly 1.5 meters × 1.5 meters** (typical D&D-style metric tactical scale). **Uniform** cell size across the whole map—no irregular rhombuses, no perspective-foreshortened tiles, no mixed scales."
      : "**5 ft × 5 ft lock:** orthogonal square grid only; **every cell = exactly 5 feet × 5 feet** (D&D-style tactical scale). **Uniform** cell size across the whole map—no irregular rhombuses, no perspective-foreshortened tiles, no mixed scales."
    : units === "metric"
      ? "**Tactical scale (no printed grid):** compose at **1.5 m × 1.5 m** logical square scale for miniature play, but **do not draw grid lines, graph paper, or cell borders** on the art."
      : "**Tactical scale (no printed grid):** compose at **5 ft × 5 ft** logical square scale for miniature play, but **do not draw grid lines, graph paper, or cell borders** on the art.";

  const battleCellDim = units === "metric" ? "**1.5×1.5 m**" : "**5×5 ft**";

  const vttCols =
    typeof input.battleGridCols === "number" && input.battleGridCols >= 4
      ? Math.round(input.battleGridCols)
      : null;
  const vttRows =
    typeof input.battleGridRows === "number" && input.battleGridRows >= 4
      ? Math.round(input.battleGridRows)
      : null;
  const hasVttGrid = variant === "battle" && vttCols !== null && vttRows !== null;

  const battleGridSizeLine = hasVttGrid
    ? includeGridLines
      ? `- **Exact VTT grid:** the image must show **exactly ${vttCols} columns × ${vttRows} rows** of ${battleCellDim} squares, filling the frame edge to edge. **No** partial squares, cropped grid, or decorative margin outside the grid.`
      : `- **Exact VTT framing:** compose the encounter to fill the frame as if **${vttCols} columns × ${vttRows} rows** of ${battleCellDim} squares—but **draw no grid lines**; clean illustrated floor art only.`
    : `- **Large-read squares:** compose so roughly **12–22 cells** (each ${battleCellDim}) span the **shorter** image dimension. If squares look tiny or the layout reads like a site-wide blueprint, **crop tighter**—you are too zoomed out.`;

  const battleFramingBlock =
    variant === "battle"
      ? `
**Battle map scale (critical):**
- ${battleCellLock}
- **Tight zoom only:** show the **immediate encounter footprint**—usually **one to three connected play spaces** (rooms plus short halls, a modest clearing, one deck or roof section, a bridge span). **Do not** depict a whole building, dungeon level, village, forest, or battlefield unless the user’s context text explicitly demands that full extent.
${battleGridSizeLine}
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
        ? units === "metric"
          ? DEFAULT_BATTLE_GRID_NOTES_FALLBACK_METRIC
          : DEFAULT_BATTLE_GRID_NOTES_FALLBACK
        : "5 ft square battle-map readability where applicable"),
    400,
  );
  const extraNotes = clampImagePromptText(input.extraNotes || "(none)", 500);

  const refRaw = input.libraryReferenceMarkdown?.trim();
  const refGrid =
    variant === "battle"
      ? includeGridLines
        ? units === "metric"
          ? "a **uniform 1.5 m × 1.5 m** tactical square grid"
          : "a **uniform 5 ft × 5 ft** tactical square grid"
        : units === "metric"
          ? "**1.5 m × 1.5 m** tactical scale **without** printed grid lines"
          : "**5 ft × 5 ft** tactical scale **without** printed grid lines"
      : "the **locale / world** cartographic rules above";
  const referenceBlock = refRaw
    ? `\n**Saved library reference (geography and names — align the map when compatible):**\nThe user attached text from this app’s **Library** (a saved realm, adventure, character sheet, or other run). Treat **named places, terrain, routes, architecture, and scale cues** as **authoritative** when they fit this map type. For a **locale / overland** image, favor regional layout and exterior geography; for a **battle** map, zoom to encounter-sensible rooms, chokepoints, or site interiors **without** contradicting names or relationships in the reference, and use ${refGrid}. If the reference implies a broader scope than this single map, **extract** only what belongs on this plate.\n\n---\n${clampImagePromptText(stripRealmMarkdownForImage(refRaw) || refRaw.slice(0, 4000), 4000)}\n---\n`
    : "";

  const battleLook =
    variant === "battle"
      ? includeGridLines
        ? MAP_BATTLE_GRAPH_PAPER_LOOK
        : MAP_BATTLE_NO_GRID_LOOK
      : MAP_LOCALE_COLOR_ATLAS_LOOK;

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE fantasy map graphic for tabletop play.${
    variant === "battle"
      ? includeGridLines
        ? " **For this battle map:** **diagram-first** for squares and walls, but **illustrate** floors, rubble, water, and props richly—see rendering rules below."
        : " **For this battle map:** **illustrated floor plan without a printed grid**—walls, terrain, and props only; a VTT adds the grid at the table."
      : " **For this locale/world map:** **rich illustrative atlas**—abundant terrain and hydrology detail with **legible** labels and borders—see rendering rules below."
  } Balance **usable cartography** (symbols, routes, political lines) with **generous illustrative depth**—avoid **empty** undifferentiated color fields except intentional open ocean or plains.

Prioritize **both** table utility **and** visual richness: coasts, borders, and label text must stay clear; **plain flat emptiness** is **not** the goal.

${battleLook}

${mapTypeLine}
${localeWorldBlock}
${battleFramingBlock}
${mapDistanceUnitsPromptBlock(variant, units)}
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
    ? includeGridLines
      ? "- **Illustrated diagram:** ink and color on **light squared paper**; **rich** floor and terrain treatment welcome—**stone, wood, earth, water, debris**—as long as **walls** and **walkable vs blocked** remain obvious and the grid **reads first**."
      : "- **Illustrated floor plan:** rich **stone, wood, earth, water, debris**—**no graph-paper squares or cell borders**; walls and walkable space must stay obvious for an overlaid virtual grid."
    : "- **Illustrative atlas rendering:** **full color**, **layered terrain illustration**—relief, forests, deserts, ice, shallows, ornament—like a **finished fantasy chart** players want to study, **not** a muddy concept-art panorama or sideways landscape."}
${variant === "battle"
    ? includeGridLines
      ? "- **Depth without confusion:** mild tonal shading, material variation, and props are welcome—**no** heavy cast shadows or perspective tricks that break the grid; **mini placement always obvious**."
      : "- **Depth without confusion:** mild tonal shading and props welcome—**no** heavy cast shadows; **no printed grid lines** anywhere on the art."
    : "- **Coasts and borders stay sharp:** illustrative paint is welcome on land and sea—**avoid** smears that erase where land meets water or where realms divide. **Oceans, seas, and large lakes** stay **visibly distinct** (hue, shelf tint, outlines) under the art layer."}
${variant === "battle"
    ? includeGridLines
      ? "- Readability for miniature battles: **every square** usable at a glance; no busy texture or decorative clutter in movement lanes."
      : "- Readability for miniature battles: **clear walkable lanes and doorways** without a printed grid; avoid clutter that hides walls or pits."
    : "- Readability for travel: **capitals**, **major cities**, and **labeled primary trade routes** must be **visible**, not omitted or hidden in art noise—**route names** should read as clearly as major cities."}
- Clear walkable vs blocked areas; cover and obstacles as${variant === "battle" ? " **readable top-down** shapes—illustrated texture ok **inside** rooms and corridors **if** chokepoints stay obvious" : " **illustrated** geography—terrain **painted** with readable silhouettes, not hyper-real boulders that hide borders"}.
- Square grid:${
    variant === "battle"
      ? includeGridLines
        ? units === "metric"
          ? " **1.5 × 1.5 m cells** (see scale lock above). Lines in **near-black or deep brown ink**, **substantial pen weight**—clearly **thicker and darker** than wall hatches, terrain texture, or shadows; **not** washed out by overlays. Keep **walkable floor tones comparatively light** so the grid **dominates for gameplay**; extend grid lines **fully and orthogonally** across playable space where it makes sense. A player at the table must trace **every** cell edge without squinting—**gameplay legibility beats atmosphere**."
          : " **5 × 5 ft cells** (see scale lock above). Lines in **near-black or deep brown ink**, **substantial pen weight**—clearly **thicker and darker** than wall hatches, terrain texture, or shadows; **not** washed out by overlays. Keep **walkable floor tones comparatively light** so the grid **dominates for gameplay**; extend grid lines **fully and orthogonally** across playable space where it makes sense. A player at the table must trace **every** cell edge without squinting—**gameplay legibility beats atmosphere**."
        : " **No visible grid lines.** Do **not** add graph-paper squares, cell borders, drafting grid, or squared-paper background. The virtual tabletop overlays the grid at play time—keep floors clean enough for that overlay."
      : " clearly visible and regular where a grid belongs (helper lines, not a decorative afterthought)."
  }
- **Labels:** Add **short, high-contrast** cartographic text in **plain readable sans / simple print**—**tidy** placement, **minimal** ornament on callout backs. Name **key and iconic** areas—${
    variant === "locale"
      ? "**seas, continents or regions, countries, capitals, major cities, straits, mountain ranges, rivers, and primary trade routes or sea lanes** from the context; **vary label treatment by category** (see hierarchy above); **each** feature **at most once**; **abbreviate** long names if needed for a **clean** line"
      : "regions, major rooms, important doors, chokes, or landmarks that appear in the context above. **Each** room, path, or landmark **at most once**"
  }—no duplicate callouts, no name repeated with leader lines from two places, and no second label that duplicates the **title** (if a title line is used). Use only a **modest** number of labels so the map stays clear; do not cover the image in paragraphs or a legend block.
- No watermarks, no modern UI, no out-of-world meta text (no “FIGURE 1”, URLs, or app chrome). A small optional **title** line echoing the location name is fine.
- PG-13; no graphic harm.
- Output only the image.`;
}
