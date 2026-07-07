import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_BANNER_VARIANTS,
  DEFAULT_ANNOUNCEMENT_CONFIG,
  announcementDismissKey,
} from "./announcementConfig";

describe("announcementConfig", () => {
  it("defines three RPG theme variants", () => {
    expect(Object.keys(ANNOUNCEMENT_BANNER_VARIANTS)).toHaveLength(3);
    expect(ANNOUNCEMENT_BANNER_VARIANTS["arcane-amber"].label).toBe("Arcane Amber");
  });

  it("defaults to inactive", () => {
    expect(DEFAULT_ANNOUNCEMENT_CONFIG.active).toBe(false);
  });

  it("builds dismiss keys from updatedAt", () => {
    expect(announcementDismissKey("2026-01-01T00:00:00.000Z")).toContain("dismissed");
  });
});
