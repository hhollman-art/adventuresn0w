export type AdventureLength = "short" | "one_night";

/** 1 = minimal combat, 5 = encounter-dense. */
export type CombatIntensity = 1 | 2 | 3 | 4 | 5;

export type AdventureInput = {
  adventureLength: AdventureLength;
  combatIntensity: CombatIntensity;
  titleHint: string;
  levelRange: string;
  tone: string;
  setting: string;
  villainOrThreat: string;
  partySize: string;
  sessionLength: string;
  extraNotes: string;
};

const LENGTH_DESCRIPTION: Record<AdventureLength, string> = {
  short:
    "**Short adventure** — about **one session** (roughly 3–5 playable scenes or beats), clear arc, usable this week.",
  one_night:
    "**One-nighter** — a **single tight evening** (about 2–4 hours at the table), minimal locations, strong start and finish same night.",
};

/**
 * Plain-text descriptions for UI hover tooltips (`title`).
 * Kept in sync with generator scope; no Markdown (browser tooltips are plain text).
 */
export const ADVENTURE_LENGTH_HOVER_HELP: Record<AdventureLength, string> = {
  short:
    "Short adventure — built for about one session at the table (roughly 3–5 playable scenes). Expect a clear arc, scene-by-scene DM notes (NPCs, encounters, skill checks, treasure embedded where they show up), plus locale and battle map briefs suitable for image generation. Best when you want something runnable this week without committing to a long arc.",
  one_night:
    "One-nighter — a single tight evening (about 2–4 hours). Fewer locations, brisk pacing, and a strong start-to-finish in one sitting. Scene beats read like compact chapters; map briefs stay focused on tonight’s fights and set-pieces. Ideal for a pickup game or a con slot.",
};

function lengthSpecificRules(length: AdventureLength): string {
  switch (length) {
    case "short":
      return `- Scope: one session worth of material; 3–5 scenes; one main climax.
- **Scene chapters:** each scene is a self-contained \`###\` block under **## Locations / scenes** with NPCs, items, encounters, checks, and treasure written **into that scene’s text** (see global scene-chapter rules below).
- Pacing: enough detail to run without improvisation gaps, but not a novel.
- **Maps:** include one locale map concept and 2-3 battle map concepts written as image-generation briefs for OpenAI (top-down, grid-friendly). **Name key and iconic** regions, sites, rooms, and landmarks in the brief so generated map art can label them—**one** consistent name per place (no duplicate or synonymous labels for the same feature).`;
    case "one_night":
      return `- Scope: one evening; prefer **1 primary location** (or two tiny linked sites); 3–4 tight beats plus a climax.
- **Scene chapters:** each beat is a \`###\` block under **## The night** with all NPC, item, encounter, check, and treasure detail **in that block**—not only in a later appendix.
- Every scene should push toward the finale; cut travel fluff and side quests.
- Session length should match the user's target time band; default to brisk pacing.
- **Maps:** one tight locale map concept plus two battle map concepts written for OpenAI image generation. **Name key and iconic** areas in each brief so map art can label them—**one** name per mappable place (no redundant synonyms).`;
  }
}

function outputHeadings(length: AdventureLength): string {
  switch (length) {
    case "short":
      return `Use exactly these top-level headings in order:
# Title
## Elevator pitch
## Hooks for the party
## Key NPCs
## Locations / scenes (playable beats — scene chapters go here)
## Locale / area map concept (for image generation)
## Battle map concepts (for image generation)
## Encounters & challenges
## Secrets & clues
## Treasure & rewards
## DM cheatsheet (timers, if-then branches, level-up band)

Under **## Key NPCs**, use a **short index only** (name, role, first scene)—not the only place for stats. Under **## Encounters & challenges** and **## Treasure & rewards**, use **brief at-a-glance or totals**; the **authoritative** encounter specs and loot live **inside each \`###\` scene** under **## Locations / scenes**.`;
    case "one_night":
      return `Use exactly these top-level headings in order:
# Title
## Pitch (why tonight matters)
## Hooks (fast starts)
## Key NPCs
## Locale / area map concept (for image generation)
## Battle map concepts (for image generation)
## The night (scene-by-scene beats — chapter-style \`###\` scenes here)
## Encounters & challenges
## Climax & aftermath
## DM cheatsheet (timers, shortcuts, safety valves)

**## Key NPCs** = short index only. **## Encounters & challenges** = optional recap; full fights live in each \`###\` under **## The night**. If the climax is its own beat, spell it out in **## Climax & aftermath** with the same chapter detail (NPCs, encounter, checks, treasure).`;
  }
}

/** Appended to every user message so scenes carry full table data in-line. */
const SCENE_CHAPTER_RULES = `

**Scene “chapters” (mandatory — every length)**
- Each **scene** reads like a **book chapter for the DM**: open it with a \`###\` heading (clear scene title). The DM should run that block **top-to-bottom** without hunting other sections for the same information.
- **In the same scene text**, include everything that matters **when it appears**: NPCs present (with **Class X (Level Y)** and the full compact combat profile the **first time** they matter in that scene), notable **items or props**, **encounters** (combat, social, or hazard—including stat summaries for anything fight-worthy), **skill checks** with suggested DCs or bands, and **treasure** gained or offered here—including **level-appropriate** magic items or consumables when loot is part of the beat. Use bold mini-labels (**NPCs:** **Items:** **Encounter:** **Checks:** **Treasure:**) or tight bullets so it scans fast.
- Sections like **Key NPCs**, **Encounters & challenges**, and **Treasure & rewards** are **indexes or summaries** only when you also put the **authoritative runnable detail** in the scene chapter where it is used.
- Give **every playable beat** its own \`### …\` heading under **## Locations / scenes** or **## The night** (clear titles). The companion app can then offer **one battle map and one prop image per scene** from that structure.`;

const COMBAT_GUIDANCE: Record<CombatIntensity, string> = {
  1: "Very light: prioritize exploration, social play, puzzles, chases, and hazards. Include **at most one** brief skirmish or non-lethal confrontation unless players force more. Do **not** stack multiple mandatory fights.",
  2: "Light: several scenes resolve without combat. Include **one or two** modest fights total for a short/one-nighter unless the story demands more.",
  3: "Balanced: mix combat and non-combat. Roughly **half** of major beats may be combat or clearly combat-ready set-pieces; the rest intrigue, exploration, or skill challenges.",
  4: "Combat-heavy: **most** major beats include a serious fight, multi-wave encounter, or clear tactical showdown. Include lieutenants, reinforcements, or linked skirmishes where appropriate.",
  5: "Very heavy: **encounter-dense**—frequent major combats, multipart battles, varied enemy types, terrain that pressures the party, and resource-draining fights. Still keep story and hooks legible; avoid combat with no purpose.",
};

function combatIntensityBlock(level: CombatIntensity): string {
  const line = COMBAT_GUIDANCE[level];
  return `## Combat focus (user scale: **${level} of 5**)
- Scale: **1** = lightest · **5** = heaviest combat.
- **Match this adventure to level ${level}.** ${line}
- In **scene chapters** (each \`###\` beat under Locations or The night), calibrate **how many** distinct fight set-pieces, **how many** stat-worthy foes, and encounter **difficulty** (trivial vs boss) to this scale.
- Battle map concepts should align: fewer maps at 1–2; more tactical battlefields at 4–5.`;
}

function magicItemRulesBlock(levelRange: string, length: AdventureLength): string {
  const scopeNote =
    length === "one_night"
      ? "For **one-nighter** scope: avoid a shopping list of powerful gear—**0–1** standout permanent magic item for the whole evening is usually enough unless the premise is explicitly a treasure hunt."
      : "For **short** scope: **0–1** standout permanent magic item for the whole adventure is typical; sprinkle **minor** consumables or trinkets if it fits.";

  return `## Magic items & treasure (must match party level)
- The party level band is: **${levelRange || "(infer from context)"}**. Treat every **named magic item**, **spell scroll or tiered consumable**, and **major non-magic reward** as **level-appropriate** for that band and for this adventure's scope.
- Use SRD-style **rarity** language (common, uncommon, rare, very rare, legendary) and keep rarities **inside** what is typical for that level range (do not hand out multiple permanents a tier above the band unless you clearly frame it as a dangerous, costly, or story-ending prize).
- Rough alignment guide (adjust if the user's level band is narrow): levels **1–4** → mostly **common** and a little **uncommon**; **5–10** → **uncommon** with occasional **rare**; **11–16** → **rare** and **very rare** as big prizes; **17–20** → **very rare** / **legendary** as capstones. Mixed bands: stay conservative for the **lower** end of the range unless a scene is explicitly high-risk.
- For each magic item you introduce, add a **one-line effect** the DM can use (SRD-generic description, not copied proprietary text).
- ${scopeNote}`;
}

export function buildUserMessage(input: AdventureInput): string {
  const lengthLabel = LENGTH_DESCRIPTION[input.adventureLength];

  return `Create ONE adventure document in Markdown.

## Adventure length / scope
${lengthLabel}

${combatIntensityBlock(input.combatIntensity)}

${magicItemRulesBlock(input.levelRange, input.adventureLength)}

## Parameters
- Working title or theme: ${input.titleHint || "(you choose)"}
- Character levels: ${input.levelRange}
- Tone: ${input.tone}
- Setting / biome / location type: ${input.setting}
- Villain, faction, or central threat: ${input.villainOrThreat}
- Typical party size: ${input.partySize}
- Target session length / table time: ${input.sessionLength}
- Additional requests: ${input.extraNotes || "(none)"}

## Rules (all lengths)
- Structure play as **scene chapters** (see Output format): NPCs, items, encounters, checks, and treasure must appear **in the scene text** where they matter, not only in later lists.
- Assume **D&D version 5.2** conventions (ability checks, DC guidance, encounter pacing, and terminology consistent with the 5.2 / CC SRD lineage). Do not claim affiliation with Wizards of the Coast.
- Use **only SRD-open or original** creature names and stat summaries. If you include a creature, give a tight **stat block summary** (AC, HP, key attacks, signature ability) in plain prose or a compact bullet list—not copied proprietary text.
- In **Key NPCs**, each major NPC gets at least a **Class X (Level Y)** line in the index; the **full combat profile** must also appear in the **scene chapter** where they matter most.
- Keep NPC class levels plausible for the adventure's target party level band.
- For each major NPC, add a compact combat profile for quick use in battle: ability scores (**STR, DEX, CON, INT, WIS, CHA**), **AC**, **HP**, speed, proficiency bonus (if relevant), and 1–3 key attacks or actions.
- Keep NPC combat profiles concise and original (summary format, not copied proprietary stat blocks).
- **Maps:** do not output ASCII grids. Instead, provide concise image-generation briefs suitable for OpenAI map rendering (top-down, VTT-friendly). **Name** important areas, rooms, and landmarks in the brief so map images can show short on-map labels—**one** name per place (no duplicate labels for the same feature).
- **Magic items:** include level-appropriate magic loot and consumables where treasure matters; **## Treasure & rewards** should briefly **summarize** permanents and notable consumables, while scene chapters remain the **authoritative** place where items are found or offered.

## Rules (this length only)
${lengthSpecificRules(input.adventureLength)}

## Output format (Markdown)
${outputHeadings(input.adventureLength)}${SCENE_CHAPTER_RULES}`;
}

export const SYSTEM_PROMPT = `You are an experienced Dungeons & Dragons Dungeon Master and adventure designer.

You write table-ready adventures compatible with **D&D 5.2** (Creative Commons SRD-style assumptions: bounded accuracy, familiar action economy language, DCs that match the stated level band).

The user will specify scope: **short adventure** or **one-nighter**. Match depth and structure to that scope.
The user will also set **combat intensity** on a **1–5** scale; honor it when choosing how many encounters, how lethal fights are, and how much table time goes to tactical combat versus other pillars.
Write each **scene** as a self-contained **chapter**: embed NPCs, items, encounters, checks, and treasure in that scene’s prose so the DM never has to cross-reference empty scene stubs.
When maps are requested, output image-generation briefs (for OpenAI) rather than ASCII maps; name key and iconic locations in those briefs (one name per place, no duplicate labels for the same feature) so generated maps can show short labels.

Constraints:
- Original names and story; no pastiche of published WotC adventures.
- When referencing rules, stay generic and 5.2-aligned (do not reproduce non-SRD stat blocks verbatim).
- Prefer actionable DM notes: boxed read-aloud is optional; clarity beats length.
- For every major NPC, assign a clear class and level using 5.2-style class names.
- For every major NPC, include battle-ready key stats: STR/DEX/CON/INT/WIS/CHA plus AC, HP, and key actions.
- Treasure includes **level-appropriate** magic items and consumables; item **rarity and power** must align with the user's stated party level band and adventure scope.
- Use Markdown only. No preamble or closing disclaimer outside the adventure itself.`;
