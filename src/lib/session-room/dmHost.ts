import type { TabletopSession } from "@/lib/tabletop/types";

const DM_ROOM_STORAGE_KEY = "ddeasy-dm-room-v1";

export type DmActiveRoom = {
  code: string;
  transport: "local" | "relay";
  joinUrl: string;
  expiresAt: string;
};

export function saveDmActiveRoom(room: DmActiveRoom): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DM_ROOM_STORAGE_KEY, JSON.stringify(room));
}

export function loadDmActiveRoom(): DmActiveRoom | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DM_ROOM_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DmActiveRoom;
    if (!parsed?.code || !parsed.joinUrl) return null;
    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      clearDmActiveRoom();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDmActiveRoom(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DM_ROOM_STORAGE_KEY);
}

/** Push master TabletopSession to the relay host endpoint (requires DM cookie). */
export async function postDmHostSync(
  roomCode: string,
  state: TabletopSession,
): Promise<boolean> {
  const res = await fetch(`/api/session-room/${roomCode}/host`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  return res.ok;
}

/**
 * Debounced DM host sync — coalesces rapid session edits (token drags, fog paint)
 * into ~4 pushes per second, matching broadcast sync cadence.
 */
export function createDmHostSync(roomCode: string): {
  publish: (session: TabletopSession) => void;
  close: () => void;
} {
  let pending: ReturnType<typeof setTimeout> | null = null;
  let latest: TabletopSession | null = null;

  const flush = () => {
    pending = null;
    if (!latest) return;
    const state = latest;
    latest = null;
    void postDmHostSync(roomCode, state);
  };

  return {
    publish: (session: TabletopSession) => {
      latest = session;
      if (pending === null) {
        pending = setTimeout(flush, 250);
      }
    },
    close: () => {
      if (pending !== null) clearTimeout(pending);
      pending = null;
      latest = null;
    },
  };
}
