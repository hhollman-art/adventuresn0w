import {
  ADVENTURE_MAP_RULE_ONE_NIGHT_LINE,
  ADVENTURE_MAP_RULE_SHORT_LINE,
} from "@/lib/battleMapDirectives";

/** Derived template family for headings / map rules (from session count). */
export type AdventureLength = "short" | "one_night";

/** 1 = minimal combat, 5 = encounter-dense. */
export type CombatIntensity = 1 | 2 | 3 | 4 | 5;

export type AdventureInput = {
  /** Kept for prompt templates; derived from sessionCount when omitted by callers. */
  adventureLength: AdventureLength;
  /** How many sessions this adventure should cover (1–20). */
  sessionCount: number;
  /** Average hours at the table per session (0.5–12). */
  hoursPerSession: number;
  combatIntensity: CombatIntensity;
  titleHint: string;
  levelRange: string;
  tone: string;
  setting: string;
  villainOrThreat: string;
  partySize: string;
  /** Human-readable table-time summary (derived or legacy). */
  sessionLength: string;
  extraNotes: string;
  /** Optional saved realm Markdown; when set, the model should treat it as canonical setting context. */
  realmSeedMarkdown?: string;
};

/** Map granular session count → existing heading / map-rule templates. */
export function adventureLengthFromSessionCount(sessionCount: number): AdventureLength {
  return sessionCount <= 1 ? "one_night" : "short";
}

export function formatSessionScopeLabel(sessionCount: number, hoursPerSession: number): string {
  const sessions = Math.min(20, Math.max(1, Math.round(sessionCount)));
  const hours = Math.min(12, Math.max(0.5, Number(hoursPerSession) || 3));
  const total = Math.round(sessions * hours * 10) / 10;
  if (sessions === 1) {
    return `**${sessions} session** · about **${hours} hour${hours === 1 ? "" : "s"}** at the table (≈ ${total}h total).`;
  }
  return `**${sessions} sessions** · about **${hours} hour${hours === 1 ? "" : "s"}** each (≈ **${total} hours** total table time).`;
}

export function formatSessionLengthField(sessionCount: number, hoursPerSession: number): string {
  const sessions = Math.min(20, Math.max(1, Math.round(sessionCount)));
  const hours = Math.min(12, Math.max(0.5, Number(hoursPerSession) || 3));
  if (sessions === 1) return `${hours} hours (1 session)`;
  return `${sessions} sessions × ${hours} hours`;
}

function lengthSpecificRules(length: AdventureLength): string {
  switch (length) {
    case "short":
      return `- Scope: one session worth of material; 3–5 scenes; one main climax.
- **Scene chapters:** each scene is a self-contained \`###\` block under **## Locations / scenes** with NPCs, items, encounters, checks, and treasure written **into that scene’s text** (see global scene-chapter rules below).
- Pacing: enough detail to run without improvisation gaps, but not a novel.
${ADVENTURE_MAP_RULE_SHORT_LINE}`;
    case "one_night":
      return `- Scope: one evening; prefer **1 primary location** (or two tiny linked sites); 3–4 tight beats plus a climax.
- **Scene chapters:** each beat is a \`###\` block under **## The night** with all NPC, item, encounter, check, and treasure detail **in that block**—not only in a later appendix.
- Every scene should push toward the finale; cut travel fluff and side quests.
- Session length should match the user's target time band; default to brisk pacing.
${ADVENTURE_MAP_RULE_ONE_NIGHT_LINE}`;
  }
}

function outputHeadings(length: AdventureLength): string {
  switch (length) {
    case "short":
      return `Use exactly these top-level headings in order:
# Title
## Prologue
## Hooks for the party
## Key NPCs
## Locations / scenes (playable beats — scene chapters go here)
## Locale / area map concept (for image generation)
## Battle map concepts (for image generation)
## Encounters & challenges
## Secrets & clues
## Treasure & rewards
## DM cheatsheet (timers, if-then branches, level-up band)

Treat this outline like a professionally published pamphlet scan: synopsis + tables up front (see Layout rules), keyed \`###\` scenes bulk in the middle, map brief blocks where listed, appendix-style cheats at the tail.

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

Pamphlet pacing: tighter front matter tables, brisk hooks, keyed \`###\` beats in **The night**, optional recap sections after.

**## Key NPCs** = short index only. **## Encounters & challenges** = optional recap; full fights live in each \`###\` under **## The night**. If the climax is its own beat, spell it out in **## Climax & aftermath** with the same chapter detail (NPCs, encounter, checks, treasure).`;
  }
}

/** Conventions echoed in commercially published tabletop adventure supplements (layout only — never imitate specific published adventures). */
const PUBLISHED_MODULE_LAYOUT_HINTS = `
**Publication-style layout (organize like a commercially released adventure pamphlet)**  
Mirror how professional **tabletop adventure PDFs/booklets** are arranged: synopsis and facts early, keyed encounter detail later, and **distinct** player narration vs GM mechanics—all with **your own names, factions, lore, boxed text, and stat summaries** (do **not** copy or closely paraphrase any copyrighted module, map, boxed text, or non-SRD stat block).

**Front matter habits** — Right under \`# Title\`, add a short **subtitle or tagline** line (plain text, no extra heading). In **## Prologue** / **## Pitch**, open with tight overview prose, then a **Markdown pipe table** titled implicitly by a bold intro line (**Adventure at a glance** as normal bold text):

| Aspect | Detail |
|:---|:---|
| **Levels / tier** | (from inputs) |
| **Running time** | (match user session target) |
| **Party size** | (from inputs) |
| **Themes & pillars** | combat / exploration / social mix |
| **Premise sketch** | one sentence on the threat |

Optional second row for **Sensitivity / vibe** only if stakes warrant it—keep tasteful.

**Hooks** — In **Hooks…**, style bullets like pamphlets do: bold lead (**Patron hook.** **Wandering party hook.** etc.) followed by crisp text.

**Scene chapters (\`###\`)** — For buildings, dungeon wings, layered sites: nest **keyed locales** using \`#### Area A — Tile\` / \`#### Location 3 — Alias\`-style headings (dungeon-key granularity). Beneath each, mix **purpose**, occupants, traps, exits, treasures. Prefer a **Treasure.** / **Developments.** / **Sensory cues.** subsection when it helps skim-reading.

**Read-aloud voice** — When you give narration players hear at the table, wrap it in Markdown **blockquote** lines (\`>\`). Start the first quoted paragraph with bold \`**Read-aloud**\` (or inline **Read-aloud —**) before the narration. Keep read-aloud **original** prose; GM directions stay **outside** the blockquotes in normal bullets.

**Branches** — Add short **Developments** or "**If … then …**" bullets where published modules clarify consequences and escalations after major beats.

Map brief headings **Locale / Battle** stay unchanged in position relative to Locations as already specified elsewhere.

**Print pagination (HTML / PDF in this app)**  
The exporter wraps \`# Title\` … through the moment **before** the first \`##\` as one **cover sheet**, then renders **every \`## …\`** as its own physical **page/spread block**—like turning pages in a stapled pamphlet when you Print or Save as PDF. **Realm gazetteers from this tool use the same layout**, so adventure PDFs and realm PDFs can be **merged or ordered** into one binder / magazine-style compilation with consistent spreads. Aim for **enough substantive material per \`##\`** that each sheet feels purposeful; **map-key sections** (\`## Locale / area map concept\`, \`## Battle map concepts\`) stay **tight bulletin lists**, not prose walls. Prefer **readable density**—bullets, skimmable subheads—over empty page breaks beneath a solitary heading.`;


/** Appended to every user message so scenes carry full table data in-line. */
const SCENE_CHAPTER_RULES = `

**Scene “chapters” (mandatory — every length)**
- Each **scene** reads like a **book chapter for the DM**: open it with a \`###\` heading (clear scene title). The DM should run that block **top-to-bottom** without hunting other sections for the same information.
- **In the same scene text**, include everything that matters **when it appears**: NPCs present (with **Class X (Level Y)** and the full compact combat profile the **first time** they matter in that scene), notable **items or props**, **encounters** (combat, social, or hazard—including stat summaries for anything fight-worthy), **skill checks** with suggested DCs or bands, and **treasure** gained or offered here—including **level-appropriate** magic items or consumables when loot is part of the beat. Use bold mini-labels (**NPCs:** **Items:** **Encounter:** **Checks:** **Treasure:**) or tight bullets so it scans fast.
- Sections like **Key NPCs**, **Encounters & challenges**, and **Treasure & rewards** are **indexes or summaries** only when you also put the **authoritative runnable detail** in the scene chapter where it is used.
- Give **every playable beat** its own \`### …\` heading under **## Locations / scenes** or **## The night** (clear titles). The companion app can then offer **one battle map and one prop image per scene** from that structure.
${PUBLISHED_MODULE_LAYOUT_HINTS}`;

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
- Battle map concepts should align: fewer maps at 1–2; more tactical battlefields at 4–5. **Each battle brief stays encounter-scale** (one zoomed-in footprint), not continent- or castle-wide layouts.`;
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

function realmSeedReferenceBlock(markdown: string): string {
  const body = markdown.trim();
  if (!body) return "";
  return `
## Canonical realm reference (saved document)
The following Markdown is a **realm / setting document** (or documents) the user saved from this app. Treat named geography, factions, settlements, tone, and established lore as **authoritative world context** for this adventure. Invent new local story, encounters, and NPCs as needed at a scale that fits the adventure; **avoid** contradicting this reference unless the adventure parameters above explicitly call for a twist, alternate branch, or deliberate reinterpretation.

---
${body}
---

`;
}

export function buildUserMessage(input: AdventureInput): string {
  const sessions = Math.min(20, Math.max(1, Math.round(input.sessionCount || 1)));
  const hours = Math.min(12, Math.max(0.5, Number(input.hoursPerSession) || 3));
  const length =
    input.adventureLength || adventureLengthFromSessionCount(sessions);
  const lengthLabel = formatSessionScopeLabel(sessions, hours);
  const realmRef = realmSeedReferenceBlock(input.realmSeedMarkdown ?? "");

  return `Create ONE adventure document in Markdown.

## Adventure length / scope
${lengthLabel}
- Pace the arc across **${sessions}** session${sessions === 1 ? "" : "s"} at roughly **${hours}** hour${hours === 1 ? "" : "s"} each.
- Prefer about **${Math.max(3, Math.min(8, sessions * 3))}–${Math.max(4, Math.min(12, sessions * 4))}** playable scene beats total, scaled to that table time.
- ${sessions === 1 ? "Tight single-evening structure: strong start and finish the same night." : "Multi-session structure: clear mid-arc milestones and a finale in the last session."}

${combatIntensityBlock(input.combatIntensity)}

${magicItemRulesBlock(input.levelRange, length)}

## Parameters
- Working title or theme: ${input.titleHint || "(you choose)"}
- Character levels: ${input.levelRange}
- Tone: ${input.tone}
- Setting / biome / location type: ${input.setting}
- Villain, faction, or central threat: ${input.villainOrThreat}
- Typical party size: ${input.partySize}
- Target session length / table time: ${input.sessionLength}
- Additional requests: ${input.extraNotes || "(none)"}
${realmRef}## Rules (all lengths)
- **Layout:** organize like a commercially published adventure supplement (pamphlet / PDF)—overview before detail, skim-friendly headings, keyed sub-areas (\`####\`) when warranted, markdown blockquotes (\`>\`) for **read-aloud** narration, concise DM bullets beside or after them (see Scene rules). **All prose must be wholly original.** Do **not** copy or closely paraphrase any copyrighted tabletop module.
- Structure play as **scene chapters** (see Output format): NPCs, items, encounters, checks, and treasure must appear **in the scene text** where they matter, not only in later lists.
- Assume **D&D version 5.2** conventions (ability checks, DC guidance, encounter pacing, and terminology consistent with the 5.2 / CC SRD lineage). Do not claim affiliation with Wizards of the Coast.
- Use **only SRD-open or original** creature names and stat summaries. If you include a creature, give a tight **stat block summary** (AC, HP, key attacks, signature ability) in plain prose or a compact bullet list—not copied proprietary text.
- In **Key NPCs**, each major NPC gets at least a **Class X (Level Y)** line in the index; the **full combat profile** must also appear in the **scene chapter** where they matter most.
- Keep NPC class levels plausible for the adventure's target party level band.
- For each major NPC, add a compact combat profile for quick use in battle: ability scores (**STR, DEX, CON, INT, WIS, CHA**), **AC**, **HP**, speed, proficiency bonus (if relevant), and 1–3 key attacks or actions.
- Keep NPC combat profiles concise and original (summary format, not copied proprietary stat blocks).
- **Maps:** do not output ASCII grids. Provide concise image-generation briefs for OpenAI (top-down, VTT-friendly). **Locale / world overview** = **rich illustrated atlas** (relief, biome texture, oceans vs seas vs large lakes, sharp coasts and borders); **several continent-scale landmasses with ocean between** unless the setting is explicitly one land or a specific geography; **capital + major cities** with **clear symbol types**; **major trade roads and sea lanes** as named corridors (**give each primary route a short name** the artist can letter on-map). **Battle** briefs use **5 ft × 5 ft** grids, **tight tactical zoom**, **grid-first illustrated battlemat** (detailed floors/props, not isometric scenes). **Name** important areas so map images can show short on-map labels—**one** name per place (no duplicate labels for the same feature); briefs should hint **label categories** where natural (realm vs city vs sea vs route).
- **Magic items:** include level-appropriate magic loot and consumables where treasure matters; **## Treasure & rewards** should briefly **summarize** permanents and notable consumables, while scene chapters remain the **authoritative** place where items are found or offered.

## Rules (this length only)
${lengthSpecificRules(length)}

## Output format (Markdown)
${outputHeadings(length)}${SCENE_CHAPTER_RULES}`;
}

export const SYSTEM_PROMPT = `You are an experienced Dungeons & Dragons Dungeon Master and adventure designer.

You write table-ready adventures compatible with **D&D 5.2** (Creative Commons SRD-style assumptions: bounded accuracy, familiar action economy language, DCs that match the stated level band).

The user will specify scope: **short adventure** or **one-nighter**. Match depth and structure to that scope.
The user will also set **combat intensity** on a **1–5** scale; honor it when choosing how many encounters, how lethal fights are, and how much table time goes to tactical combat versus other pillars.
Write each **scene** as a self-contained **chapter**: embed NPCs, items, encounters, checks, and treasure in that scene’s prose so the DM never has to cross-reference empty scene stubs.
When maps are requested, output image-generation briefs (for OpenAI) rather than ASCII maps—**locale / world briefs** are **rich full-color illustrated atlases** (terrain and hydrology detail, clear borders, **separate continents or large islands where the setting needs it**, **capitals and major cities** with distinct roles, **primary routes each with a usable name** for on-map lettering)—**top-down** reference plates, not sideways cinematic landscape posters. **Battle** briefs describe encounter-scale areas, assume **5 ft × 5 ft**, and favor **grid-first illustrated** battlemats (detailed floors, **bold** grid)—not isometric key art. Name key locations (one per place, no duplicate labels) so generated maps can show short, **high-contrast** labels.

Constraints:
- Original names and story; no pastiche of published WotC adventures.
- When referencing rules, stay generic and 5.2-aligned (do not reproduce non-SRD stat blocks verbatim).
- Prefer **pamphlet-style clarity**: synopsis + skim-friendly tables early, keyed locations with **Markdown blockquotes (\`>\`) for read-aloud** when narration helps, mechanics and DCs outside quotes; brevity still matters—omit filler boxed text players never trigger.
- For every major NPC, assign a clear class and level using 5.2-style class names.
- For every major NPC, include battle-ready key stats: STR/DEX/CON/INT/WIS/CHA plus AC, HP, and key actions.
- Treasure includes **level-appropriate** magic items and consumables; item **rarity and power** must align with the user's stated party level band and adventure scope.
- Use Markdown only. No preamble or closing disclaimer outside the adventure itself.`;
