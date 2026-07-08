"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { openSrdEntityPreview, openSrdSpellPreview } from "@/lib/srd/openSrdPreview";
import type { EncounterCombatPayload } from "@/lib/encounter/types";
import {
  queueEncounterCombatImport,
  type WorkspaceRouterAction,
} from "@/lib/workshop/workspaceRouter";

export type WorkspaceContextRouterValue = {
  dispatch: (action: WorkspaceRouterAction) => void;
  openScryingSpell: (spell: { id: string; name: string }) => void;
  sendEncounterToCombat: (payload: EncounterCombatPayload) => void;
};

const WorkspaceContextRouter = createContext<WorkspaceContextRouterValue | null>(null);

export function WorkspaceContextRouterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const openScryingSpell = useCallback((spell: { id: string; name: string }) => {
    openSrdSpellPreview(spell);
  }, []);

  const dispatch = useCallback(
    (action: WorkspaceRouterAction) => {
      switch (action.type) {
        case "open-scrying-spell":
          openSrdSpellPreview({ id: action.spellId, name: action.name });
          break;
        case "open-scrying-entity":
          openSrdEntityPreview(action.entityId);
          break;
        case "navigate":
          if (action.replace) router.replace(action.href);
          else router.push(action.href);
          break;
        case "send-encounter-to-combat":
          queueEncounterCombatImport(action.payload);
          router.push("/table");
          break;
        default:
          break;
      }
    },
    [router],
  );

  const sendEncounterToCombat = useCallback(
    (payload: EncounterCombatPayload) => {
      dispatch({ type: "send-encounter-to-combat", payload });
    },
    [dispatch],
  );

  const value = useMemo(
    () => ({ dispatch, openScryingSpell, sendEncounterToCombat }),
    [dispatch, openScryingSpell, sendEncounterToCombat],
  );

  return (
    <WorkspaceContextRouter.Provider value={value}>{children}</WorkspaceContextRouter.Provider>
  );
}

export function useWorkspaceRouter(): WorkspaceContextRouterValue {
  const ctx = useContext(WorkspaceContextRouter);
  if (!ctx) {
    throw new Error("useWorkspaceRouter must be used within WorkspaceContextRouterProvider");
  }
  return ctx;
}

/** Safe hook for optional spell enrichment outside the provider tree. */
export function useWorkspaceRouterOptional(): WorkspaceContextRouterValue | null {
  return useContext(WorkspaceContextRouter);
}
