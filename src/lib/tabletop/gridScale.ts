/** Pixels per grid cell on the battle stage (higher = sharper maps and tokens). */
export const CELL_PX = 70;

export const DEFAULT_FEET_PER_CELL = 5;

/** Common D&D battle-map scales. Each cell is a square of this many feet per side. */
export const FEET_PER_CELL_OPTIONS = [5, 10] as const;

export type FeetPerCell = (typeof FEET_PER_CELL_OPTIONS)[number];

/** D&D 5e creature space (ft per side) for each token size category. */
export const TOKEN_SIZE_CATEGORY = [1, 2, 3, 4] as const;
export type TokenSizeCategory = (typeof TOKEN_SIZE_CATEGORY)[number];

export const TOKEN_SIZE_LABEL: Record<TokenSizeCategory, string> = {
  1: "Medium",
  2: "Large",
  3: "Huge",
  4: "Gargantuan",
};

/** Side length in feet for each size category (Small uses Medium space on the map). */
export const CREATURE_SPACE_FT: Record<TokenSizeCategory, number> = {
  1: 5,
  2: 10,
  3: 15,
  4: 20,
};

/** Thicker grid lines every this many feet (e.g. 25 ft markers). */
export const MAJOR_LINE_EVERY_FEET = 25;

export function clampFeetPerCell(value: unknown): FeetPerCell {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : DEFAULT_FEET_PER_CELL;
  return (FEET_PER_CELL_OPTIONS as readonly number[]).includes(n)
    ? (n as FeetPerCell)
    : DEFAULT_FEET_PER_CELL;
}

export function clampTokenSizeCategory(value: unknown): TokenSizeCategory {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 1;
  return (TOKEN_SIZE_CATEGORY as readonly number[]).includes(n) ? (n as TokenSizeCategory) : 1;
}

export function creatureSpaceFeet(sizeCategory: number): number {
  return CREATURE_SPACE_FT[clampTokenSizeCategory(sizeCategory)];
}

/** Grid squares occupied per side at the current map scale. */
export function tokenCellFootprint(sizeCategory: number, feetPerCell: number): number {
  const feet = Math.max(1, feetPerCell);
  return creatureSpaceFeet(sizeCategory) / feet;
}

/** Major grid lines every N cells for the chosen square size. */
export function majorLineEveryCells(feetPerCell: number): number {
  return Math.max(1, Math.round(MAJOR_LINE_EVERY_FEET / Math.max(1, feetPerCell)));
}

/** Snap increment when placing tokens (supports half-square on 10 ft grids). */
export function positionSnapStep(cellFootprint: number): number {
  if (Number.isInteger(cellFootprint) && cellFootprint >= 1) return 1;
  const frac = cellFootprint % 1;
  return frac > 0 ? frac : cellFootprint;
}

export function formatTokenSizeOption(sizeCategory: TokenSizeCategory, feetPerCell: number): string {
  const cells = tokenCellFootprint(sizeCategory, feetPerCell);
  const ft = CREATURE_SPACE_FT[sizeCategory];
  if (cells === 1) return `${TOKEN_SIZE_LABEL[sizeCategory]} (${ft} ft · 1 sq)`;
  if (Number.isInteger(cells)) return `${TOKEN_SIZE_LABEL[sizeCategory]} (${ft} ft · ${cells}×${cells} sq)`;
  return `${TOKEN_SIZE_LABEL[sizeCategory]} (${ft} ft · ${cells.toFixed(1)} sq/side)`;
}

export function formatFeetPerCell(feetPerCell: number): string {
  return `${feetPerCell} ft squares`;
}

export function stagePixelSize(cols: number, rows: number): { width: number; height: number } {
  return { width: cols * CELL_PX, height: rows * CELL_PX };
}