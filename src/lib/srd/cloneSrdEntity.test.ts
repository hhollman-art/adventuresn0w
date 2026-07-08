import { describe, expect, it } from "vitest";
import { buildSrdClonePayload } from "@/lib/srd/cloneSrdEntity";

describe("buildSrdClonePayload", () => {
  it("prepares a spell clone with bundled markdown", async () => {
    const payload = await buildSrdClonePayload("spell:fireball", { syncOnly: true });
    expect(payload.entity.name).toBe("Fireball");
    expect(payload.targetStorage).toBe("custom-srd");
    expect(payload.markdown).toContain("Fireball");
  });

  it("routes equipment to item storage", async () => {
    const payload = await buildSrdClonePayload("equipment:acid-25-gp", { syncOnly: true });
    expect(payload.targetStorage).toBe("item");
    expect(payload.entity.name).toMatch(/acid/i);
  });

  it("rejects unknown entity ids", async () => {
    await expect(buildSrdClonePayload("spell:not-a-real-spell-id-xyz" as never)).rejects.toThrow(
      /not found/i,
    );
  });
});
