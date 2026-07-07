"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AnnouncementConfig } from "@/lib/admin/announcementConfig";
import { DEFAULT_ANNOUNCEMENT_CONFIG } from "@/lib/admin/announcementConfig";
import {
  dismissAnnouncementForSession,
  isAnnouncementDismissed,
  loadAnnouncementConfig,
  saveAnnouncementConfigRemote,
} from "@/lib/admin/announcementStore";

type AdminAnnouncementContextValue = {
  /** Live config driving {@link AdminAnnouncementBanner}. */
  config: AnnouncementConfig;
  /** Editable draft for {@link AdminUiPanel}. */
  draft: AnnouncementConfig;
  visible: boolean;
  saving: boolean;
  saveError: string | null;
  setDraft: (patch: Partial<AnnouncementConfig>) => void;
  saveChanges: () => Promise<boolean>;
  dismiss: () => void;
  refresh: () => void;
};

const AdminAnnouncementContext = createContext<AdminAnnouncementContextValue | null>(null);

/**
 * Shares announcement config between {@link AdminUiPanel} (write) and
 * {@link AdminAnnouncementBanner} (read + dismiss).
 */
export function AdminAnnouncementProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AnnouncementConfig>(DEFAULT_ANNOUNCEMENT_CONFIG);
  const [draft, setDraftState] = useState<AnnouncementConfig>(DEFAULT_ANNOUNCEMENT_CONFIG);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    const loaded = loadAnnouncementConfig();
    setConfig(loaded);
    setDraftState(loaded);
    setDismissed(isAnnouncementDismissed(loaded.updatedAt));
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "ddeasy-admin-announcement-v1") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const setDraft = useCallback((patch: Partial<AnnouncementConfig>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
    setSaveError(null);
  }, []);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    const next: AnnouncementConfig = {
      ...draft,
      message: draft.message.trim(),
      updatedAt: new Date().toISOString(),
    };
    const result = await saveAnnouncementConfigRemote(next);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return false;
    }
    setConfig(next);
    setDraftState(next);
    setDismissed(false);
    return true;
  }, [draft]);

  const dismiss = useCallback(() => {
    dismissAnnouncementForSession(config.updatedAt);
    setDismissed(true);
  }, [config.updatedAt]);

  const visible =
    hydrated && config.active && config.message.trim().length > 0 && !dismissed;

  const value = useMemo<AdminAnnouncementContextValue>(
    () => ({
      config,
      draft,
      visible,
      saving,
      saveError,
      setDraft,
      saveChanges,
      dismiss,
      refresh,
    }),
    [config, draft, visible, saving, saveError, setDraft, saveChanges, dismiss, refresh],
  );

  return (
    <AdminAnnouncementContext.Provider value={value}>{children}</AdminAnnouncementContext.Provider>
  );
}

export function useAdminAnnouncement(): AdminAnnouncementContextValue {
  const ctx = useContext(AdminAnnouncementContext);
  if (!ctx) {
    throw new Error("useAdminAnnouncement must be used within AdminAnnouncementProvider");
  }
  return ctx;
}
