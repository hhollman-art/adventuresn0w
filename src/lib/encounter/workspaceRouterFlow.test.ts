import { describe, expect, it, vi } from "vitest";
import { parseEncounterCombatantsFromMarkdown } from "@/lib/encounter/parseEncounterMarkdown";
import { applyEncounterCombatImport } from "@/lib/encounter/applyEncounterCombatImport";
import { createDefaultSession } from "@/lib/tabletop/session";
import {
  consumePendingEncounterCombatImport,
  queueEncounterCombatImport,
} from "@/lib/workshop/workspaceRouter";
import { parseSpellLabelsFromLine, resolveSpellFromLabel } from "@/lib/srd/spellMarkdownEnrichment";

describe("parseEncounterCombatantsFromMarkdown", () => {
  it("parses **Encounter:** lines with counts and hp", () => {
    const rows = parseEncounterCombatantsFromMarkdown(`
### Crypt antechamber
**Encounter:** 3 goblins, 1 hobgoblin captain (11 hp)
`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ label: "goblins", count: 3, kind: "monster" });
    expect(rows[1]).toMatchObject({ label: "hobgoblin captain", maxHp: 11 });
  });
});

describe("applyEncounterCombatImport", () => {
  it("adds tokens and initiative entries", () => {
    const session = createDefaultSession();
    const next = applyEncounterCombatImport(session, {
      encounterName: "Ambush",
      combatants: [{ label: "Goblin", kind: "monster", count: 2, maxHp: 7, initiative: 12 }],
    });
    expect(next.tokens).toHaveLength(2);
    expect(next.initiative.entries).toHaveLength(2);
    expect(next.mapName).toBe("Ambush");
  });
});

describe("encounter combat queue", () => {
  it("round-trips through sessionStorage", () => {
    const store = new Map<string, string>();
    const sessionStorageMock = {
      setItem: (key: string, value: string) => store.set(key, value),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
    };
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("window", { sessionStorage: sessionStorageMock });

    queueEncounterCombatImport({
      encounterName: "Test",
      combatants: [{ label: "Wolf", kind: "monster" }],
    });
    const payload = consumePendingEncounterCombatImport();
    expect(payload?.encounterName).toBe("Test");
    expect(consumePendingEncounterCombatImport()).toBeNull();

    vi.unstubAllGlobals();
  });
});

describe("spell markdown enrichment helpers", () => {
  it("resolves bundled spell names", () => {
    expect(resolveSpellFromLabel("Fireball")?.id).toBe("fireball");
  });

  it("parses cantrip lines", () => {
    const labels = parseSpellLabelsFromLine("Cantrips (at will): fire bolt, light");
    expect(labels).toEqual(["fire bolt", "light"]);
  });
});
