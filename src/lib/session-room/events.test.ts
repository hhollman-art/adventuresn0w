import { describe, expect, it } from "vitest";
import { createDefaultSession } from "@/lib/tabletop/session";
import { applyTabletopMutation } from "./events";

describe("applyTabletopMutation", () => {
  it("applies PLAYER_HP_DELTA to a character", () => {
    const session = createDefaultSession();
    session.players = [
      {
        id: "pc-1",
        name: "Thorgar",
        playerName: "Alex",
        species: "Human",
        className: "Fighter",
        subclass: "",
        background: "",
        alignment: "",
        level: 3,
        abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 9 },
        ac: 18,
        maxHp: 30,
        speed: 30,
        notes: "",
        items: [],
        knownSpellIds: [],
    preparedSpellIds: [],
    linkedModifiers: [],
        currentHp: 30,
        tokenId: null,
      },
    ];

    const result = applyTabletopMutation(session, {
      type: "PLAYER_HP_DELTA",
      seatId: "seat-1",
      characterId: "pc-1",
      delta: -5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.players[0]?.currentHp).toBe(25);
    }
  });

  it("appends a dice log entry for PLAYER_ROLL", () => {
    const session = createDefaultSession();
    const result = applyTabletopMutation(session, {
      type: "PLAYER_ROLL",
      seatId: "seat-1",
      expression: "1d20+5",
      label: "Thorgar attack",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.log).toHaveLength(1);
      expect(result.session.log[0]?.detail).toBe("Thorgar attack");
    }
  });
});
