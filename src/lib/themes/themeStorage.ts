import { DEFAULT_APP_THEME, isAppThemeId } from "./registry";
import type { AppThemeId } from "./types";

export const THEME_STORAGE_KEY = "ddeasy-app-theme";

export function readStoredTheme(): AppThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && isAppThemeId(raw)) return raw;
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_APP_THEME;
}

export function writeStoredTheme(id: AppThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* localStorage unavailable */
  }
}
