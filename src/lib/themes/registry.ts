import type { AppTheme, AppThemeId } from "./types";

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  forest: {
    id: "forest",
    label: "The Dark Forest",
    scene: "Moonlit woods — moss, branches, and torch-gold at the prep table.",
    icon: "\u{1F332}",
    themeColor: "#122018",
  },
  "dragon-den": {
    id: "dragon-den",
    label: "Blue Dragon Den",
    scene: "Lightning-crack cavern — sapphire hoard and ancient wyrm glow.",
    icon: "\u{1F409}",
    themeColor: "#0a1828",
  },
  "thieves-guild": {
    id: "thieves-guild",
    label: "The Thieves Guild",
    scene: "Lantern-lit alleys — shadow, brick, and whispered contracts.",
    icon: "\u{1F576}\uFE0F",
    themeColor: "#1a1418",
  },
  "paladin-citadel": {
    id: "paladin-citadel",
    label: "Paladin's Citadel",
    scene: "Sunlit battlements — marble, pennants, and holy gold.",
    icon: "\u{1F6E1}\uFE0F",
    themeColor: "#2a3040",
  },
  "ice-tower": {
    id: "ice-tower",
    label: "The Ice Wizard Tower",
    scene: "Frost spire — aurora ice, arcane sigils, and silent snow.",
    icon: "\u{1F9CA}",
    themeColor: "#142028",
  },
  pirates: {
    id: "pirates",
    label: "Pirates Ahoy!",
    scene: "Moonlit main deck — salt spray, timber, and treasure maps.",
    icon: "\u{1F3F4}\u200D\u2620\uFE0F",
    themeColor: "#0f1a22",
  },
  hades: {
    id: "hades",
    label: "Planes of Hades",
    scene: "Obsidian wastes — ember rivers and ash-grey sky.",
    icon: "\u{1F525}",
    themeColor: "#1a100c",
  },
  astral: {
    id: "astral",
    label: "The Astral Plane",
    scene: "Silver void — drifting isles, nebula light, and distant stars.",
    icon: "\u{1F30C}",
    themeColor: "#120818",
  },
};

/** Default scene on first visit. */
export const DEFAULT_APP_THEME: AppThemeId = "forest";

/** Order shown in the theme picker. */
export const APP_THEME_ORDER: AppThemeId[] = [
  "forest",
  "dragon-den",
  "thieves-guild",
  "paladin-citadel",
  "ice-tower",
  "pirates",
  "hades",
  "astral",
];

export function isAppThemeId(value: string): value is AppThemeId {
  return value in APP_THEMES;
}
