"use client";

import { useMemo, useRef } from "react";
import type { CiClass } from "@/lib/ciRegistry";
import type { TabletopSession } from "@/lib/tabletop/types";
import type { TabletopToken, PlayerCharacter } from "@/lib/tabletop/types";
import {
  deployVaultToTabletop,
  vaultDeploySummary,
  type TabletopDeployContext,
} from "@/lib/vault/deployToTabletop";
import { useVaultDropZone } from "@/contexts/VaultDrawerContext";

type TabletopVaultDropBridgeProps = {
  session: TabletopSession;
  update: (fn: (s: TabletopSession) => TabletopSession) => void;
  onSelectToken: (id: string | null) => void;
  newPlayerToken: (
    session: TabletopSession,
    player: PlayerCharacter,
    tokenId: string,
  ) => TabletopToken;
  onStatus: (message: string) => void;
};

/** Registers Virtual Table drop zones for the global Lore Vault drawer. */
export default function TabletopVaultDropBridge({
  session,
  update,
  onSelectToken,
  newPlayerToken,
  onStatus,
}: TabletopVaultDropBridgeProps) {
  const ctxRef = useRef<TabletopDeployContext>({
    session,
    update,
    onSelectToken,
    newPlayerToken,
  });
  ctxRef.current = { session, update, onSelectToken, newPlayerToken };

  const mapZone = useMemo(
    () => ({
      zoneId: "vtt-map",
      label: "Battle map",
      hint: "Drop a hero, NPC, or monster token onto the map.",
      accepts: [
        "character.sheet",
        "party.roster",
        "npc.record",
        "rules.custom-entry",
        "monster.srd-entry",
        "item.equipment",
        "item.magic",
      ] satisfies CiClass[],
      handler: async (payload: Parameters<typeof deployVaultToTabletop>[0]) => {
        const result = await deployVaultToTabletop(payload, ctxRef.current);
        if (!result.ok) return { ok: false as const, message: result.message };
        onStatus(vaultDeploySummary(payload));
        return { ok: true as const };
      },
    }),
    [onStatus],
  );

  const partyZone = useMemo(
    () => ({
      zoneId: "vtt-party",
      label: "Party roster",
      hint: "Drop hero sheets or fellowships here.",
      accepts: ["character.sheet", "party.roster"] satisfies CiClass[],
      handler: async (payload: Parameters<typeof deployVaultToTabletop>[0]) => {
        const result = await deployVaultToTabletop(payload, ctxRef.current);
        if (!result.ok) return { ok: false as const, message: result.message };
        onStatus(vaultDeploySummary(payload));
        return { ok: true as const };
      },
    }),
    [onStatus],
  );

  useVaultDropZone(mapZone);
  useVaultDropZone(partyZone);

  return null;
}
