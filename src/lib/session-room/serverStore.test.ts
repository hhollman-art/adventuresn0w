import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetSessionRoomStoreForTests,
  createSessionRoom,
  joinSessionRoom,
  getSessionRoomByCode,
} from "./serverStore";

describe("session room gateway", () => {
  beforeEach(() => {
    __resetSessionRoomStoreForTests();
  });

  it("creates a room and accepts BYOD player join", async () => {
    const { room } = await createSessionRoom("dm-test", "relay");
    expect(room.code).toHaveLength(5);

    const join = await joinSessionRoom(room.code, {
      displayName: "Alex",
      character: {
        id: "hero-1",
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
        currentHp: null,
        tokenId: null,
      },
    });

    expect(join).not.toBeNull();
    expect(join?.seatId).toBeTruthy();
    expect(join?.session.players).toHaveLength(1);
    expect(join?.session.players[0]?.name).toBe("Thorgar");

    const stored = await getSessionRoomByCode(room.code);
    expect(stored?.players).toHaveLength(1);
  });
});
