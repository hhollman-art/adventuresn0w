import type { TabletopSession } from "./types";
import { fixSession, playerVisibleSession } from "./session";

const CHANNEL_NAME = "ddeasy-tabletop-sync-v1";

type SyncMessage =
  | { type: "state"; session: TabletopSession }
  | { type: "request" };

function openChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

/**
 * DM side. Publishes player-safe snapshots to any open player-view tabs and
 * answers their initial state requests.
 */
export function createDmSync(getSession: () => TabletopSession): {
  publish: (session: TabletopSession) => void;
  close: () => void;
} {
  const channel = openChannel();
  if (!channel) {
    return { publish: () => {}, close: () => {} };
  }

  let pending: number | null = null;
  let latest: TabletopSession | null = null;

  const flush = () => {
    pending = null;
    if (latest) {
      channel.postMessage({ type: "state", session: playerVisibleSession(latest) });
      latest = null;
    }
  };

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data?.type === "request") {
      channel.postMessage({
        type: "state",
        session: playerVisibleSession(getSession()),
      });
    }
  };

  return {
    // Coalesce bursts (e.g. token drags) into ~10 broadcasts per second.
    publish: (session: TabletopSession) => {
      latest = session;
      if (pending === null) {
        pending = window.setTimeout(flush, 100);
      }
    },
    close: () => {
      if (pending !== null) window.clearTimeout(pending);
      channel.close();
    },
  };
}

/** Player side. Receives snapshots and asks the DM tab for the current state on load. */
export function createPlayerSync(onSession: (session: TabletopSession) => void): {
  close: () => void;
} {
  const channel = openChannel();
  if (!channel) return { close: () => {} };

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data?.type === "state") {
      const session = fixSession(event.data.session);
      if (session) onSession(session);
    }
  };
  channel.postMessage({ type: "request" });

  return { close: () => channel.close() };
}
