import {
  clampImagePromptText,
  IMAGE_PROMPT_SAFETY_PREAMBLE,
} from "@/lib/openaiImagePrompt";

/**
 * High-level item kinds for handout images. The model draws the *object* (vial, blade,
 * parchment, etc.) and uses the user description for look, materials, and any text.
 */
export type PropItemCategory =
  | "paper"
  | "potion"
  | "weapon"
  | "armor"
  | "tool"
  | "container"
  | "wearable"
  | "food_drink"
  | "relic"
  | "other";

export type PropImageInput = {
  itemCategory: PropItemCategory;
  title: string;
  /** What to depict: appearance, materials, in-world text on the object, condition. */
  description: string;
  style: string;
  ageWear: string;
  settingHint: string;
  extraNotes: string;
};

function categoryLine(category: PropItemCategory): string {
  switch (category) {
    case "paper":
      return "Create a paper / parchment prop: letter, scroll, notice, map on paper, ledger page, or similar flat document; medieval / early-Renaissance fantasy; avoid modern paper or print-shop gloss.";
    case "potion":
      return "Create a potion, phial, flask, or bottle prop as the main subject: glass or ceramic, stopper, optional wax seal, liquid visible; label or script only if the description calls for it; no modern pharmacy aesthetic.";
    case "weapon":
      return "Create a single fantasy weapon as the main subject (blade, haft, head, or bow limb in frame): steel and practical detail, not a character portrait; no gore, no people.";
    case "armor":
      return "Create a piece of fantasy armor, helm, or shield as the main subject: wear, dents, straps, paint or blazon as described; not worn by a person if it crowds the object.";
    case "tool":
      return "Create a tool, key, or small instrument as the main subject: wood, metal, wear; fantasy artisan or adventuring gear, not power tools or modern cutlery with plastic.";
    case "container":
      return "Create a container prop: coffer, chest, bag, cask, or similar; wood, metal, leather, hasps; the object is the focus, not an interior room shot.";
    case "wearable":
      return "Create a worn item: boots, gloves, circlet, cloak clasp, or jewelry as a laid-flat or floating display; materials and clasps, not a full outfit on a mannequin unless minimal.";
    case "food_drink":
      return "Create food or drink as a still-life prop: roast, bread, cheese, wine flagon, etc.; fantasy table fare, appetizing, PG-13; no people.";
    case "relic":
      return "Create a small relic, holy symbol, talisman, carved idol, or fine metal emblem as the main subject; patina, chain, or mount as appropriate.";
    case "other":
    default:
      return "Create a single fantasy tabletop prop object; clear silhouette and materials, no people, not a full scene.";
  }
}

function categoryRenderingNotes(category: PropItemCategory): string {
  if (category === "paper") {
    return "- If writing appears, it should read as in-world text (decrees, labels, runes on parchment). No meta labels (no “DM,” “prop,” or similar as prominent lettering).";
  }
  if (category === "potion" || category === "weapon" || category === "armor" || category === "container") {
    return "- Favor object clarity, material read, and table usability over painterly cover art. Any labels should be in-world, short, and optional.";
  }
  return "- Natural materials and believable wear; in-world text or marks only if the description includes them, kept legible and integrated.";
}

export function buildPropImagePrompt(input: PropImageInput): string {
  const title = clampImagePromptText(input.title || "Prop", 200);
  const description = clampImagePromptText(
    input.description ||
      "(user should describe the item: shape, material, any writing, condition)",
    1200,
  );
  const settingHint = clampImagePromptText(
    input.settingHint || "(generic fantasy setting)",
    400,
  );
  const style = clampImagePromptText(input.style || "believable for the era", 400);
  const ageWear = clampImagePromptText(input.ageWear || "used but readable", 300);
  const extraNotes = clampImagePromptText(input.extraNotes || "(none)", 500);

  return `${IMAGE_PROMPT_SAFETY_PREAMBLE}

Create ONE high-detail fantasy tabletop handout image.

${categoryLine(input.itemCategory)}

User intent and detail (follow closely):
- Title / short name: ${title}
- Description (appearance, text on object, material, size hints): ${description}
- World / tone: ${settingHint}
- Look / art direction: ${style}
- Age and wear: ${ageWear}
- Extra: ${extraNotes}

Rendering:
- One clear hero object (or one flat document) suitable for a player handout, top-down or slight angle, neutral backdrop or plain surface, no busy backgrounds unless needed for scale.
- No watermarks, no logos, no UI, no real-world brand marks.
- No graphic gore, no sexualized presentation.
${categoryRenderingNotes(input.itemCategory)}
- Output only the image.`;
}
