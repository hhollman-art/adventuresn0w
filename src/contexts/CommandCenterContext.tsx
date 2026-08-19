"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { WorkshopPreviewSnapshot } from "@/lib/workshop/previewSnapshot";

const INSPECTOR_OPEN_KEY = "ddeasy-command-inspector-open";

export type CommandCenterLibraryInspector = {
  snapshot: WorkshopPreviewSnapshot | null;
  hasSelection: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: (selectedIndices: number[]) => void;
  onLoadPartyVtt?: () => void;
  onSaveToLibrary?: () => void;
};

type InspectorCallbacks = Omit<CommandCenterLibraryInspector, "snapshot" | "hasSelection">;

type InspectorPayload = {
  snapshot: WorkshopPreviewSnapshot | null;
  hasSelection: boolean;
};

type CommandCenterActions = {
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  setLibraryInspector: (next: CommandCenterLibraryInspector | null) => void;
};

type CommandCenterLayout = {
  inspectorOpen: boolean;
};

type CommandCenterContextValue = CommandCenterActions &
  CommandCenterLayout & {
    libraryInspector: CommandCenterLibraryInspector | null;
  };

const CommandCenterActionsContext = createContext<CommandCenterActions | null>(null);
const CommandCenterLayoutContext = createContext<CommandCenterLayout | null>(null);
const CommandCenterInspectorContext = createContext<CommandCenterLibraryInspector | null>(null);

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const [inspectorOpen, setInspectorOpenState] = useState(true);
  const [payload, setPayload] = useState<InspectorPayload | null>(null);
  const callbacksRef = useRef<InspectorCallbacks | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INSPECTOR_OPEN_KEY);
      if (stored === "0") setInspectorOpenState(false);
      if (stored === "1") setInspectorOpenState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setInspectorOpen = useCallback((next: boolean) => {
    setInspectorOpenState((current) => {
      if (current === next) return current;
      try {
        localStorage.setItem(INSPECTOR_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleInspector = useCallback(() => {
    setInspectorOpenState((current) => {
      const next = !current;
      try {
        localStorage.setItem(INSPECTOR_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setLibraryInspector = useCallback((next: CommandCenterLibraryInspector | null) => {
    if (!next) {
      callbacksRef.current = null;
      setPayload((prev) => (prev === null ? prev : null));
      return;
    }
    const { snapshot, hasSelection, ...callbacks } = next;
    callbacksRef.current = callbacks;
    setPayload((prev) => {
      if (prev && prev.snapshot === snapshot && prev.hasSelection === hasSelection) {
        return prev;
      }
      return { snapshot, hasSelection };
    });
  }, []);

  const stableCallbacks = useMemo<InspectorCallbacks>(
    () => ({
      onClose: () => callbacksRef.current?.onClose(),
      onEdit: () => callbacksRef.current?.onEdit?.(),
      onEditSeed: () => callbacksRef.current?.onEditSeed?.(),
      onEditResult: () => callbacksRef.current?.onEditResult?.(),
      onSavePartyVtt: (selectedIndices) =>
        callbacksRef.current?.onSavePartyVtt?.(selectedIndices),
      onLoadPartyVtt: () => callbacksRef.current?.onLoadPartyVtt?.(),
      onSaveToLibrary: () => callbacksRef.current?.onSaveToLibrary?.(),
    }),
    [],
  );

  const libraryInspector = useMemo<CommandCenterLibraryInspector | null>(() => {
    if (!payload) return null;
    return {
      snapshot: payload.snapshot,
      hasSelection: payload.hasSelection,
      ...stableCallbacks,
    };
  }, [payload, stableCallbacks]);

  const actions = useMemo<CommandCenterActions>(
    () => ({
      setInspectorOpen,
      toggleInspector,
      setLibraryInspector,
    }),
    [setInspectorOpen, toggleInspector, setLibraryInspector],
  );

  const layout = useMemo<CommandCenterLayout>(() => ({ inspectorOpen }), [inspectorOpen]);

  return (
    <CommandCenterActionsContext.Provider value={actions}>
      <CommandCenterLayoutContext.Provider value={layout}>
        <CommandCenterInspectorContext.Provider value={libraryInspector}>
          {children}
        </CommandCenterInspectorContext.Provider>
      </CommandCenterLayoutContext.Provider>
    </CommandCenterActionsContext.Provider>
  );
}

export function useCommandCenter(): CommandCenterContextValue {
  const actions = useContext(CommandCenterActionsContext);
  const layout = useContext(CommandCenterLayoutContext);
  const libraryInspector = useContext(CommandCenterInspectorContext);
  if (!actions || !layout) {
    throw new Error("useCommandCenter must be used within CommandCenterProvider");
  }
  return { ...actions, ...layout, libraryInspector };
}

/** Layout + actions only — does not subscribe to inspector payload updates. */
export function useCommandCenterLayout(): CommandCenterActions & CommandCenterLayout {
  const actions = useContext(CommandCenterActionsContext);
  const layout = useContext(CommandCenterLayoutContext);
  if (!actions || !layout) {
    throw new Error("useCommandCenterLayout must be used within CommandCenterProvider");
  }
  return { ...actions, ...layout };
}

export function useCommandCenterActionsOptional(): CommandCenterActions | null {
  return useContext(CommandCenterActionsContext);
}

export function useCommandCenterOptional(): CommandCenterContextValue | null {
  const actions = useContext(CommandCenterActionsContext);
  const layout = useContext(CommandCenterLayoutContext);
  const libraryInspector = useContext(CommandCenterInspectorContext);
  if (!actions || !layout) return null;
  return { ...actions, ...layout, libraryInspector };
}

export function useLibraryInspectorOptional(): CommandCenterLibraryInspector | null {
  return useContext(CommandCenterInspectorContext);
}
