import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CfRelationship } from "@/lib/workshop/containerCf";
import type { VaultDragPayload } from "@/lib/vault/cfDragDrop";

const state = vi.hoisted(() => ({
  relationships: [] as CfRelationship[],
  links: [] as Record<string, string>[],
  unlinks: [] as Record<string, string>[],
  dialogs: 0,
}));

vi.mock("@/lib/workshop/containerRelationships", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workshop/containerRelationships")>(
    "@/lib/workshop/containerRelationships",
  );
  return {
    ...actual,
    recordContainerRelationship: async (rel: CfRelationship | CfRelationship[]) => {
      state.relationships = actual.upsertRelationshipRows(
        state.relationships,
        Array.isArray(rel) ? rel : [rel],
      );
      return state.relationships;
    },
    removeContainerRelationship: async (id: string) => {
      state.relationships = state.relationships.filter((r) => r.id !== id);
      return state.relationships;
    },
    loadContainerRelationshipsFor: async (parentId: string) =>
      state.relationships.filter((r) => r.parentId === parentId),
  };
});

vi.mock("@/lib/campaigns", async () => {
  const actual = await vi.importActual<typeof import("@/lib/campaigns")>("@/lib/campaigns");
  return {
    ...actual,
    linkToCampaign: async (_id: string, link: Record<string, string>) => {
      state.links.push(link);
      return [];
    },
    unlinkFromCampaign: async (_id: string, link: Record<string, string>) => {
      state.unlinks.push(link);
      return [];
    },
  };
});

vi.mock("@/lib/workshop/librarySync", () => ({ scheduleLibrarySnapshot: () => undefined }));

const { linkVaultPayloadToCampaign, unlinkSrdInstanceFromCampaign } = await import(
  "./containerMoveWritePath"
);

function srdPayload(id: string, ciClass: VaultDragPayload["ciClass"], title: string): VaultDragPayload {
  return { vaultKind: "cf", id, ciClass, title, detail: `static-srd:${id}` };
}

describe("campaign drops hydrate SRD references", () => {
  beforeEach(() => {
    state.relationships = [];
    state.links = [];
    state.unlinks = [];
    state.dialogs = 0;
    vi.stubGlobal("window", {
      confirm: () => {
        state.dialogs += 1;
        return true;
      },
      alert: () => {
        state.dialogs += 1;
      },
      dispatchEvent: () => true,
    });
  });

  it("instantiates a dropped spell with the provenance triple and indexes it", async () => {
    const result = await linkVaultPayloadToCampaign({
      campaignId: "camp-1",
      payload: srdPayload("spell:fireball", "spell.srd-entry", "Fireball"),
      preferredSlot: "encounters",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.instanceId).toMatch(/^instance_spell_fireball_/);
    expect(result.relationship).toMatchObject({
      parentId: "camp-1",
      parentCiClass: "campaign.record",
      childId: result.instanceId,
      slot: "encounters",
      _source: "SRD",
      sourceSrdEntityId: "spell:fireball",
    });
    expect(state.relationships).toHaveLength(1);
    // The global SRD id is never linked as a campaign child.
    expect(state.links).toHaveLength(0);
    expect(state.dialogs).toBe(0);
  });

  it("gives each monster drop its own instance and keeps the deduped monsterIds ref", async () => {
    const goblin = srdPayload("monster:goblin-warrior", "monster.srd-entry", "Goblin Warrior");
    const first = await linkVaultPayloadToCampaign({ campaignId: "camp-1", payload: goblin, preferredSlot: "loot" });
    const second = await linkVaultPayloadToCampaign({ campaignId: "camp-1", payload: goblin });
    expect(first.ok && second.ok).toBe(true);
    expect(state.relationships.map((r) => r.slot)).toEqual(["encounters", "encounters"]);
    expect(new Set(state.relationships.map((r) => r.instanceId)).size).toBe(2);
    expect(state.links).toEqual([
      { monsterId: "monster:goblin-warrior" },
      { monsterId: "monster:goblin-warrior" },
    ]);
  });

  it("keeps a rule dropped in any bucket as an instance in that bucket", async () => {
    const result = await linkVaultPayloadToCampaign({
      campaignId: "camp-1",
      payload: srdPayload("condition:prone", "rules.srd-entry", "Prone"),
      preferredSlot: "members",
    });
    expect(result.ok).toBe(true);
    expect(state.relationships[0]).toMatchObject({ slot: "members", _source: "SRD" });
  });

  it("parks a rule in the scene slot, even when its id is missing from the corpus", async () => {
    const known = await linkVaultPayloadToCampaign({
      campaignId: "camp-1",
      payload: srdPayload("condition:prone-condition", "rules.srd-entry", "Prone"),
      preferredSlot: "scene",
    });
    const stale = await linkVaultPayloadToCampaign({
      campaignId: "camp-1",
      payload: srdPayload("condition:retired-in-older-build", "rules.srd-entry", "Old rule"),
      preferredSlot: "scene",
    });
    expect(known.ok && stale.ok).toBe(true);
    expect(state.relationships.map((r) => [r.slot, r._source])).toEqual([
      ["scene", "SRD"],
      ["scene", "SRD"],
    ]);
  });

  it("unlinks the monsterIds ref only when the last instance is removed", async () => {
    const goblin = srdPayload("monster:goblin-warrior", "monster.srd-entry", "Goblin Warrior");
    await linkVaultPayloadToCampaign({ campaignId: "camp-1", payload: goblin });
    await linkVaultPayloadToCampaign({ campaignId: "camp-1", payload: goblin });
    const [a, b] = state.relationships;

    await unlinkSrdInstanceFromCampaign("camp-1", a!);
    expect(state.unlinks).toHaveLength(0);
    await unlinkSrdInstanceFromCampaign("camp-1", b!);
    expect(state.unlinks).toEqual([{ monsterId: "monster:goblin-warrior" }]);
    expect(state.relationships).toHaveLength(0);
  });
});
