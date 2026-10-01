import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  extractStaticSrdEntityId,
  sourceSrdEntityIdFromGameItem,
  reconcileVaultParkingLot,
  resolveSrdDragForVaultPark,
} from "./vaultSrdPark";
import {
  parkCfInVault,
  loadVaultParkingLot,
  replaceVaultParkingLot,
} from "./vaultParking";
import type { SavedGameItem } from "@/lib/itemLibrary";
import { emptyBonuses } from "@/lib/tabletop/character";

vi.mock("@/lib/itemLibrary", async () => {
  const actual = await vi.importActual<typeof import("@/lib/itemLibrary")>(
    "@/lib/itemLibrary",
  );
  const { emptyBonuses: empty } = await import("@/lib/tabletop/character");
  let items: SavedGameItem[] = [];
  return {
    ...actual,
    loadSavedGameItems: async () => items,
    saveGameItem: async (input: Parameters<typeof actual.saveGameItem>[0]) => {
      const now = new Date().toISOString();
      const row: SavedGameItem = {
        id: `item_${items.length + 1}`,
        createdAt: now,
        updatedAt: now,
        kind: input.kind,
        name: input.name,
        itemType: input.itemType ?? "",
        rarity: input.rarity ?? null,
        requiresAttunement: input.requiresAttunement ?? false,
        attunementNote: input.attunementNote ?? "",
        description: input.description ?? "",
        properties: input.properties ?? "",
        charges: input.charges ?? "",
        effects: input.effects ?? "",
        bonuses: input.bonuses ?? empty(),
        source: input.source ?? "import",
        isHomebrew: input.isHomebrew ?? false,
        createdBy: input.createdBy ?? null,
        tags: input.tags ?? [],
        settingTags: input.settingTags ?? [],
        sourceNote: input.sourceNote ?? "",
        imageDataUrl: input.imageDataUrl ?? null,
        instanceId: input.instanceId ?? null,
        _source: input._source ?? null,
        sourceSrdEntityId: input.sourceSrdEntityId ?? null,
      };
      items = [row, ...items];
      return items;
    },
    __resetItems: () => {
      items = [];
    },
    __seedItem: (row: SavedGameItem) => {
      items = [row, ...items];
    },
  };
});

vi.mock("@/lib/srd/srdCustomLibrary", async () => {
  const actual = await vi.importActual<typeof import("@/lib/srd/srdCustomLibrary")>(
    "@/lib/srd/srdCustomLibrary",
  );
  return {
    ...actual,
    loadSavedCustomSrdEntries: async () => [],
    saveCustomSrdEntry: async () => [],
  };
});

vi.mock("@/lib/workshop/librarySync", () => ({
  scheduleLibrarySnapshot: () => undefined,
}));

describe("vaultSrdPark", () => {
  const store = new Map<string, string>();

  beforeEach(async () => {
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
        indexedDB: undefined,
        dispatchEvent: () => true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    const mod = await import("@/lib/itemLibrary");
    (mod as { __resetItems?: () => void }).__resetItems?.();
    await replaceVaultParkingLot([]);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("extracts static SRD ids from parked stubs", () => {
    expect(
      extractStaticSrdEntityId({
        id: "magic-item:dancing-sword",
        detail: "static-srd:magic-item:dancing-sword",
      }),
    ).toBe("magic-item:dancing-sword");
    expect(
      extractStaticSrdEntityId({
        id: "uuid-library",
        detail: "static-srd:magic-item:dancing-sword",
      }),
    ).toBe("magic-item:dancing-sword");
    expect(
      extractStaticSrdEntityId({ id: "uuid-library", detail: "Your magic treasure" }),
    ).toBeNull();
  });

  it("reads sourceSrdEntityId from game item description", () => {
    const sid = sourceSrdEntityIdFromGameItem({
      id: "x",
      createdAt: "",
      updatedAt: "",
      kind: "magic",
      name: "Dancing Sword",
      itemType: "Weapon",
      rarity: null,
      requiresAttunement: false,
      attunementNote: "",
      description: "A sword.\n\n_source: SRD\nsourceSrdEntityId: magic-item:dancing-sword",
      properties: "",
      charges: "",
      effects: "",
      bonuses: emptyBonuses(),
      source: "import",
      isHomebrew: false,
      createdBy: null,
      tags: [],
      settingTags: [],
      sourceNote: "",
      imageDataUrl: null,
      instanceId: null,
      _source: null,
      sourceSrdEntityId: null,
    });
    expect(sid).toBe("magic-item:dancing-sword");
  });

  it("prefers typed provenance when the DM rewrote the description", () => {
    const sid = sourceSrdEntityIdFromGameItem({
      id: "x",
      createdAt: "",
      updatedAt: "",
      kind: "magic",
      name: "Blade of the Dawn",
      itemType: "Weapon",
      rarity: "rare",
      requiresAttunement: true,
      attunementNote: "",
      // No text tag left — the DM turned the SRD longsword into a custom item.
      description: "A radiant blade that hums at sunrise.",
      properties: "",
      charges: "",
      effects: "",
      bonuses: emptyBonuses(),
      source: "import",
      isHomebrew: true,
      createdBy: null,
      tags: [],
      settingTags: [],
      sourceNote: "",
      imageDataUrl: null,
      instanceId: "instance_weapon_longsword_abc123",
      _source: "SRD",
      sourceSrdEntityId: "weapon:longsword",
    });
    expect(sid).toBe("weapon:longsword");
  });

  it("hydrates SRD park into a Library item id (not the global entity id)", async () => {
    const lib = await resolveSrdDragForVaultPark({
      id: "magic-item:dancing-sword",
      title: "Dancing Sword",
      detail: "static-srd:magic-item:dancing-sword",
    });
    expect(lib).not.toBeNull();
    expect(lib!.id).not.toBe("magic-item:dancing-sword");
    expect(lib!.sourceSrdEntityId).toBe("magic-item:dancing-sword");
    expect(lib!.ciClass).toBe("item.magic");
  });

  it("reconciles orphan parked static stubs onto Library CF ids", async () => {
    await parkCfInVault({
      id: "magic-item:dancing-sword",
      ciClass: "item.srd-magic",
      title: "Dancing Sword",
      detail: "static-srd:magic-item:dancing-sword",
    });

    const { list, migrated, dropped } = await reconcileVaultParkingLot();
    expect(migrated).toBeGreaterThanOrEqual(1);
    expect(dropped).toBe(0);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).not.toBe("magic-item:dancing-sword");
    expect(list[0]!.title).toBe("Dancing Sword");

    // Second pass is a no-op (no duplicate stubs).
    const again = await reconcileVaultParkingLot();
    expect(again.migrated).toBe(0);
    expect(again.list).toHaveLength(1);
    expect(await loadVaultParkingLot()).toHaveLength(1);
  });

  it("collapses static stub when Library twin is already parked", async () => {
    const lib = await resolveSrdDragForVaultPark({
      id: "magic-item:dancing-sword",
      title: "Dancing Sword",
      detail: "static-srd:magic-item:dancing-sword",
    });
    expect(lib).not.toBeNull();

    await parkCfInVault({
      id: lib!.id,
      ciClass: lib!.ciClass,
      title: lib!.title,
      detail: lib!.detail,
    });
    await parkCfInVault({
      id: "magic-item:dancing-sword",
      ciClass: "item.srd-magic",
      title: "Dancing Sword",
      detail: "static-srd:magic-item:dancing-sword",
    });

    const before = await loadVaultParkingLot();
    expect(before.length).toBe(2);

    const { list, dropped } = await reconcileVaultParkingLot();
    expect(dropped).toBeGreaterThanOrEqual(1);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(lib!.id);
  });
});
