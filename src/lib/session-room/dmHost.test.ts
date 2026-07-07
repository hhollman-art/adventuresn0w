import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createDmHostSync, loadDmActiveRoom, saveDmActiveRoom, clearDmActiveRoom } from "./dmHost";
import { createDefaultSession } from "@/lib/tabletop/session";

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
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

describe("dmHost", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("localStorage", mockLocalStorage());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("persists and loads active room", () => {
    const room = {
      code: "K7M3P",
      transport: "relay" as const,
      joinUrl: "/join?code=K7M3P",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    saveDmActiveRoom(room);
    expect(loadDmActiveRoom()?.code).toBe("K7M3P");
    clearDmActiveRoom();
    expect(loadDmActiveRoom()).toBeNull();
  });

  it("debounces host sync publishes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const sync = createDmHostSync("TEST1");
    const session = createDefaultSession();
    sync.publish(session);
    sync.publish(session);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    sync.close();
  });
});
