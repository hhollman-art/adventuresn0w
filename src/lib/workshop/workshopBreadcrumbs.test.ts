import { describe, expect, it } from "vitest";
import { buildWorkshopBreadcrumbs } from "@/lib/workshop/workshopBreadcrumbs";

describe("buildWorkshopBreadcrumbs", () => {
  it("builds library shelf crumbs", () => {
    expect(
      buildWorkshopBreadcrumbs({
        pathname: "/library",
        workspace: "welcome",
        libraryCategory: "monsters",
      }),
    ).toEqual([
      { label: "Home", href: "/" },
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
    ).toEqual([{ label: "Home", href: "/" }, { label: "Adventure" }]);
  });
});
