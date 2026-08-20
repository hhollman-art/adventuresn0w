import { describe, expect, it } from "vitest";
import {
  hrefForSessionMode,
  isCommandCenterSkipPath,
  PREP_LIBRARY_HREF,
  LIVE_SESSION_HREF,
  sessionModeFromPathname,
} from "@/lib/shell/commandCenterRoutes";

describe("commandCenterRoutes", () => {
  it("skips player portal and auth routes", () => {
    expect(isCommandCenterSkipPath("/login")).toBe(true);
    expect(isCommandCenterSkipPath("/table/player")).toBe(true);
    expect(isCommandCenterSkipPath("/library")).toBe(false);
    expect(isCommandCenterSkipPath("/table")).toBe(false);
  });

  it("treats the Virtual Table as Live Session Mode", () => {
    expect(sessionModeFromPathname("/table")).toBe("live");
    expect(sessionModeFromPathname("/library")).toBe("prep");
    expect(sessionModeFromPathname("/campaigns")).toBe("prep");
  });

  it("maps mode toggles onto existing routes", () => {
    expect(hrefForSessionMode("live", "/library")).toBe(LIVE_SESSION_HREF);
    expect(hrefForSessionMode("prep", "/library")).toBe("/library");
    expect(hrefForSessionMode("prep", "/table")).toBe(PREP_LIBRARY_HREF);
  });
});
