import { describe, expect, it } from "vitest";
import {
  APP_THEME_ORDER,
  APP_THEMES,
  DEFAULT_APP_THEME,
  isAppThemeId,
  resolveThemeId,
} from "./registry";

describe("theme registry", () => {
  it("defaults to Wanderer's Journal", () => {
    expect(DEFAULT_APP_THEME).toBe("wanderers-journal");
    expect(APP_THEMES["wanderers-journal"].label).toBe("Wanderer's Journal");
  });

  it("lists all four D&D scenes in picker order", () => {
    expect(APP_THEME_ORDER).toHaveLength(4);
    expect(APP_THEME_ORDER.map((id) => APP_THEMES[id].label)).toEqual([
      "Wanderer's Journal",
      "Iron Tome",
      "Arcane Library",
      "Royal Keep",
    ]);
  });

  it("validates theme ids", () => {
    expect(isAppThemeId("wanderers-journal")).toBe(true);
    expect(isAppThemeId("arcane-library")).toBe(true);
    expect(isAppThemeId("forest")).toBe(false);
  });

  it("maps retired theme ids to new palettes", () => {
    expect(resolveThemeId("forest")).toBe("wanderers-journal");
    expect(resolveThemeId("dragon-den")).toBe("arcane-library");
    expect(resolveThemeId("not-a-theme")).toBe(DEFAULT_APP_THEME);
  });
});
