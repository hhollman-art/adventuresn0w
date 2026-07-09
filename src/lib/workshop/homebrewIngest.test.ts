import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  extractJsonPayload,
  mapRawJsonToCfDraft,
  draftHasBlankFields,
  buildCfMapUserMessage,
  CF_SCHEMA_MAP_SYSTEM_PROMPT,
} from "./cfSchemaMapper";
import {
  DEFAULT_VAULT_STORAGE_PREFS,
  loadVaultStoragePrefs,
  markVaultStorageConfigured,
} from "./vaultStoragePrefs";
import {
  gateFirstCustomCfSave,
  resetFirstSaveGateForTests,
  resolveFirstSaveGate,
  FIRST_SAVE_GATE_EVENT,
} from "./firstSaveGate";
import { homebrewFileKind, isHomebrewDropFile } from "./homebrewFileIngest";

type Listener = (e: Event) => void;

describe("cfSchemaMapper", () => {
  it("keeps the strict system prompt for CF conversion", () => {
    expect(CF_SCHEMA_MAP_SYSTEM_PROMPT).toContain(
      "Convert this raw text/image OCR into a structured DMMS Creation File schema",
    );
  });

  it("extracts JSON from fenced markdown", () => {
    const raw = extractJsonPayload('Here:\n```json\n{"name":"Sun Blade"}\n```');
    expect(JSON.parse(raw)).toEqual({ name: "Sun Blade" });
  });

  it("maps item JSON including curse-style ability penalties", () => {
    const mapped = mapRawJsonToCfDraft("item", {
      kind: "magic",
      name: "Cursed Blade",
      itemType: "Weapon",
      rarity: "rare",
      requiresAttunement: true,
      description: "A hungry sword.",
      bonuses: { wis: -2, ac: 1 },
    });
    expect(mapped.cfKind).toBe("item");
    if (mapped.cfKind !== "item") return;
    expect(mapped.draft.name).toBe("Cursed Blade");
    expect(mapped.draft.bonuses.wis).toBe(-2);
    expect(mapped.draft.bonuses.ac).toBe(1);
    expect(draftHasBlankFields(mapped)).toBe(false);
  });

  it("flags blank required fields for Complete with AI", () => {
    const mapped = mapRawJsonToCfDraft("item", { name: "", description: "" });
    expect(draftHasBlankFields(mapped)).toBe(true);
  });

  it("builds a user message that includes extracted text", () => {
    const msg = buildCfMapUserMessage({
      targetKind: "npc",
      extractedText: "Grix the goblin merchant",
      fileName: "notes.txt",
    });
    expect(msg).toContain("Grix the goblin merchant");
    expect(msg).toContain("notes.txt");
  });
});

describe("homebrewFileIngest kinds", () => {
  it("accepts pdf txt png jpg", () => {
    expect(homebrewFileKind(new File([], "a.pdf", { type: "application/pdf" }))).toBe("pdf");
    expect(homebrewFileKind(new File([], "a.txt", { type: "text/plain" }))).toBe("txt");
    expect(homebrewFileKind(new File([], "a.png", { type: "image/png" }))).toBe("png");
    expect(homebrewFileKind(new File([], "a.jpg", { type: "image/jpeg" }))).toBe("jpg");
    expect(isHomebrewDropFile(new File([], "a.docx"))).toBe(false);
  });
});

describe("vaultStoragePrefs + firstSaveGate", () => {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<Listener>>();

  beforeEach(() => {
    resetFirstSaveGateForTests();
    store.clear();
    listeners.clear();
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
        dispatchEvent: (event: Event) => {
          listeners.get(event.type)?.forEach((fn) => fn(event));
          return true;
        },
        addEventListener: (type: string, fn: Listener) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: Listener) => {
          listeners.get(type)?.delete(fn);
        },
      },
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: localStorageMock,
    });
  });

  afterEach(() => {
    resetFirstSaveGateForTests();
    store.clear();
    listeners.clear();
  });

  it("defaults to unconfigured", () => {
    expect(loadVaultStoragePrefs()).toEqual(DEFAULT_VAULT_STORAGE_PREFS);
  });

  it("persists configured preference", () => {
    const prefs = markVaultStorageConfigured({
      mode: "browser-sandbox",
    });
    expect(prefs.configured).toBe(true);
    expect(loadVaultStoragePrefs().mode).toBe("browser-sandbox");
  });

  it("gates first save until modal resolves", async () => {
    const seen: string[] = [];
    const onGate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { requestId: string };
      seen.push(detail.requestId);
      resolveFirstSaveGate({
        requestId: detail.requestId,
        ok: true,
        prefs: markVaultStorageConfigured({ mode: "browser-sandbox" }),
      });
    };
    window.addEventListener(FIRST_SAVE_GATE_EVENT, onGate);
    const ok = await gateFirstCustomCfSave("Flame Tongue");
    window.removeEventListener(FIRST_SAVE_GATE_EVENT, onGate);
    expect(ok).toBe(true);
    expect(seen).toHaveLength(1);
    const ok2 = await gateFirstCustomCfSave("Another");
    expect(ok2).toBe(true);
  });

  it("returns false when the DM cancels the vault modal", async () => {
    const onGate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { requestId: string };
      resolveFirstSaveGate({ requestId: detail.requestId, ok: false, prefs: null });
    };
    window.addEventListener(FIRST_SAVE_GATE_EVENT, onGate);
    const ok = await gateFirstCustomCfSave("Cancelled item");
    window.removeEventListener(FIRST_SAVE_GATE_EVENT, onGate);
    expect(ok).toBe(false);
  });
});
