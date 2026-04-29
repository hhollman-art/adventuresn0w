/**
 * How large an area the realm document should cover. Broader = less fine detail per square mile, more big-picture.
 */
export type RealmSize =
  | "world"
  | "continent"
  | "country"
  | "region"
  | "local";

/**
 * Human-readable scope labels (UI and prompt). Factual; no instructions.
 */
export const REALM_SIZE_LABEL: Record<RealmSize, { label: string; detail: string }> = {
  world: {
    label: "World (planet / plane)",
    detail:
      "Entire world or plane: major oceans, continents, and long historical arcs. Content at this scale typically summarizes large regions, names only a few principal population centers, and describes terrain and climate in wide belts (latitude, monsoon, arid, polar, and similar).",
  },
  continent: {
    label: "Continent or subcontinent",
    detail:
      "A continent or subcontinent: multiple polities, long overland and sea routes, and regional terrain and weather patterns. Descriptions are usually comparable in depth to a survey of large kingdoms or basins, not a street-by-street list of settlements.",
  },
  country: {
    label: "Country / kingdom",
    detail:
      "A single country or kingdom: international borders, a capital, internal regions, and the main political and economic centers.",
  },
  region: {
    label: "Region (part of a country)",
    detail:
      "A subnational area such as a province, duchy, or border march: its towns, internal tensions, and neighboring territories.",
  },
  local: {
    label: "Local area (county, valley, cluster of sites)",
    detail:
      "A small area such as a county, valley, or cluster of sites: villages, roads, woods, and nearby ruins or landmarks at a short-journey scale.",
  },
};

/**
 * Extra constraints for world / continent: country-level depth only, few cities, terrain + climate first.
 * Trade guidance is in REALM_TRADE_AT_SCOPE (separate from this block).
 */
export const REALM_WORLD_CONTINENT_OUTPUT_GUIDE = `
**Zoom (World or Continent only):** The document must read **broadly**. You are not writing a full atlas of settlements.
- **Resolution:** Stay at about **country-level** throughout—each major place or faction gets “kingdom in outline” treatment, not inner-city or village roster detail.
- **Cities:** **One or two** main cities for the **entire** document as a whole is ideal; if you split the world into a few great regions, you may add **at most one** named principal city per region—**no long lists** of towns.
- **Terrain:** Emphasize **landforms, coasts, and big natural regions** (how they would read on a large map). That is the primary way to “illustrate” the setting in prose.
- **Climate:** Add **brief, clear** climate illustration—e.g. wet belts, arid cores, monsoon side vs rain shadow, cold high latitudes—enough to picture travel and dress conflicts, **not** exhaustive weather data.
- **Do not** go deeper than this: no district guides, no parade of markets, no microgeography.
`.trim();

/** How the Trade section should read at each scope (always include Trade in output). */
export const REALM_TRADE_AT_SCOPE: Record<RealmSize, string> = {
  world:
    "Plane- or world-scale trade: major maritime and overland systems, strategic commodities, currency and credit patterns, which cultures exchange what, and a few named choke points or monopolies—no street-level shop detail.",
  continent:
    "Continent-scale trade: long caravans and river/sea routes between major polities, regional specialties, toll leagues, and trade cities that matter; still not village markets.",
  country:
    "Kingdom- or country-scale trade: internal flows, border markets, taxes and tolls, principal exports and imports, merchant houses and guilds that shape the economy.",
  region:
    "Regional trade: this province or march—fairs, local routes, who sells what, smuggling, trade disputes, and neighbors’ goods that show up here.",
  local:
    "Local trade: inn and market cadence, peddlers, a nearby fair or wharf, one or two economic hooks (debt, scarcity, smuggling) at a walkable scale—enough to play, not a full atlas.",
};

/**
 * **Country, region, and local** get a dedicated Politics section. World/continent use broad
 * "power structures" in other sections; no separate Politics heading required at those scales.
 */
export const REALM_POLITICS_AT_SCOPE: Record<"country" | "region" | "local", string> = {
  country:
    "State- or kingdom-level **politics**: who rules (crown, council, theocrat) and the shape of **government and court**; **succession and legitimacy**; **major factions, noble lines, or orders** (a few **named**); **foreign relations and borders**; internal **regions that resist or push autonomy**; and **laws, taxes, conscription, or edicts** that change play. Enough to run intrigue, not a legal codex.",
  region:
    "Provincial or march **politics**: the **local ruler or appointed governor** and who they answer to; **tensions with the capital or adjacent provinces**; **councils, garrisons, churches, or guilds** with real clout; **families, factions, or officials** jockeying for power—playable, not exhaustive.",
  local:
    "Local **politics**: the **sheriff, reeve, elder, temple, or manor**; who really decides; **grudges, debts, and alliances** between sites; **overlords, bandits, tax collectors, or outsiders** who can upset the order—tight, table-ready **hooks and leverage points**.",
};

export type RealmInput = {
  realmSize: RealmSize;
  titleHint: string;
  description: string;
  extraNotes: string;
  /** Optional prior realm Markdown — extend, zoom, or stay consistent with established canon. */
  realmSeedMarkdown?: string;
};

export const REALM_SYSTEM_PROMPT = `You are an experienced Dungeons & Dragons worldbuilder and campaign consultant.

You write **table-ready** realm and setting material in **Markdown** for a Dungeon Master. The output should be **original** (no copy of Wizards of the Coast settings). Assume **5.2-style** fantasy: familiar tone, not system-specific stat blocks.

Rules:
- Match the **stated size** of the realm: do not map every stone on a *world* scale, and do not hand-wave entire continents for a *local* scale.
- For **World** and **Continent** especially: stay **broad** on purpose—treat the whole output as a **regional or planetary sketch**, never a catalog of small places. **Cities** are few and principal; **terrain and climate** do most of the work (landforms, belts, how weather and seasons “read” at a glance), without micro-detail.
- **Always include a dedicated Trade section** (e.g. \`## Trade\` or \`## Trade & economy\`). Its **depth and zoom level must match the chosen size**—world-scale networks for a world, local markets for a local area—never a generic one-size blurb.
- For **Country, Region, or Local** only: **always include a dedicated Politics section** (e.g. \`## Politics\` or \`## Politics & power\`). **Depth must match the chosen size** (kingdom scale vs province vs local). For **World** or **Continent**, do **not** add a separate Politics heading—sketch power and polities inside **Peoples, cultures, and power structures** and **History** instead.
- Include **concrete, usable** elements: place names, tensions, a few entry hooks, travel times only when helpful (relative bands are fine for large scales).
- Prefer **clarity and usability** over encyclopedic length.
- **Markdown only** for the main document. No preamble or out-of-universe “As an AI…” text.
- End with a short **DM cheatsheet** or bullet recap if the document is long.`;

function realmCreationSeedReferenceBlock(markdown: string): string {
  const body = markdown.trim();
  if (!body) return "";
  return `
## Prior realm document (canonical reference)
The user attached a **realm / setting document** they saved earlier in this app. Treat **named geography, factions, settlements, history beats, and tone** there as **authoritative canon** for this run.

- **Respect the requested realm size** in this message: you may **zoom in** (add finer local detail), **reframe** to a neighboring scope, or **sketch a wider lens** if the brief asks—while staying **consistent** with the seed.
- **Do not** silently rename core places or rewrite major facts unless the user's brief (below) explicitly asks for a reboot, alternate branch, reinterpretation, or “what if.”
- If the brief conflicts with the seed, **follow the brief** and note the tension briefly in the output only when it helps the DM.

---
${body}
---

`;
}

export function buildRealmUserMessage(input: RealmInput): string {
  const { label, detail } = REALM_SIZE_LABEL[input.realmSize];
  const seedRef = realmCreationSeedReferenceBlock(input.realmSeedMarkdown ?? "");
  const worldContinentBlock =
    input.realmSize === "world" || input.realmSize === "continent"
      ? `
## World or Continent: output conventions
${REALM_WORLD_CONTINENT_OUTPUT_GUIDE}
`
      : "";
  const politicsBlock =
    input.realmSize === "country" ||
    input.realmSize === "region" ||
    input.realmSize === "local"
      ? `

## Politics section
**${label}** — include a \`## Politics\` (or \`## Politics & power\`) section. Match coverage to the scope. Reference:
${REALM_POLITICS_AT_SCOPE[input.realmSize]}
`
      : "";
  return `Create **one** realm / setting document in Markdown.

## Realm size
**${label}** — ${detail}
${worldContinentBlock}${seedRef}## Brief
${input.description.trim() || "No additional brief; use realm size and notes only."}

## Title or theme (optional)
${input.titleHint.trim() || "(none)"}

## Notes
${input.extraNotes.trim() || "(none)"}

## Trade section
**${label}** — include a \`## Trade\` (or \`## Trade & economy\`) section. Match coverage to the scope above. Reference:
${REALM_TRADE_AT_SCOPE[input.realmSize]}
${politicsBlock}
## Output
Use a logical heading structure, for example (adapt to scale; include Trade; for Country/Region/Local, include **Politics** as its own \`##\` section after Geography or after Peoples—keep it scannable):
# Title (realm / region name)
## Elevator pitch
## Geography & climate (as much as fits the chosen size; at World/Continent, emphasize terrain and broad climate before settlement lists)
## Peoples, cultures, and power structures
${
  input.realmSize === "world" || input.realmSize === "continent"
    ? ""
    : `## Politics (or ## Politics & power) — per the Politics section reference above
`
}## History & tensions
## Trade (or ## Trade & economy) — per the Trade section reference above
## Settlements or sites of interest (detail level consistent with the realm size)
## Adventurer hooks
## Glossary of names
## DM cheatsheet (bullets: who wants what, where conflict is)

Match depth, settlement count, and geographic detail to **${label}** and the scope description at the top.`;
}
