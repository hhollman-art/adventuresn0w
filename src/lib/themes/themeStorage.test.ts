import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_APP_THEME } from "./registry";
import { readStoredTheme, writeStoredTheme, THEME_STORAGE_KEY } from "./themeStorage";

describe("themeStorage", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns default when nothing stored", () => {
    expect(readStoredTheme()).toBe(DEFAULT_APP_THEME);
  });

  it("round-trips a valid theme id", () => {
    writeStoredTheme("pirates");
    expect(storage[THEME_STORAGE_KEY]).toBe("pirates");
    expect(readStoredTheme()).toBe("pirates");
  });

  it("ignores invalid stored values", () => {
    storage[THEME_STORAGE_KEY] = "invalid-theme";
    expect(readStoredTheme()).toBe(DEFAULT_APP_THEME);
  });
});
