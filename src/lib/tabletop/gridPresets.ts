import type { MapDistanceUnits } from "@/lib/mapDistanceUnits";
import type { MapImageSize } from "@/lib/mapImagePrompt";
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS } from "@/lib/tabletop/session";

export type VttGridPreset = { label: string; cols: number; rows: number };

/** Grid dimension presets shared by the Virtual Table and workshop battle-map generation. */
export const VTT_GRID_PRESETS: VttGridPreset[] = [
  { label: "20 × 15", cols: 20, rows: 15 },
  { label: "30 × 20", cols: 30, rows: 20 },
  { label: "40 × 30", cols: 40, rows: 30 },
  { label: "60 × 40", cols: 60, rows: 40 },
];

export const DEFAULT_VTT_GRID_COLS = DEFAULT_GRID_COLS;
export const DEFAULT_VTT_GRID_ROWS = DEFAULT_GRID_ROWS;

export const MIN_VTT_GRID_SIDE = 4;
export const MAX_VTT_GRID_SIDE = 100;

export function findVttGridPreset(cols: number, rows: number): VttGridPreset | undefined {
  return VTT_GRID_PRESETS.find((p) => p.cols === cols && p.rows === rows);
}

export function clampVttGridDimension(value: unknown, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : Math.round(Number(String(value ?? "").trim()));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_VTT_GRID_SIDE, Math.max(MIN_VTT_GRID_SIDE, n));
}

export function clampVttGridSize(
  cols: unknown,
  rows: unknown,
  fallbackCols = DEFAULT_VTT_GRID_COLS,
  fallbackRows = DEFAULT_VTT_GRID_ROWS,
): { cols: number; rows: number } {
  return {
    cols: clampVttGridDimension(cols, fallbackCols),
    rows: clampVttGridDimension(rows, fallbackRows),
  };
}

export function buildBattleMapGridNotes(
  cols: number,
  rows: number,
  units: MapDistanceUnits = "imperial",
): string {
  const cell = units === "metric" ? "1.5 m × 1.5 m" : "5 ft × 5 ft";
  const sizeLine = `**exactly ${cols} columns × ${rows} rows** (matches Virtual Table framing)`;
  return `**${cell}** tactical scale; ${sizeLine}. **No visible grid lines** on the art—clean illustrated floor plan only (the Virtual Table overlays the grid at play). **Clear** walls and walkable space; label key rooms from context.`;
}

/** Generic fallback when VTT dimensions are not supplied to the image API. */
export function defaultBattleGridNotesFallback(units: MapDistanceUnits = "imperial"): string {
  return units === "metric"
    ? "Strict **1.5 m × 1.5 m** tactical scale; **illustrated floor plan without grid lines**—Virtual Table overlays the grid; encounter-scale zoom"
    : "Strict 5 ft × 5 ft tactical scale; **illustrated floor plan without grid lines**—Virtual Table overlays the grid; encounter-scale zoom";
}

export function buildBattleMapScenePromptLead(
  cols: number,
  rows: number,
  units: MapDistanceUnits = "imperial",
): string {
  const cell = units === "metric" ? "1.5 m × 1.5 m" : "5 ft × 5 ft";
  const sizeLine = `**exactly ${cols} columns × ${rows} rows**`;
  return `Generate ONE top-down **illustrated battle map without printed grid lines** for miniature play: compose at **${cell}** logical scale—${sizeLine} framing—but **do not draw** square grid lines, graph paper, or cell borders. **Clear** wall/door/pit edges, **rich** floor materials—**orthogonal plan only**, not isometric. A virtual tabletop will overlay the grid. Short labels for key areas from the scene.`;
}

/** Pick the closest OpenAI image aspect ratio for a VTT grid. */
export function imageSizeForVttGrid(cols: number, rows: number): MapImageSize {
  const ratio = cols / Math.max(1, rows);
  if (ratio > 1.05) return "1536x1024";
  if (ratio < 0.95) return "1024x1536";
  return "1024x1024";
}
