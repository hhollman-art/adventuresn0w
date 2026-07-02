"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Toggles browser fullscreen and tracks its state.
 *
 * Pass the page's own root element to `toggle` when possible: fullscreening a
 * specific element means the browser renders only that subtree, so overlays
 * injected elsewhere in the document (e.g. by browser extensions) cannot sit
 * on top of the table and swallow clicks.
 */
export function useFullscreen(): {
  isFullscreen: boolean;
  toggle: (target?: HTMLElement | null) => void;
} {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback((target?: HTMLElement | null) => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    const el = target ?? document.documentElement;
    void el.requestFullscreen({ navigationUI: "hide" }).catch(() => {
      if (el !== document.documentElement) {
        void document.documentElement.requestFullscreen().catch(() => {});
      }
    });
  }, []);

  return { isFullscreen, toggle };
}
