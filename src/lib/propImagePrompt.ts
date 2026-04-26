import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
} from "@/lib/openaiImagePrompt";

export type PropType =
  | "letter"
  | "scroll"
  | "journal"
  | "notice"
  | "map_handout"
  | "rune_tablet";

export type PropImageInput = {
  propType: PropType;
  title: string;
  bodyText: string;
  style: string;
  ageWear: string;
  settingHint: string;
  extraNotes: string;
};

function propTypeLine(propType: PropType): string {
  switch (propType) {
    case "letter":
      return "Create a hand-written fantasy letter prop.";
    case "scroll":
      return "Create an old parchment scroll prop.";
    case "journal":
      return "Create a torn journal page prop.";
    case "notice":
      return "Create a posted notice / broadside prop (stylized fantasy illustration, no real-world people).";
    case "map_handout":
      return "Create an in-world hand-drawn map handout prop.";
    case "rune_tablet":
      return "Create an engraved rune tablet or stone inscription prop.";
    default:
      return "Create a fantasy written prop.";
  }
}

export function buildPropImagePrompt(input: PropImageInput): string {
  const title = clampImagePromptText(input.title || "Untitled prop", 200);
  const bodyText = clampImagePromptText(
    input.bodyText ||
      "(optional; keep minimal, symbolic, or use abstract runes; avoid graphic or disturbing phrases)",
    800,
  );
  const settingHint = clampImagePromptText(
    input.settingHint || "(generic fantasy setting)",
    400,
  );
  const style = clampImagePromptText(input.style || "ink and parchment", 400);
  const ageWear = clampImagePromptText(input.ageWear || "lightly worn", 300);
  const extraNotes = clampImagePromptText(input.extraNotes || "(none)", 500);

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE high-detail fantasy tabletop prop image.

${propTypeLine(input.propType)}

Content details:
- Prop title: ${title}
- Text/content to include: ${bodyText}
- Setting hint: ${settingHint}
- Visual style: ${style}
- Age/wear: ${ageWear}
- Extra notes: ${extraNotes}

Rendering requirements:
- Image should look like a physical in-world artifact suitable for D&D table handouts.
- Prioritize clear visual storytelling for illustration-oriented props (items, signs, emblems, symbols, marks, or fragments).
- Long text is optional; use short labels, runes, or no text when that better serves the prop.
- If text is present, keep it legible and naturally integrated into the object/surface (not always centered).
- No watermarks, no logos, no UI overlays.
- No modern fonts or modern office paper unless explicitly requested.
- Output only the image.`;
}
