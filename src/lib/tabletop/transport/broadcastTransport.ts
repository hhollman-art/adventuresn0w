import type { TabletopSession } from "@/lib/tabletop/types";
import { createDmSync, createPlayerSync } from "@/lib/tabletop/sync";
import type { TabletopTransport } from "./types";

/** Same-browser DM ↔ player tabs (in-person Wi-Fi tablets mirroring one DM laptop). */
export function createBroadcastTransport(
  role: "dm",
  getSession: () => TabletopSession,
): TabletopTransport;
export function createBroadcastTransport(
  role: "player",
  onSession: (session: TabletopSession) => void,
): TabletopTransport;
export function createBroadcastTransport(
  role: "dm" | "player",
  arg: (() => TabletopSession) | ((session: TabletopSession) => void),
): TabletopTransport {
  if (role === "dm") {
    const sync = createDmSync(arg as () => TabletopSession);
    return {
      mode: "broadcast",
      publish: sync.publish,
      close: sync.close,
    };
  }
  const sync = createPlayerSync(arg as (session: TabletopSession) => void);
  return {
    mode: "broadcast",
    publish: () => {},
    close: sync.close,
  };
}
