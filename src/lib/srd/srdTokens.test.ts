import { describe, expect, it } from "vitest";
import {
  expandSrdTokensForDisplay,
  findSrdTokensInText,
  formatSrdToken,
  parseSrdToken,
} from "@/lib/srd/srdTokens";

describe("srdTokens", () => {
  it("formats and parses entity tokens", () => {
    const token = formatSrdToken("spell:fireball");
    expect(token).toBe("[[srd:spell:fireball]]");
    expect(parseSrdToken(token)).toBe("spell:fireball");
  });

  it("finds tokens in markdown", () => {
    const text = "Cast [[srd:spell:fireball]] at the goblins.";
    expect(findSrdTokensInText(text)).toEqual(["spell:fireball"]);
  });

  it("expands tokens for display", () => {
    const text = "See [[srd:spell:fireball]] for damage.";
    expect(expandSrdTokensForDisplay(text)).toContain("[Fireball](srd:spell:fireball)");
  });
});
