import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  cleanupSessionReferencesToFile,
  removeFileFromVault,
} from "./removeFileFromVault";
import {
  parkCfInVault,
  loadVaultParkingLot,
  VAULT_PARKING_CHANGED_EVENT,
} from "./vaultParking";
import {
  isExcludedFromVault,
  loadVaultExcludedIds,
} from "./vaultExclusion";

describe("removeFileFromVault", () => {
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
    const listeners = new Map<string, Set<(e: Event) => void>>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: {
        localStorage: localStorageMock,
        indexedDB: undefined,
        dispatchEvent: (event: Event) => {
          listeners.get(event.type)?.forEach((fn) => fn(event));
          return true;
        },
        addEventListener: (type: string, fn: (e: Event) => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: (e: Event) => void) => {
          listeners.get(type)?.delete(fn);
        },
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: localStorageMock,
    });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    store.clear();
  });

  it("unlinks (soft) a parked file from the vault lot", async () => {
    await parkCfInVault({
      id: "item-1",
      ciClass: "item.magic",
      title: "Sun Blade",
    });
    expect((await loadVaultParkingLot()).some((r) => r.id === "item-1")).toBe(true);

    const result = await removeFileFromVault("item-1", false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hardDelete).toBe(false);
    expect(result.removed?.title).toBe("Sun Blade");
    expect(await loadVaultParkingLot()).toEqual([]);
  });

  it("hard-purges, excludes from vault index, and cleans selection orphans", async () => {
    await parkCfInVault({
      id: "hero-9",
      ciClass: "character.sheet",
      title: "Aria",
    });
    window.localStorage.setItem(
      "ddeasy-library-selection",
      JSON.stringify({ id: "hero-9", title: "Aria" }),
    );
    window.localStorage.setItem("ddeasy-vault-drawer-selection", "hero-9");

    const cleaned = cleanupSessionReferencesToFile("hero-9");
    expect(cleaned.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("ddeasy-vault-drawer-selection")).toBeNull();

    const result = await removeFileFromVault("hero-9", true, { title: "Aria" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hardDelete).toBe(true);
    expect(await loadVaultParkingLot()).toEqual([]);
    expect(await isExcludedFromVault("hero-9")).toBe(true);
    expect((await loadVaultExcludedIds()).has("hero-9")).toBe(true);
  });

  it("soft unlink does not exclude from vault index", async () => {
    await parkCfInVault({
      id: "item-soft",
      ciClass: "item.magic",
      title: "Soft Blade",
    });
    const result = await removeFileFromVault("item-soft", false);
    expect(result.ok).toBe(true);
    expect(await isExcludedFromVault("item-soft")).toBe(false);
  });

  it("re-parking clears a prior purge exclusion", async () => {
    await removeFileFromVault("gear-1", true, { title: "Gear" });
    expect(await isExcludedFromVault("gear-1")).toBe(true);
    await parkCfInVault({
      id: "gear-1",
      ciClass: "item.equipment",
      title: "Gear",
    });
    expect(await isExcludedFromVault("gear-1")).toBe(false);
  });

  it("emits parking changed on purge", async () => {
    await parkCfInVault({
      id: "npc-1",
      ciClass: "npc.record",
      title: "Grix",
    });
    let fired = 0;
    const onChange = () => {
      fired += 1;
    };
    window.addEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
    await removeFileFromVault("npc-1", true);
    window.removeEventListener(VAULT_PARKING_CHANGED_EVENT, onChange);
    expect(fired).toBeGreaterThan(0);
  });
});
