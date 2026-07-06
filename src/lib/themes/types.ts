/** App-wide visual theme identifiers — one scene per theme. */
export type AppThemeId =
  | "forest"
  | "dragon-den"
  | "thieves-guild"
  | "paladin-citadel"
  | "ice-tower"
  | "pirates"
  | "hades"
  | "astral";

export type AppTheme = {
  id: AppThemeId;
  label: string;
  /** Plain-language scene blurb for the theme picker. */
  scene: string;
  /** Short emoji or symbol shown beside the name in lists. */
  icon: string;
  /** Browser chrome color when this scene is active. */
  themeColor: string;
};
