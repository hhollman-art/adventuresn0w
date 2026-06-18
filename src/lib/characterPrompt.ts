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
};

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
  return `Create a roster of **pre-made player characters** ready to pick up and play in one session.

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

export const CHARACTER_SYSTEM_PROMPT = `You are an experienced Dungeons & Dragons player and character builder.

You write concise, table-ready **pre-made PCs** compatible with **D&D 5.2** (Creative Commons SRD-style assumptions).

Constraints:
- Original names and stories; no pastiche of published WotC characters.
- Stay SRD-generic for class features and spells (describe effects plainly; do not paste non-SRD reference text).
- Clarity beats length, but each PC must be runnable in combat and social scenes.
- Never use "personality hook(s)"; use the wording "Roleplay notes" instead.
- Use Markdown only. No preamble or closing disclaimer outside the roster itself.`;
