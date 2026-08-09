import { describe, expect, it } from "vitest";
import {
  advanceInitiative,
  clearTabletopSession,
  createDefaultSession,
  fixPlayer,
  fixSession,
  playerVisibleSession,
  sortInitiative,
} from "./session";
import type { TabletopSession } from "./types";

function sessionWith(overrides: Partial<TabletopSession>): TabletopSession {
  return { ...createDefaultSession(), ...overrides };
}

describe("clearTabletopSession", () => {
  it("returns an empty default session", () => {
    const busy = sessionWith({
      mapName: "Crypt",
      mapImageDataUrl: "data:image/png;base64,abc",
      activePartyId: "party-1",
      tokens: [
        {
          id: "t1",
          label: "Goblin",
          color: "#f00",
          kind: "monster",
          x: 2,
          y: 3,
          size: 1,
          hp: { current: 5, max: 7 },
          hidden: false,
          imageDataUrl: null,
        },
      ],
      players: [fixPlayer({ id: "p1", name: "Thera" })!],
      fog: { enabled: true, revealed: ["0,0", "1,0"] },
      initiative: {
        entries: [{ id: "e1", name: "Thera", roll: 15, tokenId: null }],
        activeIndex: 0,
        round: 2,
      },
      log: [
        {
          id: "l1",
          at: "2026-01-01T00:00:00.000Z",
          expression: "1d20",
          detail: "1d20 [12]",
          total: 12,
          secret: false,
        },
      ],
    });
    const cleared = clearTabletopSession();
    expect(cleared.tokens).toEqual([]);
    expect(cleared.players).toEqual([]);
    expect(cleared.activePartyId).toBeNull();
    expect(cleared.mapName).toBe("Blank battlefield");
    expect(cleared.mapImageDataUrl).toBeNull();
    expect(cleared.mapSourceDataUrl).toBeNull();
    expect(cleared.fog).toEqual({ enabled: false, revealed: [] });
    expect(cleared.initiative).toEqual({ entries: [], activeIndex: 0, round: 1 });
    expect(cleared.log).toEqual([]);
    expect(cleared.grid.cols).toBe(createDefaultSession().grid.cols);
    expect(busy.tokens.length).toBeGreaterThan(0);
  });
});

describe("fixSession", () => {
  it("accepts its own default output", () => {
    const s = createDefaultSession();
    expect(fixSession(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it("rejects unknown versions and non-objects", () => {
    expect(fixSession(null)).toBeNull();
    expect(fixSession("x")).toBeNull();
    expect(fixSession({ version: 2 })).toBeNull();
  });

  it("defaults feet per cell to 5 and clamps unknown values", () => {
    const fixed = fixSession({ version: 1, grid: { feetPerCell: 10 } });
    expect(fixed!.grid.feetPerCell).toBe(10);
    expect(fixSession({ version: 1, grid: {} })!.grid.feetPerCell).toBe(5);
    expect(fixSession({ version: 1, grid: { feetPerCell: 3 } })!.grid.feetPerCell).toBe(5);
  });

  it("drops malformed tokens and clamps grid bounds", () => {
    const fixed = fixSession({
      version: 1,
      grid: { cols: 5000, rows: 1 },
      tokens: [
        { id: "a", label: "Goblin", color: "#f00", x: 1, y: 1, kind: "monster" },
        { id: "b" }, // missing fields — dropped
        "junk",
      ],
    });
    expect(fixed).not.toBeNull();
    expect(fixed!.grid.cols).toBe(30); // out-of-range falls back to default
    expect(fixed!.grid.rows).toBe(20);
    expect(fixed!.tokens).toHaveLength(1);
    expect(fixed!.tokens[0].size).toBe(1);
    expect(fixed!.tokens[0].hidden).toBe(false);
  });

  it("restores players and drops dangling token links", () => {
    const fixed = fixSession({
      version: 1,
      tokens: [
        {
          id: "tok1",
          label: "Thera",
          color: "#2563eb",
          x: 0,
          y: 0,
          kind: "pc",
        },
      ],
      players: [
        {
          id: "p1",
          name: "Thera",
          level: 5,
          abilities: { str: 8, dex: 16, con: 14, int: 12, wis: 13, cha: 10 },
          ac: 15,
          maxHp: 33,
          currentHp: null,
          tokenId: "tok1",
          items: [
            {
              id: "i1",
              name: "Shield",
              notes: "+2 AC",
              bonuses: { ac: 2, maxHp: 0, speed: 0, initiative: 0, passivePerception: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
            },
          ],
        },
        { id: "p2", name: "Ghost", tokenId: "gone" }, // link no longer exists
        { id: "p3" }, // missing name — dropped
        "junk",
      ],
    });
    expect(fixed!.players).toHaveLength(2);
    expect(fixed!.players[0]).toMatchObject({
      name: "Thera",
      level: 5,
      ac: 15,
      maxHp: 33,
      tokenId: "tok1",
      abilities: { dex: 16 },
      items: [{ name: "Shield", bonuses: { ac: 2 } }],
    });
    expect(fixed!.players[1].tokenId).toBeNull();
    expect(fixed!.players[1].level).toBe(1);
    expect(fixed!.players[1].abilities.str).toBe(10);
  });

  it("clamps activeIndex to the entry list", () => {
    const fixed = fixSession({
      version: 1,
      initiative: {
        entries: [{ id: "e1", name: "A", roll: 12 }],
        activeIndex: 99,
        round: 3,
      },
    });
    expect(fixed!.initiative.activeIndex).toBe(0);
    expect(fixed!.initiative.round).toBe(3);
  });
});

describe("fixPlayer character sheet details", () => {
  it("preserves optional official-sheet fields and safely defaults legacy rows", () => {
    const legacy = fixPlayer({ id: "legacy", name: "Legacy Hero" })!;
    expect(legacy.skillProficiencies).toEqual([]);
    expect(legacy.currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
    expect(legacy.deathSaveSuccesses).toBe(0);

    const detailed = fixPlayer({
      id: "hero",
      name: "Aria",
      experiencePoints: 6400,
      inspiration: true,
      proficientSavingThrows: ["dex", "wis"],
      skillProficiencies: ["perception", "stealth"],
      temporaryHp: 5,
      hitDice: "8d8",
      deathSaveSuccesses: 2,
      attacks: [
        {
          id: "attack-1",
          name: "Rapier",
          attackBonus: "+7",
          damageType: "1d8+4 piercing",
        },
      ],
      currency: { cp: 1, sp: 2, ep: 3, gp: 4, pp: 5 },
      personalityTraits: "Always has a plan.",
      features: "Cunning Action",
    })!;

    expect(detailed.experiencePoints).toBe(6400);
    expect(detailed.proficientSavingThrows).toEqual(["dex", "wis"]);
    expect(detailed.skillProficiencies).toEqual(["perception", "stealth"]);
    expect(detailed.attacks?.[0]?.name).toBe("Rapier");
    expect(detailed.currency?.gp).toBe(4);
    expect(detailed.features).toBe("Cunning Action");
  });
});

describe("initiative", () => {
  it("sorts by roll descending, ties by name", () => {
    const sorted = sortInitiative([
      { id: "1", name: "Zed", roll: 12, tokenId: null },
      { id: "2", name: "Anna", roll: 18, tokenId: null },
      { id: "3", name: "Bob", roll: 12, tokenId: null },
    ]);
    expect(sorted.map((e) => e.name)).toEqual(["Anna", "Bob", "Zed"]);
  });

  it("advances and wraps into the next round", () => {
    let s = sessionWith({
      initiative: {
        entries: [
          { id: "1", name: "A", roll: 18, tokenId: null },
          { id: "2", name: "B", roll: 10, tokenId: null },
        ],
        activeIndex: 0,
        round: 1,
      },
    });
    s = advanceInitiative(s);
    expect(s.initiative.activeIndex).toBe(1);
    expect(s.initiative.round).toBe(1);
    s = advanceInitiative(s);
    expect(s.initiative.activeIndex).toBe(0);
    expect(s.initiative.round).toBe(2);
  });

  it("is a no-op with no combatants", () => {
    const s = createDefaultSession();
    expect(advanceInitiative(s)).toBe(s);
  });
});

describe("playerVisibleSession", () => {
  it("strips hidden tokens and secret rolls", () => {
    const s = sessionWith({
      tokens: [
        {
          id: "t1",
          label: "Hero",
          color: "#00f",
          kind: "pc",
          x: 0,
          y: 0,
          size: 1,
          hp: null,
          hidden: false,
          imageDataUrl: null,
        },
        {
          id: "t2",
          label: "Ambusher",
          color: "#f00",
          kind: "monster",
          x: 5,
          y: 5,
          size: 1,
          hp: null,
          hidden: true,
          imageDataUrl: null,
        },
      ],
      log: [
        { id: "l1", at: "", expression: "1d20", detail: "1d20 [15]", total: 15, secret: false },
        { id: "l2", at: "", expression: "1d20", detail: "1d20 [3]", total: 3, secret: true },
      ],
    });
    const visible = playerVisibleSession(s);
    expect(visible.tokens.map((t) => t.id)).toEqual(["t1"]);
    expect(visible.log.map((e) => e.id)).toEqual(["l1"]);
  });
});
