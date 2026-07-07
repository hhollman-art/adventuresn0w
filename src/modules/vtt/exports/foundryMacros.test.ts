import { describe, expect, it } from "vitest";
import { buildFoundryMacroPack } from "./foundryMacros";

describe("foundryMacros", () => {
  it("ships three documented macros for v11/v12", () => {
    const pack = buildFoundryMacroPack();
    expect(pack.macros).toHaveLength(3);
    expect(pack.macros.map((m) => m.name)).toEqual([
      "DMMS — Roll Initiative",
      "DMMS — Link Tokens to Actors",
      "DMMS — Import Party from Clipboard",
    ]);
    expect(pack.macros[0]?.command).toContain("canvas?.scene");
    expect(pack.macros[1]?.command).toContain("actorId");
    expect(pack.macros[2]?.command).toContain("clipboard.readText");
    expect(pack.readme).toContain("Foundry v11 and v12");
  });
});
