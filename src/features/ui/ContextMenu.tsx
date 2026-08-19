"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ContextMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
  onSelect: () => void | Promise<void>;
};

type ContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  label: string;
  items: ContextMenuItem[];
  onClose: () => void;
};

/** Fixed-position right-click / long-press menu. */
export default function ContextMenu({ open, x, y, label, items, onClose }: ContextMenuProps) {
  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, onClose]);

  if (!open || visible.length === 0) return null;

  const maxX = typeof window !== "undefined" ? window.innerWidth - 16 : x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - 16 : y;
  const left = Math.max(8, Math.min(x, maxX - 220));
  const top = Math.max(8, Math.min(y, maxY - visible.length * 36));

  const menu = (
    <div
      className="cf-context-menu"
      role="menu"
      aria-label={label}
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {visible.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={`cf-context-menu__item${item.danger ? " cf-context-menu__item--danger" : ""}`}
          onClick={() => {
            if (item.disabled) return;
            onClose();
            void item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  if (typeof document === "undefined") return menu;
  return createPortal(menu, document.body);
}
