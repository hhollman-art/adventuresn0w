/**
 * OpenAI image models apply a safety filter to prompts and outputs.
 * We prepend a clear content policy and clamp user-provided text to reduce
 * false rejections when adventure prose is pasted into map/prop prompts.
 */

export const IMAGE_PROMPT_SAFETY_PREAMBLE =
  "Policy-aligned output: stylized illustrated fantasy art for a tabletop roleplaying game " +
  "(painted / digital illustration, not photorealistic). " +
  "Show only environments, architecture, terrain, readable props, symbols, or abstract marks. " +
  "Do not depict graphic violence, gore, wounded or suffering people or animals, cruelty, " +
  "sexual content, hate symbols, or real-world identifiable people. ";

/**
 * For map image prompts: battle maps use grid-first illustrated tactical plans; locale/overland maps use illustrative atlas style
 * (`MAP_LOCALE_COLOR_ATLAS_LOOK`). `MAP_CARTOGRAPHER_HAND_LOOK` remains for legacy/prop contexts that need parchment tone.
 */
export const MAP_CARTOGRAPHER_HAND_LOOK =
  "Look and media: the image must read as a cartographer’s hand-drawn map—quill or pen line on parchment, laid paper, or an unrolled scroll—not a poster, landscape painting, concept-art scene, or glossy illustration. " +
  "Favor iron-gall/ink line, controlled cross-hatch, stipple, and flat or nearly flat tone; avoid airbrush, cinematic lighting, 3D-render gloss, or thick painterly impasto. " +
  "It should feel as if the map were inked for use at a table: clear cartographic marks, not a picture you hang for mood. " +
  "Short inked or printed-style **labels** for important places belong on a working map—keep them few and legible, not a wall of text. " +
  "**Avoid redundant labeling:** name each place or feature **at most once** on the map; do not repeat the same name in multiple callouts, do not place the map title and an identical near-title label, and do not use two labels for the same landmark (e.g. full name + nickname pointing to the same spot).";

/**
 * Locale / world / overland maps: illustrative atlas depth + reference-map readability.
 */
export const MAP_LOCALE_COLOR_ATLAS_LOOK =
  "Locale & world map **look (critical):** render as a **rich, full-color illustrated fantasy atlas**—**highly detailed cartographic art** in the spirit of a **premium hand-painted wall map or illustrated gazetteer plate**: **inventive terrain**, **ornate linework where helpful**, and **layered color** so the sheet feels **specific and lived-in**, not a flat paste of solid blobs. **Illustrative depth is required:** land must show **noticeable physical and ecological detail**—**soft shaded relief** or hill-shading, **forest mass**, **steppe/scrub/sand textures**, **snow or barrens**, **wetlands**, **ridges and canyons**, **reefs and shelf tint** in shallow seas, **river valleys**, and (at suitable scales) **hints of fields, terraces, or coastwise settlement tone**—always in **top-down plan view**. **Water** gains **depth striation**, **current hints**, or **shallow/deep hue steps** so seas feel dimensional. **Still a map, not a movie shot:** orthographic **top-down** plate—**no horizon, no sky**, no **sideways landscape** composition—but **painterly cartographic rendering**, **cross-hatch**, **stipple**, and **rich illustrative texture** on land and sea are **strongly encouraged** as long as **coastlines, borders, symbols, and labels** stay **decodeable**. **Avoid only** effects that **destroy legibility:** **obscuring cloud/fog decks**, **smearing gradients** that merge separate landmasses into one mud-patch, or **chaotic fine noise** the same scale as city dots. " +
  "**Separate landmasses (do not default to one supercontinent):** at **world or multi-realm** scale, show **multiple major landmasses separated by open ocean**—typically **two to six** big continents or comparable island arcs with **real blue gaps** between them—**not** one wrinkled tan megaland where every shore touches. Use **narrow isthmuses, chains, or land bridges** only when the context clearly implies them; **do not** stitch all continents together “for composition.” Large islands and archipelagos may sit **between** continents, not as glue that erases ocean. " +
  "**Fonts / letterforms (critical):** use **plain, modern reference-map lettering**—the kind on **printed school atlases, OpenStreetMap-style plates, or airline route maps**: **clean sans-serif** or **simple neutral humanist** characters with **open counters** (round, legible **a e o s**), **even stroke width**, and **generous letter-spacing** on long names. **Do not** use blackletter, gothic, heavy medieval script, curling fantasy script, highly decorative initials, or “arcane” squiggly type—readability beats flavor. **Do not** distort, arc, or squeeze type so tightly that letters touch or blur. " +
  "**Typography / readability (critical):** all place and route text must be **easy to read at a glance**—**near-black or deep brown** ink, **substantial stroke weight** (no thin hairline lettering); **never** tiny gray-on-gray microtype; err **slightly large** rather than **small** for every label tier. **Clean placement:** prefer **one straight baseline** per name; **do not** crush or stack letters; leave **breathing room** between a label and the next feature; **short on-map names** beat long official titles—abbreviate if needed for clarity. Where labels cross busy terrain or sea, use a **short thin halo, light cartouche, or pale backing strip** so letters stay crisp—keep the backing **simple** (flat pill or rectangle), not busy ornament. **Capitals** may use a **small bold or small-caps** treatment; **cities/towns** use **clear mixed case** with **symbols large enough** that the dot/star and name don’t overlap as an unreadable blob—**offset** the text or a **short leader** if needed. " +
  "**Label variety by category (must look different, not one font for everything):** same **clear sans / atlas** family throughout—vary **size, weight, and italics only**; **oceans / large seas** → **largest** type, often **all-caps** arched along water; **continents / large regions** → **large** caps or small-caps, often on a **slight curve** along the landmass; **countries / kingdoms** → **medium title case** centered **inside** closed borders (never same size as continents); **cities / ports** → **smaller** beside **bold, clear** star/dot/square symbols; **mountain ranges** → **compact lettering along the ridge spine**; **rivers** → **italic or lighter weight** following the watercourse; **straits, channels, passes** → **tight caps** at the choke. " +
  "**Water hierarchy (color + edges):** **open ocean** in a **deeper blue**; **seas, bays, and gulfs** as **clearer mid blues or teals** with **short labels** when named in context; **large lakes and inland seas** as **lighter blues**, **closed outlines** so they read as **water bodies**, not terrain shadow. " +
  "**Borders:** show **political or realm borders** (solid or dashed) where the text implies multiple powers—borders must be **legible**, not implied only by vague shading. " +
  "**Settlements:** place a **capital** (or capitals) named in the source with a **star or crowned dot** symbol and label; add **major cities and principal ports** as **distinct symbols** (e.g. filled disk for inland city, open square or anchor mark for port) + **short names**—if the source is thin, still include **plausible major hubs** and trade cities consistent with the geography. " +
  "**Countries on world maps:** show **closed borders** around each **kingdom or nation**; **scatter multiple city symbols inside** each country—not one city per landmass. " +
  "**Routes + route labels (critical):** draw **major trade roads, caravan corridors, and principal sea lanes** as **bold reddish-brown, umber, or dark linework** (heavier than background texture); thinner lines for secondary tracks. **Every** primary trade corridor and **named or inferable** main sea lane must carry a **short, clean route label** on or beside the line—prefer **2–4 words** or a **compact** name (e.g. “**East Trade Road**,” “**North Strait Lane**”)—**not** a long sentence; **slanted/italic** or **slightly different color** from city names. The travel network must be **obvious for gameplay**. " +
  "**Scale bar / distance legend (critical):** in a **clear margin** (not over busy map), draw **one** **horizontal graphic scale**—**simple engineering style**, not decoration: **bold dark** bar shaft and **obvious tick marks**, sitting on a **pale neutral or white strip** so it **separates** from terrain. Numerals and the unit word (**km**, **mi**, **Mm**, **leagues**, etc.) use the **same plain sans** as map labels—**footer-sized**, **high contrast**, **one tidy row**; **no** hairline ticks, **no** faint gray-only bar, **no** miniature numbers, **no** ornate scroll frame, **no** compass rose overlapping the bar. Use **2–4** labeled divisions for the chosen span (world maps may use **exponential** friendly ticks like 0 / 500 / 1000 **km**). The bar must stay **legible at small preview size**. " +
  "Short map-style **labels** only (same non-redundant naming rules as other maps).";

/**
 * Battle maps: grid-forward illustrated tactical plans—rich detail without losing playability.
 */
export const MAP_BATTLE_GRAPH_PAPER_LOOK =
  "Battle map **look (critical):** render as an **illustrated tactical floor diagram**—**squared or drafting-paper base** with a **measured plan** for **miniatures**, **plus** **generous illustrative detail**: **painted or inked floor materials** (flagstone, plank, packed earth, tile), **rubble and debris**, **pools or streams**, **roots and undergrowth**, **furniture and prop silhouettes**, **carved stonework**, **braziers or light sources as flat top-down glyphs**—all **read from above**, **not** an isometric scene. Think **beautifully worked VTT / battlemat art**: the **grid and wall edges remain the spine** of the image. " +
  "**Diagram discipline:** **orthogonal top-down** 2D; **walls and pits** as **clear inked boundaries**; **no fake 3/4 perspective** that skews cell size. **Lighting:** **no** strong cast shadows that suggest cinematic staging; **subtle** ambient shade to sell **depth** under furniture or alcoves is ok **if** it **does not** hide square corners. " +
  "**Detail budget:** make the space **visually rich** and **story-evocative**—**avoid** empty gray void rooms; **avoid** clutter that **obscures** which squares are walkable—**keep movement lanes and doorways unmistakable**. " +
  "**Room and landmark labels** use **simple block capitals or clean sans-serif**—like **drafting or floor-plan callouts**—**dark ink**, **not** ornate script. **Keep each label clean:** **one line** where possible, **wide word spacing**, **no** tangled overlap with walls or furniture; optional **flat light backing** (not busy ornament) on cluttered floors. Keep them **large enough** to read without zooming. Short **labels** for key spots are fine (same redundancy rules as other maps). The piece should feel like a **finished illustrated battle map** players want to **zoom in on**, not a bare CAD stub.";

export function clampImagePromptText(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

type OpenAIErrorBody = {
  error?: { message?: string; code?: string; type?: string };
};

function extractRequestIdFromText(text: string): string | undefined {
  const m = text.match(/\breq_[a-zA-Z0-9]+\b/);
  return m?.[0];
}

export function parseOpenAIImageApiFailure(
  response: Response,
  payload: unknown,
): { message: string; requestId?: string; code?: string } {
  const headerRequestId =
    response.headers.get("x-request-id") ??
    response.headers.get("openai-request-id") ??
    undefined;

  const err =
    payload && typeof payload === "object"
      ? (payload as OpenAIErrorBody).error
      : undefined;

  const message =
    err?.message?.trim() ||
    `Image API request failed (${response.status})`;

  const fromBody = extractRequestIdFromText(message);

  return {
    message,
    requestId: headerRequestId ?? fromBody,
    code: err?.code,
  };
}

export function formatImageApiErrorForClient(parsed: {
  message: string;
  requestId?: string;
  code?: string;
}): string {
  let out = parsed.message;
  const lower = out.toLowerCase();
  if (lower.includes("safety") || lower.includes("content_policy") || parsed.code === "content_policy_violation") {
    out +=
      " Try shortening or softening scene text (less graphic violence or horror), then generate again.";
    out += " If you think this is a mistake, contact OpenAI at https://help.openai.com/ and include your request ID.";
  } else if (
    lower.includes("server had an error") ||
    lower.includes("internal error") ||
    lower.includes("try again") ||
    parsed.code === "server_error"
  ) {
    out +=
      " This is often a temporary issue on OpenAI’s side—wait a moment and use **Generate maps** again.";
    out += " If it keeps happening, try **Image quality → Medium** or a smaller **Image size**, or contact https://help.openai.com/ with your request ID.";
  }
  if (parsed.requestId) {
    out += ` Request ID: ${parsed.requestId}`;
  }
  return out;
}
