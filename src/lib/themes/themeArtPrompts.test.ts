import { describe, expect, it } from "vitest";
import { themeArtPublicPath } from "./themeArtPrompts";

describe("themeArtPublicPath", () => {
  it("maps theme slots to public PNG paths", () => {
    expect(themeArtPublicPath("forest", "banner")).toBe("/themes/forest-banner.png");
    expect(themeArtPublicPath("astral", "sign")).toBe("/themes/astral-sign.png");
  });
});
