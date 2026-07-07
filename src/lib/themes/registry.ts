import type { AppTheme, AppThemeId } from "./types";

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  "wanderers-journal": {
    id: "wanderers-journal",
    label: "Wanderer's Journal",
    scene: "Warm parchment, ink, and leather — a road-worn notebook at the prep table.",
    icon: "\u{1F4D3}",
    themeColor: "#e8dcc4",
  },
  "iron-tome": {
    id: "iron-tome",
    label: "Iron Tome",
    scene: "Forged iron, deep crimson, and muted gold — carved stone and old bindings.",
    icon: "\u2694\uFE0F",
    themeColor: "#1a1410",
  },
  "arcane-library": {
    id: "arcane-library",
    label: "Arcane Library",
    scene: "Cool vaults and glowing sigils — spell tomes lit by arcane light.",
    icon: "\u{1F52E}",
    themeColor: "#0e1220",
  },
  "royal-keep": {
    id: "royal-keep",
    label: "Royal Keep",
    scene: "Stone halls, pennants, and torch-warm banners — a lord's war room.",
    icon: "\u{1F3F0}",
    themeColor: "#1c1814",
  },
};

/** Default scene on first visit. */
export const DEFAULT_APP_THEME: AppThemeId = "wanderers-journal";

/** Order shown in the theme picker. */
export const APP_THEME_ORDER: AppThemeId[] = [
  "wanderers-journal",
  "iron-tome",
  "arcane-library",
  "royal-keep",
];

/** Maps retired scene ids to the closest new theme. */
export const LEGACY_THEME_MAP: Record<string, AppThemeId> = {
  forest: "wanderers-journal",
  "dragon-den": "arcane-library",
  "thieves-guild": "iron-tome",
  "paladin-citadel": "royal-keep",
  "ice-tower": "arcane-library",
  pirates: "wanderers-journal",
  hades: "iron-tome",
  astral: "arcane-library",
};

export function isAppThemeId(value: string): value is AppThemeId {
  return value in APP_THEMES;
}

export function resolveThemeId(value: string | null | undefined): AppThemeId {
  if (value && isAppThemeId(value)) return value;
  if (value && value in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[value]!;
  return DEFAULT_APP_THEME;
}
