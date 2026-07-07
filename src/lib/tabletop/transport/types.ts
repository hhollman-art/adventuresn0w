import type { TabletopSession } from "@/lib/tabletop/types";

/** Transport abstraction — local BroadcastChannel today; room relay for online play. */
export type TabletopTransportMode = "broadcast" | "room-relay";

export type TabletopTransport = {
  mode: TabletopTransportMode;
  publish: (session: TabletopSession) => void;
  close: () => void;
};

export type RoomRelayConfig = {
  roomCode: string;
  seatId?: string;
  playerToken?: string;
  pollIntervalMs?: number;
};

export type DmRoomRelayConfig = {
  roomCode: string;
  pollIntervalMs?: number;
};
