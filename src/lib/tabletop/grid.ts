export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): { x: number; y: number } | null {
  const m = /^(-?\d+),(-?\d+)$/.exec(key);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

/** Cells inside a square brush of the given radius (0 = single cell), clipped to the grid. */
export function brushCells(
  centerX: number,
  centerY: number,
  radius: number,
  cols: number,
  rows: number,
): string[] {
  const keys: string[] = [];
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x >= 0 && y >= 0 && x < cols && y < rows) keys.push(cellKey(x, y));
    }
  }
  return keys;
}

export function addRevealed(revealed: string[], keys: string[]): string[] {
  const set = new Set(revealed);
  let changed = false;
  for (const k of keys) {
    if (!set.has(k)) {
      set.add(k);
      changed = true;
    }
  }
  return changed ? [...set] : revealed;
}

export function removeRevealed(revealed: string[], keys: string[]): string[] {
  const drop = new Set(keys);
  const next = revealed.filter((k) => !drop.has(k));
  return next.length === revealed.length ? revealed : next;
}

export function allCells(cols: number, rows: number): string[] {
  const keys: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) keys.push(cellKey(x, y));
  }
  return keys;
}

import { positionSnapStep } from "./gridScale";

/** Clamp a token's top-left cell so its full footprint stays on the grid. */
export function clampTokenPosition(
  x: number,
  y: number,
  /** Side length in grid cells (from tokenCellFootprint). */
  cellFootprint: number,
  cols: number,
  rows: number,
  snap: boolean,
): { x: number; y: number } {
  const maxX = Math.max(0, cols - cellFootprint);
  const maxY = Math.max(0, rows - cellFootprint);
  let nx = Math.min(Math.max(x, 0), maxX);
  let ny = Math.min(Math.max(y, 0), maxY);
  if (snap) {
    const step = positionSnapStep(cellFootprint);
    nx = Math.round(nx / step) * step;
    ny = Math.round(ny / step) * step;
    nx = Math.min(Math.max(nx, 0), maxX);
    ny = Math.min(Math.max(ny, 0), maxY);
  }
  return { x: nx, y: ny };
}
