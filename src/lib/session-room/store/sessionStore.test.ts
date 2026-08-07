import { describe, expect, it, beforeEach } from "vitest";
import { MemorySessionStore } from "./memorySessionStore";
import {
  SESSION_ROOM_TTL_MS,
  createSessionStore,
  hasRedisSessionEnv,
} from "./index";
import type { SessionRoom } from "@/lib/session-room/types";
import { createDefaultSession } from "@/lib/tabletop/session";

function sampleRoom(code = "K7M3P"): SessionRoom {
  const now = Date.now();
  return {
    id: "room-1",
    code,
    dmId: "dm-1",
    status: "open",
    transport: "relay",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_ROOM_TTL_MS).toISOString(),
    revision: 1,
    masterState: createDefaultSession(),
    players: [],
  };
}

describe("MemorySessionStore", () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  it("round-trips get/set/update/delete", async () => {
    const room = sampleRoom();
    await store.setRoom(room.code, room);
    expect((await store.getRoom(room.code))?.id).toBe("room-1");

    const updated = await store.updateRoom(room.code, { revision: 2 });
    expect(updated?.revision).toBe(2);

    await store.deleteRoom(room.code);
    expect(await store.getRoom(room.code)).toBeNull();
  });

  it("returns null for expired rooms and cleans them up", async () => {
    const room = sampleRoom();
    room.expiresAt = new Date(Date.now() - 1000).toISOString();
    await store.setRoom(room.code, room);
    expect(await store.getRoom(room.code)).toBeNull();
  });
});

describe("createSessionStore", () => {
  it("falls back to memory when Redis env is absent", () => {
    const store = createSessionStore({});
    expect(store).toBeInstanceOf(MemorySessionStore);
    expect(hasRedisSessionEnv({})).toBe(false);
  });
});
