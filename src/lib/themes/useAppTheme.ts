"use client";

import { useCallback, useEffect, useState } from "react";
import { applyAppTheme } from "./applyTheme";
import { DEFAULT_APP_THEME } from "./registry";
import { readStoredTheme } from "./themeStorage";
import type { AppThemeId } from "./types";

export function useAppTheme(): {
  themeId: AppThemeId;
  setThemeId: (id: AppThemeId) => void;
} {
  const [themeId, setThemeIdState] = useState<AppThemeId>(DEFAULT_APP_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    applyAppTheme(stored);
    setThemeIdState(stored);

    const onThemeChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ id: AppThemeId }>).detail;
      if (detail?.id) setThemeIdState(detail.id);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "ddeasy-app-theme" && event.newValue) {
        setThemeIdState(readStoredTheme());
      }
    };

    window.addEventListener("ddeasy:theme-changed", onThemeChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("ddeasy:theme-changed", onThemeChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setThemeId = useCallback((id: AppThemeId) => {
    applyAppTheme(id);
    setThemeIdState(id);
  }, []);

  return { themeId, setThemeId };
}
