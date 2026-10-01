import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LORE_VAULT_CONTAINER_ID,
  findParkedLoreVaultInstance,
  loadLoreVaultRows,
  parkInLoreVault,
  purgeFromLoreVault,
  reassignLoreVaultInstance,
  restoreLoreVaultRows,
} from "./loreVaultContainer";
import { loadVaultParkingLot } from "./vaultParking";
import {
  loadContainerRelationships,
  recordContainerRelationship,
  removeContainerRelationshipsForChild,
} from "@/lib/workshop/containerRelationships";
import type { VaultDragPayload } from "./cfDragDrop";
import type { CfRelationship } from "@/lib/workshop/containerCf";

const goblin: VaultDragPayload = {
  vaultKind: "cf",
  id: "monster:goblin",
  ciClass: "monster.srd-entry",
  title: "Goblin",
  detail: "static-srd:monster:goblin",
};

function campaignLink(childId: string): CfRelationship {
  return {
    id: `camp-1:members:${childId}`,
    parentId: "camp-1",
    parentCiClass: "campaign.record",
    childId,
    childCiClass: "character.sheet",
    kind: "link",
    slot: "members",
    label: "Aria",
    active: true,
    createdAt: new Date().toISOString(),
  };
}

describe("loreVaultContainer", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        localStorage: localStorageMock,
        dispatchEvent: () => true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("parks an SRD drag as a local instance on LORE_VAULT_CONTAINER", async () => {
    const result = await parkInLoreVault(goblin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rel = result.relationship!;
    expect(rel.parentId).toBe(LORE_VAULT_CONTAINER_ID);
    expect(rel.parentCiClass).toBe("campaign.lore-vault");
    expect(rel.kind).toBe("park");
    expect(rel.slot).toBe("vault");
    expect(rel.childId).toMatch(/^instance_/);
    expect(rel.childId).toBe(rel.instanceId);
    expect(rel._source).toBe("SRD");
    expect(rel.sourceSrdEntityId).toBe("monster:goblin");

    const lot = await loadVaultParkingLot();
    expect(lot).toHaveLength(1);
    expect(lot[0]!.id).toBe(rel.instanceId);
    expect(lot[0]!.detail.startsWith("static-srd:")).toBe(false);
  });

  it("does not stack duplicate copies of the same SRD entity", async () => {
    await parkInLoreVault(goblin);
    const again = await parkInLoreVault(goblin);
    expect(again.ok).toBe(true);
    expect(await loadLoreVaultRows()).toHaveLength(1);
  });

  it("refuses to re-park a card dragged from the vault itself", async () => {
    const result = await parkInLoreVault({
      ...goblin,
      container: {
        parentId: LORE_VAULT_CONTAINER_ID,
        parentCiClass: "campaign.lore-vault",
        relationshipId: null,
        slot: "vault",
        holdKind: "park",
      },
    });
    expect(result.ok).toBe(false);
  });

  it("re-parents a parked instance onto a campaign (same instanceId, vault row gone)", async () => {
    const parked = await parkInLoreVault(goblin);
    if (!parked.ok) throw new Error("park failed");
    const instanceId = parked.instanceId!;
    const row = await findParkedLoreVaultInstance({ ...goblin, id: instanceId });
    expect(row).not.toBeNull();

    const moved = await reassignLoreVaultInstance({
      row: row!,
      parent: { id: "camp-1", ciClass: "campaign.record" },
      slot: "encounters",
    });
    expect(moved.parentId).toBe("camp-1");
    expect(moved.childId).toBe(instanceId);
    expect(moved.id).toBe(`camp-1:encounters:${instanceId}`);

    const all = await loadContainerRelationships();
    expect(all.filter((r) => r.childId === instanceId)).toHaveLength(1);
    expect(await loadLoreVaultRows()).toEqual([]);
  });

  it("purges a parked instance everywhere via removeContainerRelationshipsForChild(childId)", async () => {
    const parked = await parkInLoreVault(goblin);
    if (!parked.ok) throw new Error("park failed");
    const removed = await purgeFromLoreVault(parked.instanceId!);
    expect(removed).toHaveLength(1);
    expect(await loadContainerRelationships()).toEqual([]);

    await restoreLoreVaultRows(removed);
    expect(await loadLoreVaultRows()).toHaveLength(1);
  });

  it("purging a parked Library CF keeps its campaign links", async () => {
    await recordContainerRelationship(campaignLink("hero-1"));
    await parkInLoreVault({
      vaultKind: "cf",
      id: "hero-1",
      ciClass: "character.sheet",
      title: "Aria",
      detail: "",
    });
    expect(await loadLoreVaultRows()).toHaveLength(1);

    await purgeFromLoreVault("hero-1");
    const all = await loadContainerRelationships();
    expect(all).toHaveLength(1);
    expect(all[0]!.parentId).toBe("camp-1");
  });

  it("keeps the two-argument removeContainerRelationshipsForChild scoped to one parent", async () => {
    await recordContainerRelationship(campaignLink("hero-2"));
    await parkInLoreVault({
      vaultKind: "cf",
      id: "hero-2",
      ciClass: "character.sheet",
      title: "Bram",
      detail: "",
    });
    await removeContainerRelationshipsForChild(LORE_VAULT_CONTAINER_ID, "hero-2");
    const all = await loadContainerRelationships();
    expect(all.map((r) => r.parentId)).toEqual(["camp-1"]);

    await removeContainerRelationshipsForChild("hero-2");
    expect(await loadContainerRelationships()).toEqual([]);
  });
});
