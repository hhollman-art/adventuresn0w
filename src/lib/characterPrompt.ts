export type CharacterSlotSpec = {
  className?: string;
  race?: string;
};

export type PremadeCharacterInput = {
  partyConcept: string;
  levelRange: string;
  tone: string;
  setting: string;
  characterCount: string;
  extraNotes: string;
  characterSpecs?: CharacterSlotSpec[];
  /** Optional saved seed markdown (realm, adventure, etc.) for world context. */
  sourceSeedMarkdown?: string;
};

function sourceSeedReferenceBlock(markdown: string): string {
  const body = markdown.trim();
  if (!body) return "";
  return `
## Source material (saved D&DEasy seed)
The following Markdown is **reference context** from the user's library (one or more saved seeds: realm, adventure, or other prep). Use its geography, factions, tone, hooks, and established facts to inform **party identity, backstories, ties, and Roleplay notes**. **Avoid** contradicting this material unless the party parameters below explicitly call for a twist or alternate interpretation. The fields below still control party concept, levels, class/race locks, and tone.

---
${body}
---

`;
}

function formatCharacterSpecsBlock(specs: CharacterSlotSpec[] | undefined): string {
  if (!specs?.length) {
    return "- (No per-PC class or race locks — build a balanced, complementary party.)";
  }
  return specs
    .map((s, i) => {
      const cls = s.className?.trim() || "Any (your choice)";
      const race = s.race?.trim() || "Any (your choice)";
      return `- PC ${i + 1}: **Class** ${cls}; **Race** ${race}`;
    })
    .join("\n");
}

export function buildPremadeCharactersMessage(input: PremadeCharacterInput): string {
  const seedRef = sourceSeedReferenceBlock(input.sourceSeedMarkdown ?? "");
  return `Create a roster of **pre-made player characters** ready to pick up and play in one session.
${seedRef}
## Parameters
- Party concept or theme: ${input.partyConcept || "(you choose a cohesive party identity)"}
- Character levels: ${input.levelRange}
- Tone: ${input.tone}
- Setting / world flavor: ${input.setting || "(generic fantasy)"}
- Number of characters: ${input.characterCount}
- Additional requests: ${input.extraNotes || "(none)"}

## Per-PC class & race (SRD-open)
${formatCharacterSpecsBlock(input.characterSpecs)}
- Honor each **Class** / **Race** lock exactly when not "Any".
- When a slot is "Any", pick to complement the rest of the party (avoid redundant builds unless the concept calls for it).
- Do not assign the same class+race combo twice unless the table explicitly locked it.

## Rules
- Assume **D&D version 5.2** character creation assumptions (CC SRD lineage). Do not claim affiliation with Wizards of the Coast.
- Use **only SRD-open class names and options** (or clearly generic equivalents). Original character names and backstory.
- Each character must be **play-ready**: ability scores, modifiers, AC, HP, speed, proficiency bonus, saving throw proficiencies, skill proficiencies (pick the most relevant handful), languages, gear, and any spells or cantrips if applicable—all in concise summary form, not copied proprietary text blocks.
- Ensure the party has **complementary roles** (avoid four identical builds unless requested).
- If level is a range, pick one level per character within that band and state it clearly.
- Terminology rule: never use the phrase **"personality hook"** (or plural). Always use **"Roleplay notes"**.

## Output format (Markdown)
Use exactly these top-level headings in order:
# Party / roster name
## One-paragraph pitch (who they are as a group)
## Characters
(For each character, use a level-3 heading: ### Name — Class (Level), then subsections with bullets as needed.)
## Party ties (how they know each other)
## DM note (hooks, lines, or secrets to weave into a one-shot)`;
}

/* ---- Single character (character library AI assist) ---- */

/**
 * Fields the user set by hand in the character editor. Anything present is a
 * hard lock the model must reproduce; anything absent is the model's to fill.
 */
export type SingleCharacterLocks = {
  name?: string;
  species?: string;
  className?: string;
  subclass?: string;
  background?: string;
  alignment?: string;
  level?: number;
  ac?: number;
  maxHp?: number;
  speed?: number;
  abilities?: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  /** Gear the user already listed (kept; the model may add more). */
  gear?: string[];
  /** User-written notes (kept; the model may add more note bullets). */
  notes?: string;
};

export type SingleCharacterInput = {
  /** Freeform concept / flavor text from the DM or player. */
  flavor: string;
  locks: SingleCharacterLocks;
};

function lockLine(label: string, value: string | number | undefined): string | null {
  if (value === undefined || value === "") return null;
  return `- ${label}: **${value}** (locked — reproduce exactly)`;
}

export function buildSingleCharacterMessage(input: SingleCharacterInput): string {
  const l = input.locks;
  const lockLines = [
    lockLine("Name", l.name),
    lockLine("Species/Race", l.species),
    lockLine("Class", l.className),
    lockLine("Subclass", l.subclass),
    lockLine("Background", l.background),
    lockLine("Alignment", l.alignment),
    lockLine("Level", l.level),
    lockLine("AC", l.ac),
    lockLine("Max HP", l.maxHp),
    lockLine("Speed (ft)", l.speed),
    l.abilities
      ? `- Ability scores: **STR ${l.abilities.str}, DEX ${l.abilities.dex}, CON ${l.abilities.con}, INT ${l.abilities.int}, WIS ${l.abilities.wis}, CHA ${l.abilities.cha}** (locked — reproduce exactly)`
      : null,
    l.gear?.length
      ? `- Existing gear (keep every item; you may add more): ${l.gear.join("; ")}`
      : null,
    l.notes?.trim()
      ? `- Existing notes (context only — do NOT repeat them; output only NEW note bullets): ${l.notes.trim()}`
      : null,
  ].filter((line): line is string => line !== null);

  return `Create **one** pre-made player character.

## Concept / flavor from the user
${input.flavor.trim() || "(none — invent a compelling, playable character)"}

## Locked fields (set by hand — never change these)
${lockLines.length ? lockLines.join("\n") : "- (nothing locked — every field is yours to fill)"}

## Your job
Fill in **every field that is not locked** so the sheet is play-ready and internally consistent (level-appropriate AC/HP, sensible ability spread for the class, level-appropriate gear). Give them a short, evocative backstory and Roleplay notes.

## Output format (Markdown — exactly this structure, nothing else)
# <character name>

## Characters

### <character name> — <class> (Level <n>)
- Player:
- Race: <species>
- Subclass: <subclass>
- Background: <background>
- Alignment: <alignment>
- AC: <number>
- HP: <number>
- Speed: <number>
- STR <n>, DEX <n>, CON <n>, INT <n>, WIS <n>, CHA <n>
- Gear: <item> — <short note> (one "Gear:" bullet per item)
- <one bullet per line of backstory, features, proficiencies, languages, and Roleplay notes>

Leave the "Player:" bullet value empty. Do not add headings, preamble, or commentary beyond this structure.`;
}

export const CHARACTER_SYSTEM_PROMPT = `You are an experienced Dungeons & Dragons player and character builder.

You write concise, table-ready **pre-made PCs** compatible with **D&D 5.2** (Creative Commons SRD-style assumptions).

Constraints:
- Original names and stories; no pastiche of published WotC characters.
- Stay SRD-generic for class features and spells (describe effects plainly; do not paste non-SRD reference text).
- Clarity beats length, but each PC must be runnable in combat and social scenes.
- Never use "personality hook(s)"; use the wording "Roleplay notes" instead.
- Use Markdown only. No preamble or closing disclaimer outside the roster itself.`;
