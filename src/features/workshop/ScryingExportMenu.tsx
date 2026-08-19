"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ScryingExportAction = "copy-text" | "print-pdf";

type ScryingExportMenuProps = {
  disabled?: boolean;
  onAction: (action: ScryingExportAction) => void;
};

/**
 * Collapsed secondary export / share menu for Scrying Glass.
 * Primary save stays in the footer — this only covers external share paths.
 */
export default function ScryingExportMenu({
  disabled = false,
  onAction,
}: ScryingExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: ScryingExportAction) {
    setOpen(false);
    onAction(action);
  }

  return (
    <div className="scrying-export-menu relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className="scrying-export-menu__trigger rounded-md border px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Share
        <span aria-hidden="true" className="ml-1 opacity-70">
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Share"
          className="scrying-export-menu__panel absolute right-0 z-20 mt-1 min-w-[14.5rem] rounded-lg border py-1 shadow-lg"
          style={{
            borderColor: "rgba(142, 212, 255, 0.35)",
            background: "color-mix(in srgb, var(--sg-bg, #2d5f8f) 92%, black)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="scrying-export-menu__item"
            onClick={() => run("copy-text")}
          >
            <span className="font-semibold">Copy text</span>
            <span className="block text-[10px] font-normal opacity-80">
              Paste into notes apps
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="scrying-export-menu__item"
            onClick={() => run("print-pdf")}
          >
            <span className="font-semibold">Print / Save as PDF</span>
            <span className="block text-[10px] font-normal opacity-80">
              Clean tabletop print layout
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
