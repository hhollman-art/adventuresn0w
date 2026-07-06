import { describe, expect, it } from "vitest";
import {
  APP_THEME_ORDER,
  APP_THEMES,
  DEFAULT_APP_THEME,
  isAppThemeId,
} from "./registry";

describe("theme registry", () => {
  it("defaults to The Dark Forest", () => {
    expect(DEFAULT_APP_THEME).toBe("forest");
    expect(APP_THEMES.forest.label).toBe("The Dark Forest");
  });

  it("lists all eight scenes in picker order", () => {
    expect(APP_THEME_ORDER).toHaveLength(8);
    expect(APP_THEME_ORDER.map((id) => APP_THEMES[id].label)).toEqual([
      "The Dark Forest",
      "Blue Dragon Den",
      "The Thieves Guild",
      "Paladin's Citadel",
      "The Ice Wizard Tower",
      "Pirates Ahoy!",
      "Planes of Hades",
      "The Astral Plane",
    ]);
  });

  it("validates theme ids", () => {
    expect(isAppThemeId("forest")).toBe(true);
    expect(isAppThemeId("dragon-den")).toBe(true);
    expect(isAppThemeId("not-a-theme")).toBe(false);
  });
});
