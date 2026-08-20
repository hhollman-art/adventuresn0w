/**
 * DMMS Command Center — WCAG AAA contrast palette
 * Bound on `.command-center-root` so Prep/Live chrome stays crisp regardless of parchment themes.
 */
export const DMMS_CONTRAST = {
  canvas: "#0B0E14",
  panel: "#161B22",
  panelHover: "#1F242C",
  border: "#21262D",
  borderStrong: "#30363D",
  text: "#F0F6FC",
  textSoft: "#C9D1D9",
  muted: "#8B949E",
  accent: "#E3B341",
  accentBg: "#D4A32D",
  link: "#58A6FF",
  hp: "#F85149",
  spell: "#38BDF8",
  success: "#3FB950",
} as const;

export type DmmsContrastToken = keyof typeof DMMS_CONTRAST;
