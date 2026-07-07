import { describe, expect, it } from "vitest";
import { THE_HEARTH } from "@/lib/workplace/forgeLexicon";
import { buildWorkshopBreadcrumbs } from "@/lib/workshop/workshopBreadcrumbs";

describe("buildWorkshopBreadcrumbs", () => {
  it("shows only The Hearth on the welcome page", () => {
    expect(
      buildWorkshopBreadcrumbs({
        pathname: "/",
        workspace: "welcome",
      }),
    ).toEqual([{ label: THE_HEARTH }]);
  });

  it("builds library shelf crumbs", () => {
    expect(
      buildWorkshopBreadcrumbs({
        pathname: "/library",
        workspace: "welcome",
        libraryCategory: "monsters",
      }),
    ).toEqual([
      { label: THE_HEARTH, href: "/" },
      { label: "Library", href: "/library" },
      { label: "Bestiary" },
    ]);
  });

  it("builds creation workspace crumbs on home route", () => {
    expect(
      buildWorkshopBreadcrumbs({
        pathname: "/",
        workspace: "adventure",
      }),
    ).toEqual([{ label: THE_HEARTH, href: "/" }, { label: "Adventure" }]);
  });
});
