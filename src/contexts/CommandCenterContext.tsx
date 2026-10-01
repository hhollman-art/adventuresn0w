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
import {
  INSPECT_ENTITY_EVENT,
  isInspectMeta,
  type InspectMeta,
} from "@/lib/workshop/inspectedEntity";

export type InspectorTabId = "details" | "edit" | "related";

/** Key written by the retired docked Scry rail; cleared once on mount. */
const LEGACY_DOCKED_RAIL_KEY = "ddeasy-command-inspector-open";

export type CommandCenterLibraryInspector = {
  snapshot: WorkshopPreviewSnapshot | null;
  hasSelection: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onEditSeed?: () => void;
  onEditResult?: () => void;
  onSavePartyVtt?: (
    selectedIndices: number[],
    options?: { linkCampaign?: boolean },
  ) => void;
  onLoadPartyVtt?: () => void;
  onSaveToLibrary?: () => void;
  onSaveInspectedMarkdown?: (markdown: string) => void | Promise<void>;
};

type InspectorCallbacks = Omit<CommandCenterLibraryInspector, "snapshot" | "hasSelection">;

type InspectorPayload = {
  snapshot: WorkshopPreviewSnapshot | null;
  hasSelection: boolean;
};

type CommandCenterActions = {
  setScryingGlassOpen: (open: boolean) => void;
  toggleScryingGlass: () => void;
  setLibraryInspector: (next: CommandCenterLibraryInspector | null) => void;
  openCreateInspector: () => void;
  closeCreateInspector: () => void;
  setInspectorTab: (tab: InspectorTabId) => void;
  applyInspectedEntity: (meta: InspectMeta) => void;
};

type CommandCenterLayout = {
  /** Scrying Glass pop-out modal visibility (never persisted across reloads). */
  scryingGlassOpen: boolean;
  inspectorView: "scry" | "create";
};

type CommandCenterContextValue = CommandCenterActions &
  CommandCenterLayout & {
    libraryInspector: CommandCenterLibraryInspector | null;
  };

const CommandCenterActionsContext = createContext<CommandCenterActions | null>(null);
const CommandCenterLayoutContext = createContext<CommandCenterLayout | null>(null);
const CommandCenterInspectorContext = createContext<CommandCenterLibraryInspector | null>(null);
const InspectorFocusContext = createContext<{
  inspectedEntity: InspectMeta | null;
  inspectorTab: InspectorTabId;
} | null>(null);

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const [scryingGlassOpen, setScryingGlassOpenState] = useState(false);
  const [inspectorView, setInspectorView] = useState<"scry" | "create">("scry");
  const [inspectorTab, setInspectorTabState] = useState<InspectorTabId>("details");
  const [inspectedEntity, setInspectedEntity] = useState<InspectMeta | null>(null);
  const [payload, setPayload] = useState<InspectorPayload | null>(null);
  const callbacksRef = useRef<InspectorCallbacks | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DOCKED_RAIL_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setScryingGlassOpen = useCallback((next: boolean) => {
    setScryingGlassOpenState(next);
  }, []);

  const toggleScryingGlass = useCallback(() => {
    setScryingGlassOpenState((current) => !current);
  }, []);

  const applyInspectedEntity = useCallback(
    (meta: InspectMeta) => {
      setInspectedEntity((prev) => {
        if (prev?.key !== meta.key) setInspectorTabState("details");
        return prev?.key === meta.key ? prev : meta;
      });
      setInspectorView("scry");
      setScryingGlassOpen(true);
    },
    [setScryingGlassOpen],
  );

  const setInspectorTab = useCallback((tab: InspectorTabId) => {
    setInspectorTabState(tab);
  }, []);

  const setLibraryInspector = useCallback((next: CommandCenterLibraryInspector | null) => {
    if (!next) {
      callbacksRef.current = null;
      setPayload((prev) => (prev === null ? prev : null));
      return;
    }
    const { snapshot, hasSelection, ...callbacks } = next;
    callbacksRef.current = callbacks;
    if (snapshot?.inspect) {
      const nextInspect = snapshot.inspect;
      setInspectedEntity((prev) => (prev?.key === nextInspect.key ? prev : nextInspect));
    }
    setPayload((prev) => {
      if (prev && prev.snapshot === snapshot && prev.hasSelection === hasSelection) {
        return prev;
      }
      return { snapshot, hasSelection };
    });
  }, []);

  useEffect(() => {
    const onInspect = (event: Event) => {
      const detail = (event as CustomEvent<InspectMeta>).detail;
      if (isInspectMeta(detail)) applyInspectedEntity(detail);
    };
    window.addEventListener(INSPECT_ENTITY_EVENT, onInspect);
    return () => window.removeEventListener(INSPECT_ENTITY_EVENT, onInspect);
  }, [applyInspectedEntity]);

  const openCreateInspector = useCallback(() => {
    setInspectorView("create");
    setScryingGlassOpen(true);
  }, [setScryingGlassOpen]);

  const closeCreateInspector = useCallback(() => {
    setInspectorView("scry");
  }, []);

  const stableCallbacks = useMemo<InspectorCallbacks>(
    () => ({
      onClose: () => callbacksRef.current?.onClose(),
      onEdit: () => callbacksRef.current?.onEdit?.(),
      onEditSeed: () => callbacksRef.current?.onEditSeed?.(),
      onEditResult: () => callbacksRef.current?.onEditResult?.(),
      onSavePartyVtt: (selectedIndices, options) =>
        callbacksRef.current?.onSavePartyVtt?.(selectedIndices, options),
      onLoadPartyVtt: () => callbacksRef.current?.onLoadPartyVtt?.(),
      onSaveToLibrary: () => callbacksRef.current?.onSaveToLibrary?.(),
      onSaveInspectedMarkdown: (markdown) =>
        callbacksRef.current?.onSaveInspectedMarkdown?.(markdown),
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
      setScryingGlassOpen,
      toggleScryingGlass,
      setLibraryInspector,
      openCreateInspector,
      closeCreateInspector,
      setInspectorTab,
      applyInspectedEntity,
    }),
    [
      setScryingGlassOpen,
      toggleScryingGlass,
      setLibraryInspector,
      openCreateInspector,
      closeCreateInspector,
      setInspectorTab,
      applyInspectedEntity,
    ],
  );

  const layout = useMemo<CommandCenterLayout>(
    () => ({ scryingGlassOpen, inspectorView }),
    [scryingGlassOpen, inspectorView],
  );

  const inspectorFocus = useMemo(
    () => ({ inspectedEntity, inspectorTab }),
    [inspectedEntity, inspectorTab],
  );

  return (
    <CommandCenterActionsContext.Provider value={actions}>
      <CommandCenterLayoutContext.Provider value={layout}>
        <CommandCenterInspectorContext.Provider value={libraryInspector}>
          <InspectorFocusContext.Provider value={inspectorFocus}>
            {children}
          </InspectorFocusContext.Provider>
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

export function useInspectorFocus(): {
  inspectedEntity: InspectMeta | null;
  inspectorTab: InspectorTabId;
} {
  const focus = useContext(InspectorFocusContext);
  if (!focus) return { inspectedEntity: null, inspectorTab: "details" };
  return focus;
}
