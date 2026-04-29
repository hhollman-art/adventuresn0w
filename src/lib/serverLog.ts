type LogFields = Record<string, string | number | undefined>;

/**
 * Structured server log for API failures (never log secrets or full user bodies).
 */
export function logApiWarning(event: string, fields: LogFields): void {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`);
  console.warn(`[api] ${event}${parts.length ? ` ${parts.join(" ")}` : ""}`);
}

export function logApiError(event: string, fields: LogFields): void {
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`);
  console.error(`[api] ${event}${parts.length ? ` ${parts.join(" ")}` : ""}`);
}
