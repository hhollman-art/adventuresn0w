import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
  MAP_LOCALE_COLOR_ATLAS_LOOK,
} from "@/lib/openaiImagePrompt";
import {
  type MapDistanceUnits,
  parseMapDistanceUnits,
  realmScaleLegendForSize,
} from "@/lib/mapDistanceUnits";
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
  /** Scale bar: miles/leagues vs km; default imperial. */
  mapDistanceUnits?: MapDistanceUnits;
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
    "Broad strategic **full-color atlas** map: **distinct** ocean basins and **multiple separate** continent-scale landmasses with **real ocean between** them—**not** one merged supercontinent unless text demands it; archipelagos sit in blue gaps, **not** as glue connecting every shore. Show **deep ocean vs marginal seas** with **two or more blues/teals** and **labeled** iconic seas or straits from the source. **Large lakes and inland seas** as **closed blue shapes** with labels when named. **Typography:** **clean sans-serif atlas lettering** (school-map / OSM clarity)—**not** blackletter or decorative script; **dark, substantial** strokes; use **halos or pale strips** behind names on busy terrain—**no** microscopic gray labels; **slightly oversize** text is better than too small. **International borders:** draw **closed boundary lines** around each **country/kingdom** so territories read as **distinct polygons**, not soft gradients. **Cities per country:** inside **each** country show **one capital (star)** plus **several** additional **cities/towns** with **clear symbols** (different shapes for capital vs port vs inland town) and **readable** labels—avoid empty nations. **Primary trade routes and maritime lanes** as **bold** brown/red/umber lines with **on-line route labels** (road name, lane name, or short descriptor) in **italic/slanted** style **distinct from** city names. **Label variety:** oceans (largest caps), continents (large along land), countries (medium title case inside borders), cities (smallest beside symbols), rivers **italic along course**, ranges along spines. **Political borders** (dashed/solid) between powers. **Labels:** curated from the source—oceans, continents, countries, capitals, ranges, key routes.",
  continent:
    "Regional **color atlas** map: **sharp coastlines** and terrain bands—landmasses must not smear together; where multiple big masses appear, keep **navigable water or clear breaks** between them unless the source says otherwise. **Ocean vs gulfs/bays/seas** clearly different blues; **named large lakes** as distinct water polygons. **Typography** as on world maps—**plain sans / simple print** only, high-contrast, **no hairline type**. **National/regional borders** where the source implies more than one polity. **Capitals and major cities** with **bold, differentiated** symbols and **offset** city labels if needed. **Country vs continent labeling:** country/kingdom names **smaller and inside** their territory—never styled like ocean/continent names. **Principal roads, trade routes, and caravan spines** as **strong linework** with **readable route labels** (distinct style from settlement names). **Narrow straits and ferry-worthy crossings** readable. **Labels:** regions, countries, key cities, seas, passes, and **named routes** from the source.",
  country:
    "Country-scale: internal borders or marches, provinces, large forests and uplands, coasts and **principal ports** where the source implies them. **Typography:** **sans-style or simple print only**—maintain **strong contrast** and varied styles—**rivers italic** along the watercourse, **route names** italic or slanted **along roads**, **settlements** clear mixed case beside **obvious** symbols. **Rivers:** draw **main rivers** (and major named tributaries the source stresses) as **continuous blue courses**—show mouths, big bends, and confluences; **short river names** on-map where the text names them. **Major roads:** show a **legible network of primary routes** (royal highways, trade roads, pilgrimage spines)—**visibly stronger** than minor tracks; **label each primary route** with a **short name** where the source supplies one or a plausible fantasy name; label **named passes, gates, or roads** from the source once each. **Landmarks:** use simple cartographic symbols for iconic peaks, ruins, battlefields, or holy sites the source highlights, with **short labels** in a **compact caps or small label** style distinct from city names. **Settlement labels:** capital, a few **principal** cities or ports, plus region names—prioritize what the source ties to travel and politics; not a gazetteer.",
  region:
    "Regional zoom: duchy or border march—relief, woods, and settlement pattern at readable scale. **Typography:** **plain readable sans**; high-contrast labels; **routes** labeled along the line **differently** from **town** names. **Rivers:** map **main rivers** that cross or bound the area and **important streams** the source names—distinct blue linework; **italic** names along rivers where space allows; label **rivers, fords, and key crossings** that matter for play. **Roads:** show **major roads** linking **named** towns plus secondary links to keeps or border posts; **label named caravan roads or river crossings** on or beside the line; **named bridges, passes, or toll gates** from the source get a label. **Landmarks:** castles, monasteries, quarries, standing stones, notorious ruins—small symbols with **short labels** for iconic sites. **Labels:** province or march name, **key** towns, fords, keeps, and geographic features the source emphasizes—legible, not crowded.",
  city:
    "City-scale **plan or quarter map**: **walls, gates, harbor or river docks**, and **named districts or wards** at readable scale. **Typography:** **plain sans**, **high-contrast**; **district names** inside blocks; **landmarks** (keep, temple, market square, guild hall) with **distinct symbols**. **Streets:** show **major avenues and market streets** as clear linework—lighter alleys optional; label **iconic roads or bridges** from the source. **Water:** **harbor, river docks, canals** as distinct blue; label **ferries or wharves** if named. **Labels:** city name, **key districts**, **notable buildings**, gates, and **1–2 nearby landmarks** outside the walls if the source mentions them—urban density, still readable.",
  local:
    "Tightest zoom: valley or cluster of sites—**richest** geography and routes. **Typography:** **clean simple letters** (atlas / plan style)—keep **bold, readable** type; **water names italic**, **roads** with **small route labels** distinct from hamlet names. **Rivers & water:** show **named** rivers and streams as a **branching network** (not one anonymous blue stroke); include marshes, mill pools, or falls if the source mentions them. **Roads:** clearly separate **main wagon roads** from lesser paths or trails; show how travel runs between labeled settlements; **name** main roads on the map where the source implies it; label **named bridges, ferries, fords, or gates**. **Landmarks:** barrows, watchtowers, border stones, abbey spires, hilltops—memorable spots from the source get **clear symbols and short labels**. **Labels:** **key and iconic** villages, ruins, woods, passes, and crossings in short atlas-style text—many labels are fine only while the sheet stays readable; still a map, not prose on parchment.",
};

/**
 * Single top-down overview map of the realm. Detail scales inversely to chosen scope (local = richest).
 * Prompt avoids art-historical “style” direction; functional cartography + scope + source excerpt only.
 */
export function buildRealmCartographyImagePrompt(input: RealmImageInput): string {
  const units = parseMapDistanceUnits(input.mapDistanceUnits);
  const { label, detail } = REALM_SIZE_LABEL[input.realmSize];
  const scope = clampImagePromptText(`${label}. ${detail}`, 400);
  const detailLine = REALM_MAP_DETAIL_BY_SIZE[input.realmSize];
  const scaleLegend = realmScaleLegendForSize(input.realmSize, units);
  const title = clampImagePromptText(input.titleHint || "Unnamed realm", 120);
  const body = stripRealmMarkdownForImage(input.realmMarkdown);
  const excerpt = clampImagePromptText(body || input.realmMarkdown.slice(0, 500), 2800);

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE top-down **fantasy realm map** graphic (plan view, not isometric, not a sideways landscape painting, not a minimap). **Full-color illustrative atlas**—**rich terrain and hydrology** with clear water, land, borders, settlements, and routes (see style block).

${MAP_LOCALE_COLOR_ATLAS_LOOK}

**Detail and labels (matches realm size—smaller scope allows more names on the art):**
${detailLine}

**Distance legend (required):**
${scaleLegend}

Overland realm map, not a battlemat floor plan. **Illustrative depth required:** **shaded relief**, biome texture, and **worked coasts**—the sheet should feel like a **finished fantasy map**, not a bare political outline—but **keep** **readable coasts**, **labeled hydrology**, **cities and routes** visible. **Scale bar** must be a **clean margin graphic** (high-contrast bar + **plain sans** numbers). **Text must be easy to read:** **plain sans-style atlas fonts** (no ornate fantasy typefaces); dark ink, adequate weight, **simple** halos when needed—**not** tiny gray lettering. **Labels** use **varied cartographic roles** (oceans vs countries vs cities vs rivers vs routes—see detail block), not one uniform font for everything; **short, tidy** names beat crowded prose. Labels are **short cartographic** names, not long prose. **No redundant labels** (one name per sea, range, or settlement on the art; optional small title in the margin must not be duplicated as an interior label of the same wording).

Geographic scope: ${scope}
Map title (optional, small, top margin or corner): ${title}

Source (geography, places, and names; ignore tone, story, or literary “style” if present). **Prefer labels drawn from names that appear here** for key or iconic areas:
${excerpt}

Hard requirements:
- Original fantasy geography; not copying real-world coastlines or modern maps.
- PG-13; no graphic violence or gore.
- **Full color:** land and water must be **color-coded** (not monochrome parchment art); **oceans, seas, and large lakes** must be **distinguishable** by hue/outline.
- **Illustrative terrain:** include **rich top-down detail**—relief, vegetation, climate bands, shallows, and regional texture—so the map feels **crafted**; avoid **large empty flat** interiors unless the source is literally open ocean or barren flats.
- **Geography legibility:** adjacent continents or large regions must **not** visually merge—use **clear shorelines**, border lines, or color breaks. **World-scale:** prefer **multiple continents** separated by **open ocean**—do **not** default to one **supercontinent** with everything connected unless the source implies that geography.
- **At world or continent scope:** **closed borders** around distinct **countries**; **several cities per country** (not one per landmass); **country names** must read **differently** from **continent names** (size/style—see detail block); show **capital(s)** and **major cities** with **bold, distinct** symbols + **readable** labels; **major trade or travel routes** as obvious linework with **on-route labels** (italic/slanted or color distinct from city names).
- **Include a graphic distance scale (scale bar) with labeled units** in a margin, as above—**clean technical style:** **horizontal** bar, **bold** ticks, **pale margin** behind it, numerals and unit in **footer-large plain sans** (**no** faint micro-type, **no** decorative frame)—atlas convention, not GPS or app UI.
- **Include text on the map** for **key and iconic** places as above—**each** named **once**; **short, clean** letterforms; no watermarks, no modern UI, no URLs, no out-of-world meta captions.
${
    input.realmSize === "country" ||
    input.realmSize === "region" ||
    input.realmSize === "city" ||
    input.realmSize === "local"
      ? `- **At this scope (country / region / city / local):** **Main rivers** must appear as **clear, continuous watercourses** with names from the source where given; **major roads** must form a **readable primary network** (stronger than footpaths), including **named passes, bridges, fords, or gates** when the source names them. **Landmarks** (peaks, ruins, seats of power, sacred sites) should be **drawn and labeled** when the source marks them as iconic—not only listed in a margin.\n`
      : ""
  }
- Output only the image.`;

}
