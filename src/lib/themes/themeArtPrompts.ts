import type { AppThemeId } from "./types";

export type ThemeArtSlot = "banner" | "sign";

export type ThemeArtPrompt = {
  banner: string;
  sign: string;
};

/** OpenAI image prompts — run `npm run generate:theme-art` with OPENAI_API_KEY set. */
const STYLE =
  "atmospheric Dungeons and Dragons tabletop illustration, subtle texture, readable composition, no text, no letters, no people";

export const THEME_ART_PROMPTS: Record<AppThemeId, ThemeArtPrompt> = {
  "wanderers-journal": {
    banner: `Wide horizontal banner: open leather journal on a wooden prep table, warm parchment pages, ink quill, soft candlelight, muted gold accents, ${STYLE}`,
    sign: `Weathered leather-bound journal cover with brass clasp, faint ink stains, warm parchment tones, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "iron-tome": {
    banner: `Wide horizontal banner: iron-bound tome on dark stone, deep crimson cloth, muted gold filigree, torch shadows, carved relief, ${STYLE}`,
    sign: `Iron-studded book cover with deep red leather and dull gold corners, stone texture behind, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "arcane-library": {
    banner: `Wide horizontal banner: arcane library vault, cool blue-violet glow, floating runes, crystal light on dark shelves, ${STYLE}`,
    sign: `Crystal-framed sign with glowing arcane runes at the border, cool indigo and silver palette, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "royal-keep": {
    banner: `Wide horizontal banner: stone keep war room, warm torchlight, hanging banners, carved battlements, muted gold trim, ${STYLE}`,
    sign: `Stone shield plaque with banner cloth and warm gold trim, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
};

export function themeArtPublicPath(id: AppThemeId, slot: ThemeArtSlot): string {
  return `/themes/${id}-${slot}.png`;
}
