"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  hrefForCore,
  initialPowerWorkspaceState,
  reducePowerWorkspace,
  type CreateNewKind,
  type PowerWorkspaceCore,
  type PowerWorkspaceEvent,
  type PowerWorkspaceState,
} from "@/lib/workshop/powerWorkspaceMachine";

type PowerWorkspaceApi = {
  state: PowerWorkspaceState;
  dispatch: (event: PowerWorkspaceEvent) => void;
  selectCore: (core: PowerWorkspaceCore) => void;
  openCreateHub: (kind?: CreateNewKind, homebrew?: boolean) => void;
  closeCreateHub: () => void;
};

const PowerWorkspaceContext = createContext<PowerWorkspaceApi | null>(null);

export default function PowerWorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [state, dispatch] = useReducer(
    reducePowerWorkspace,
    initialPowerWorkspaceState({
      core: pathname.includes("campaign")
        ? "campaign"
        : pathname.includes("tavern") || pathname.includes("parties")
          ? "character"
          : "library",
    }),
  );

  const selectCore = useCallback(
    (core: PowerWorkspaceCore) => {
      dispatch({ type: "SELECT_CORE", core });
      router.push(hrefForCore(core));
    },
    [router],
  );

  const openCreateHub = useCallback((kind?: CreateNewKind, homebrew?: boolean) => {
    dispatch({ type: "OPEN_CREATE_HUB", kind, homebrew });
  }, []);

  const closeCreateHub = useCallback(() => {
    dispatch({ type: "CLOSE_CREATE_HUB" });
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, selectCore, openCreateHub, closeCreateHub }),
    [state, selectCore, openCreateHub, closeCreateHub],
  );

  return (
    <PowerWorkspaceContext.Provider value={value}>{children}</PowerWorkspaceContext.Provider>
  );
}

export function usePowerWorkspace(): PowerWorkspaceApi {
  const ctx = useContext(PowerWorkspaceContext);
  if (!ctx) {
    throw new Error("usePowerWorkspace must be used within PowerWorkspaceProvider");
  }
  return ctx;
}

/** Safe hook for shells that may render outside the provider during SSR. */
export function usePowerWorkspaceOptional(): PowerWorkspaceApi | null {
  return useContext(PowerWorkspaceContext);
}
