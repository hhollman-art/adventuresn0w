import { APP_THEMES } from "./registry";
import type { AppThemeId } from "./types";
import { writeStoredTheme } from "./themeStorage";

export function applyAppTheme(id: AppThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", APP_THEMES[id].themeColor);
  writeStoredTheme(id);
  window.dispatchEvent(new CustomEvent("ddeasy:theme-changed", { detail: { id } }));
}
