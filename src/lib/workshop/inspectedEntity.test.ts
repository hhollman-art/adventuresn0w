import { describe, expect, it } from "vitest";
import { inspectMetaFromSelection } from "@/lib/workshop/inspectedEntity";
import { inspectEditMode } from "@/lib/workshop/inspectMarkdownSave";

describe("inspectMetaFromSelection", () => {
  it("uses id for user Creation Files", () => {
    const meta = inspectMetaFromSelection(
      { kind: "npc", id: "npc-1" },
      { label: "Mira", ciClass: "npc.record" },
    );
    expect(meta?.key).toBe("npc:npc-1");
    expect(meta?.cfId).toBe("npc-1");
  });

  it("uses entity id for SRD cards", () => {
    const meta = inspectMetaFromSelection(
      { kind: "srd-entity", entityId: "spell:fireball", name: "Fireball" },
      { label: "Fireball", ciClass: "spell.srd-entry" },
    );
    expect(meta?.key).toBe("srd-entity:spell:fireball");
    expect(meta?.cfId).toBeNull();
    expect(meta?.srdEntityId).toBe("spell:fireball");
  });
});

describe("inspectEditMode", () => {
  it("allows markdown edit for NPCs and items", () => {
    expect(inspectEditMode({ kind: "npc", id: "a" })).toBe("markdown");
    expect(inspectEditMode({ kind: "item", id: "a" })).toBe("markdown");
  });

  it("keeps SRD entries read-only", () => {
    expect(
      inspectEditMode({ kind: "srd-entity", entityId: "monster:goblin", name: "Goblin" }),
    ).toBe("readonly");
  });
});
