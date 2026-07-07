/** App-wide visual theme identifiers — D&D-inspired scene palettes. */
export type AppThemeId =
  | "wanderers-journal"
  | "iron-tome"
  | "arcane-library"
  | "royal-keep";

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
