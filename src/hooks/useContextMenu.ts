"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 12;

export type ContextMenuPosition = { x: number; y: number };

/**
 * Right-click and long-press handlers for Creation File cards.
 * Call `bind` on the interactive card root.
 */
export function useContextMenu() {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const pressTimer = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const openedFromPress = useRef(false);

  const clearPress = useCallback(() => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    startPoint.current = null;
  }, []);

  const openAt = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const close = useCallback(() => setPosition(null), []);

  const onContextMenu = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }) => {
      event.preventDefault();
      event.stopPropagation();
      openAt(event.clientX, event.clientY);
    },
    [openAt],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      startPoint.current = { x: event.clientX, y: event.clientY };
      openedFromPress.current = false;
      clearPress();
      pressTimer.current = window.setTimeout(() => {
        openedFromPress.current = true;
        openAt(event.clientX, event.clientY);
        pressTimer.current = null;
      }, LONG_PRESS_MS);
    },
    [clearPress, openAt],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!startPoint.current) return;
      const dx = event.clientX - startPoint.current.x;
      const dy = event.clientY - startPoint.current.y;
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clearPress();
    },
    [clearPress],
  );

  const onPointerUp = useCallback(() => {
    clearPress();
  }, [clearPress]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        openAt(rect.left + 12, rect.bottom);
      }
    },
    [openAt],
  );

  return {
    open: position != null,
    position,
    close,
    wasLongPress: () => openedFromPress.current,
    bind: {
      onContextMenu,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      onClickCapture: (event: { stopPropagation: () => void; preventDefault: () => void }) => {
        if (!openedFromPress.current) return;
        event.preventDefault();
        event.stopPropagation();
        openedFromPress.current = false;
      },
    },
  };
}
