import type { TabletopSession } from "@/lib/tabletop/types";
import type { MutationEnvelope } from "@/lib/session-room/events";
import type { RoomRelayConfig, TabletopTransport } from "./types";

/**
 * Online / hybrid relay transport — polls the session gateway for player-visible state.
 * DM host pushes master state via POST /api/session-room/[code]/host.
 */
export function createRoomRelayTransport(
  config: RoomRelayConfig,
  onSession: (session: TabletopSession) => void,
): TabletopTransport {
  const intervalMs = config.pollIntervalMs ?? 1000;
  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const poll = async () => {
    if (closed) return;
    try {
      const res = await fetch(`/api/session-room/${config.roomCode}/state`);
      if (!res.ok) return;
      const data = (await res.json()) as { session: TabletopSession };
      if (data.session) onSession(data.session);
    } catch {
      /* ignore transient network errors */
    }
  };

  void poll();
  timer = setInterval(() => void poll(), intervalMs);

  return {
    mode: "room-relay",
    publish: () => {},
    close: () => {
      closed = true;
      if (timer) clearInterval(timer);
    },
  };
}

export async function postPlayerMutation(
  roomCode: string,
  seatId: string,
  playerToken: string,
  envelope: MutationEnvelope,
): Promise<boolean> {
  const res = await fetch(`/api/session-room/${roomCode}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId, playerToken, ...envelope }),
  });
  return res.ok;
}
