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
import type { CiClass } from "@/lib/ciRegistry";
import { readAnyVaultDragData, type VaultDragPayload } from "@/lib/vault/cfDragDrop";
import {
  filterVaultEntries,
  loadVaultCardEntries,
  type VaultCardEntry,
  type VaultShelf,
} from "@/lib/vault/loadVaultEntries";
import { CUSTOM_SRD_CHANGED_EVENT } from "@/lib/srd/srdCustomLibrary";
import { CHARACTERS_CHANGED_EVENT } from "@/lib/tabletop/characterLibrary";
import { NPCS_CHANGED_EVENT } from "@/lib/worldAssets/npc";
import { ITEMS_CHANGED_EVENT } from "@/lib/itemLibrary";
import { VAULT_EXCLUSION_CHANGED_EVENT } from "@/lib/vault/vaultExclusion";

const VAULT_OPEN_KEY = "ddeasy-vault-drawer-open";

export type VaultDropHandler = (
  payload: VaultDragPayload,
  zoneId: string,
) => Promise<{ ok: boolean; message?: string } | void> | { ok: boolean; message?: string } | void;

export type VaultDropRegistration = {
  zoneId: string;
  label: string;
  accepts?: CiClass[];
  handler: VaultDropHandler;
};

type VaultDrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  entries: VaultCardEntry[];
  refreshEntries: () => Promise<void>;
  shelf: VaultShelf;
  setShelf: (shelf: VaultShelf) => void;
  query: string;
  setQuery: (query: string) => void;
  filteredEntries: VaultCardEntry[];
  dragging: VaultDragPayload | null;
  setDragging: (payload: VaultDragPayload | null) => void;
  /** Sync read of the in-flight payload (survives dragend / MIME gaps on drop). */
  peekDragging: () => VaultDragPayload | null;
  /** Zone currently under the pointer during an HTML5 drag (visual hover). */
  dropHoverZoneId: string | null;
  setDropHoverZoneId: (zoneId: string | null) => void;
  registerDropZone: (registration: VaultDropRegistration) => void;
  unregisterDropZone: (zoneId: string) => void;
  dropZones: VaultDropRegistration[];
  handleDrop: (zoneId: string, payload: VaultDragPayload) => Promise<{ ok: boolean; message?: string }>;
};

const VaultDrawerContext = createContext<VaultDrawerContextValue | null>(null);

export function VaultDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [entries, setEntries] = useState<VaultCardEntry[]>([]);
  const [shelf, setShelf] = useState<VaultShelf>("all");
  const [query, setQuery] = useState("");
  const [dragging, setDraggingState] = useState<VaultDragPayload | null>(null);
  const draggingRef = useRef<VaultDragPayload | null>(null);
  const [dropHoverZoneId, setDropHoverZoneId] = useState<string | null>(null);
  const dropZonesRef = useRef<Map<string, VaultDropRegistration>>(new Map());
  const [dropZones, setDropZones] = useState<VaultDropRegistration[]>([]);

  const setDragging = useCallback((payload: VaultDragPayload | null) => {
    draggingRef.current = payload;
    setDraggingState(payload);
    if (!payload) setDropHoverZoneId(null);
  }, []);

  const peekDragging = useCallback(() => draggingRef.current, []);

  useEffect(() => {
    try {
      setOpenState(localStorage.getItem(VAULT_OPEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  /** Clear ephemeral drag UI when the OS drag ends anywhere (cross-panel safety).
   * Microtask delay keeps peekDragging() available during the synchronous `drop` handler. */
  useEffect(() => {
    const clear = () => {
      queueMicrotask(() => {
        draggingRef.current = null;
        setDraggingState(null);
        setDropHoverZoneId(null);
      });
    };
    window.addEventListener("dragend", clear);
    return () => window.removeEventListener("dragend", clear);
  }, []);

  /** Track drags from sources that only write DataTransfer (SRD browser rows, rich text)
   * so every drop zone arms. Bubble phase: the source's own handler has set data by now. */
  useEffect(() => {
    const track = (event: DragEvent) => {
      if (draggingRef.current || !event.dataTransfer) return;
      const payload = readAnyVaultDragData(event.dataTransfer);
      if (!payload) return;
      draggingRef.current = payload;
      setDraggingState(payload);
    };
    window.addEventListener("dragstart", track);
    return () => window.removeEventListener("dragstart", track);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(VAULT_OPEN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleOpen = useCallback(() => {
    setOpenState((current) => {
      const next = !current;
      try {
        localStorage.setItem(VAULT_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const refreshEntries = useCallback(async () => {
    const rows = await loadVaultCardEntries();
    setEntries(rows);
  }, []);

  useEffect(() => {
    void refreshEntries();
    const reload = () => void refreshEntries();
    window.addEventListener(CHARACTERS_CHANGED_EVENT, reload);
    window.addEventListener(NPCS_CHANGED_EVENT, reload);
    window.addEventListener(ITEMS_CHANGED_EVENT, reload);
    window.addEventListener(CUSTOM_SRD_CHANGED_EVENT, reload);
    window.addEventListener(VAULT_EXCLUSION_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener(CHARACTERS_CHANGED_EVENT, reload);
      window.removeEventListener(NPCS_CHANGED_EVENT, reload);
      window.removeEventListener(ITEMS_CHANGED_EVENT, reload);
      window.removeEventListener(CUSTOM_SRD_CHANGED_EVENT, reload);
      window.removeEventListener(VAULT_EXCLUSION_CHANGED_EVENT, reload);
    };
  }, [refreshEntries]);

  const registerDropZone = useCallback((registration: VaultDropRegistration) => {
    const existed = dropZonesRef.current.has(registration.zoneId);
    dropZonesRef.current.set(registration.zoneId, registration);
    // Only notify React when membership changes — silent updates avoid
    // Maximum update depth loops from zones re-registering every render.
    if (!existed) {
      setDropZones([...dropZonesRef.current.values()]);
    }
  }, []);

  const unregisterDropZone = useCallback((zoneId: string) => {
    if (!dropZonesRef.current.has(zoneId)) return;
    dropZonesRef.current.delete(zoneId);
    setDropZones([...dropZonesRef.current.values()]);
  }, []);

  const handleDrop = useCallback(async (zoneId: string, payload: VaultDragPayload) => {
    const zone = dropZonesRef.current.get(zoneId);
    if (!zone) {
      return { ok: false, message: "No drop target is active here." };
    }
    if (zone.accepts && !zone.accepts.includes(payload.ciClass)) {
      return { ok: false, message: "This zone does not accept that card type." };
    }
    const result = await zone.handler(payload, zoneId);
    if (result && typeof result === "object" && "ok" in result) {
      return { ok: Boolean(result.ok), message: result.message };
    }
    return { ok: true };
  }, []);

  const filteredEntries = useMemo(
    () => filterVaultEntries(entries, shelf, query),
    [entries, shelf, query],
  );

  const value = useMemo<VaultDrawerContextValue>(
    () => ({
      open,
      setOpen,
      toggleOpen,
      entries,
      refreshEntries,
      shelf,
      setShelf,
      query,
      setQuery,
      filteredEntries,
      dragging,
      setDragging,
      peekDragging,
      dropHoverZoneId,
      setDropHoverZoneId,
      registerDropZone,
      unregisterDropZone,
      dropZones,
      handleDrop,
    }),
    [
      open,
      setOpen,
      toggleOpen,
      entries,
      refreshEntries,
      shelf,
      query,
      filteredEntries,
      dragging,
      setDragging,
      peekDragging,
      dropHoverZoneId,
      registerDropZone,
      unregisterDropZone,
      dropZones,
      handleDrop,
    ],
  );

  return <VaultDrawerContext.Provider value={value}>{children}</VaultDrawerContext.Provider>;
}

export function useVaultDrawer(): VaultDrawerContextValue {
  const ctx = useContext(VaultDrawerContext);
  if (!ctx) throw new Error("useVaultDrawer must be used within VaultDrawerProvider");
  return ctx;
}

export function useVaultDrawerOptional(): VaultDrawerContextValue | null {
  return useContext(VaultDrawerContext);
}

export function useVaultDropZone(registration: VaultDropRegistration | null): void {
  const { registerDropZone, unregisterDropZone } = useVaultDrawer();
  const registrationRef = useRef(registration);
  registrationRef.current = registration;
  const zoneId = registration?.zoneId ?? null;

  useEffect(() => {
    if (!zoneId) return;
    // Stable registration: handler/accepts/label always read from the latest ref
    // so parent memo churn cannot loop setState via unregister/register.
    registerDropZone({
      zoneId,
      get label() {
        return registrationRef.current?.label ?? zoneId;
      },
      get accepts() {
        return registrationRef.current?.accepts;
      },
      handler: async (payload, id) => {
        const current = registrationRef.current;
        if (!current) return { ok: false, message: "Drop zone is inactive." };
        return current.handler(payload, id);
      },
    });
    return () => unregisterDropZone(zoneId);
  }, [zoneId, registerDropZone, unregisterDropZone]);
}
