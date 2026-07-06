import type { AppThemeId } from "./types";

export type ThemeArtSlot = "banner" | "sign";

export type ThemeArtPrompt = {
  banner: string;
  sign: string;
};

/** OpenAI image prompts — run `npm run generate:theme-art` with OPENAI_API_KEY set. */
const STYLE =
  "masterpiece oil painting, richly detailed classic Dungeons and Dragons book-cover illustration, dramatic chiaroscuro lighting, jewel-toned saturated colors, sense of discovered treasure and wonder, no text, no letters, no people";

export const THEME_ART_PROMPTS: Record<AppThemeId, ThemeArtPrompt> = {
  forest: {
    banner: `Wide horizontal banner: moonbeams piercing an ancient enchanted forest clearing, colossal mossy oaks, glowing fireflies and golden pollen drifting, a faint treasure chest glow between roots, deep emerald greens with molten gold light, ${STYLE}`,
    sign: `Hand-carved dark oak tavern sign plank, ornate gilded scrollwork frame, moss and tiny mushrooms at the corners, warm torchlight glinting off gold leaf edges, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "dragon-den": {
    banner: `Wide horizontal banner: vast blue dragon hoard cavern, mountains of gold coins and sapphire crystal clusters, crackling lightning reflections on wet obsidian walls, electric cyan glow against deep navy shadow, ${STYLE}`,
    sign: `Obsidian stone tablet framed by overlapping sapphire dragon scales and gold coin inlay, faint lightning arcs at the rim, empty flat center panel for a title, straight-on flat view, ${STYLE}`,
  },
  "thieves-guild": {
    banner: `Wide horizontal banner: candlelit thieves' guild vault at midnight, spilled velvet pouches of gems and stolen gold, lockpicks and daggers on dark wood, amber lantern glow cutting through smoky shadow, crimson and burnished copper palette, ${STYLE}`,
    sign: `Riveted blackened-iron sign board over dark wood, sly mask motifs and copper filigree at the corners, warm lantern light rim, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "paladin-citadel": {
    banner: `Wide horizontal banner: radiant white marble citadel at dawn, sunbeams igniting gold pennants and silver armor stands, polished shields glittering like treasure, sapphire sky, ivory and royal gold palette, ${STYLE}`,
    sign: `White marble shield-shaped plaque with thick gold trim and blue enamel inlay, rays of holy light behind, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  "ice-tower": {
    banner: `Wide horizontal banner: crystalline ice wizard tower under a blazing aurora, frozen arcane sigils hovering midair, moonlight refracting through icicle prisms like diamonds, pale cyan and silver with violet aurora, ${STYLE}`,
    sign: `Frosted crystal sign frame edged with icicles and silver runes, aurora light refracting through the ice like gemstones, empty frosted center panel for a title, straight-on flat view, ${STYLE}`,
  },
  pirates: {
    banner: `Wide horizontal banner: pirate captain's quarters on a moonlit galleon, open treasure chest overflowing with doubloons and pearls, brass lanterns swaying, sea spray through the window, ocean navy and weathered gold palette, ${STYLE}`,
    sign: `Weathered ship-plank sign bound with tarred rope and brass nails, doubloons and a small anchor charm at the corners, moonlit teal highlights, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  hades: {
    banner: `Wide horizontal banner: obsidian cliffs over glowing lava rivers of the underworld, ember storms rising like burning gold dust, cursed treasure fused into black rock, ash sky lit from below, molten orange against charcoal black, ${STYLE}`,
    sign: `Charred basalt slab with cracks glowing molten orange, brimstone gems and blackened gold filigree at the edges, empty flat center for a title, straight-on flat view, ${STYLE}`,
  },
  astral: {
    banner: `Wide horizontal banner: floating rock isles adrift in the silver astral sea, swirling violet and rose nebulae, constellations like scattered diamonds, a distant glittering vault of stars, iridescent purple and starlight palette, ${STYLE}`,
    sign: `Floating silver frame etched with glowing runes, nebula shimmer and tiny stars caught in the border like gems, empty deep-violet center panel for a title, straight-on flat view, ${STYLE}`,
  },
};

export function themeArtPublicPath(id: AppThemeId, slot: ThemeArtSlot): string {
  return `/themes/${id}-${slot}.png`;
}
