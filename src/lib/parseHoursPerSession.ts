/**
 * Half-hour session duration helpers — avoid IEEE 754 artifacts from
 * `Math.round(n * 2) / 2` (e.g. 3.5000000000000004).
 */

const MIN_HOURS = 0.5;
const MAX_HOURS = 12;
const DEFAULT_HOURS = 3;

/**
 * Parse and clamp hours-per-session to 0.5-hour steps in [0.5, 12].
 * Uses integer half-hour counts + fixed-precision string rounding for a clean float.
 */
export function parseHoursPerSession(
  value: unknown,
  fallback: number = DEFAULT_HOURS,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const halfSteps = Math.round(n * 2);
  const clampedSteps = Math.min(MAX_HOURS * 2, Math.max(MIN_HOURS * 2, halfSteps));
  return Number((clampedSteps / 2).toFixed(1));
}

/** Normalize an already-numeric hours value the same way (UI + prompt formatters). */
export function normalizeHoursPerSession(hours: number): number {
  return parseHoursPerSession(hours, DEFAULT_HOURS);
}
