import { describe, expect, it } from "vitest";
import {
  parseRealmSize,
  REALM_SIZES,
  REALM_SIZE_LABEL,
  buildRealmUserMessage,
} from "@/lib/realmPrompt";

describe("realm sizes", () => {
  it("includes city in the selectable scope list", () => {
    expect(REALM_SIZES).toContain("city");
    expect(REALM_SIZE_LABEL.city.label).toContain("City");
  });

  it("parses city from API input", () => {
    expect(parseRealmSize("city")).toBe("city");
    expect(parseRealmSize("invalid")).toBe("country");
  });

  it("asks for Politics and Trade at city scope", () => {
    const msg = buildRealmUserMessage({
      realmSize: "city",
      titleHint: "Port of Ash",
      description: "A harbor metropolis with rival guilds.",
      extraNotes: "",
    });
    expect(msg).toContain("## Politics section");
    expect(msg).toContain("Urban **politics**");
    expect(msg).toContain("City trade");
  });
});
