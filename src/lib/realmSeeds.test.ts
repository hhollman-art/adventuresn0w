import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendRealmSeed,
  loadRealmSeeds,
  type SavedRealmSeed,
} from "@/lib/realmSeeds";

const STORAGE_KEY = "ddeasy-realm-seeds-v1";

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe("realmSeeds", () => {
  let storage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    storage = mockLocalStorage();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("crypto", { randomUUID: () => "test-adventure-id" });
  });

  it("persists adventure seeds and reloads them", () => {
    appendRealmSeed({
      kind: "adventure",
      seedName: "Saltfen one-shot",
      titleHint: "Saltfen one-shot",
      briefDescription: "Misty river valley",
      markdown: "# The Saltfen Affair\n\nA short adventure.",
    });

    const loaded = loadRealmSeeds();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      id: "test-adventure-id",
      kind: "adventure",
      seedName: "Saltfen one-shot",
      markdown: "# The Saltfen Affair\n\nA short adventure.",
    } satisfies Partial<SavedRealmSeed>);
    expect(loaded[0]?.realmSize).toBeUndefined();

    const raw = JSON.parse(storage.store[STORAGE_KEY]!) as SavedRealmSeed[];
    expect(raw[0]?.kind).toBe("adventure");
  });

  it("persists characters seeds and reloads them", () => {
    appendRealmSeed({
      kind: "characters",
      seedName: "City watch party",
      titleHint: "City watch party",
      briefDescription: "Disgraced guards · heroic",
      markdown: "# The Night Watch\n\nFour level-3 PCs...",
    });

    const loaded = loadRealmSeeds();
    expect(loaded[0]?.kind).toBe("characters");
    expect(loaded[0]?.seedName).toBe("City watch party");
  });
});
