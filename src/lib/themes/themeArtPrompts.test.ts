import { describe, expect, it } from "vitest";
import { themeArtPublicPath } from "./themeArtPrompts";

describe("themeArtPublicPath", () => {
  it("maps theme slots to public PNG paths", () => {
    expect(themeArtPublicPath("wanderers-journal", "banner")).toBe(
      "/themes/wanderers-journal-banner.png",
    );
    expect(themeArtPublicPath("arcane-library", "sign")).toBe(
      "/themes/arcane-library-sign.png",
    );
  });
});
