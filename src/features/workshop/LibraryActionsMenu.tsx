"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";

export type LibraryActionsMenuProps = {
  syncState: "on" | "off" | "unsupported" | "needs-permission";
  onChooseFolder: () => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onExport: () => void;
  onRestoreFile: (event: ChangeEvent<HTMLInputElement>) => void;
  extraItems?: ReactNode;
};

/** Single header control for vault backup / auto-save — replaces scattered export buttons. */
export default function LibraryActionsMenu({
  syncState,
  onChooseFolder,
  onReconnect,
  onDisconnect,
  onExport,
  onRestoreFile,
  extraItems,
}: LibraryActionsMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="library-actions-menu relative" ref={rootRef}>
      <button
        type="button"
        className="btn btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        title="Backup, restore, and auto-save folder"
      >
        Actions
        <span aria-hidden="true" className="ml-1 text-[10px]">
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="library-actions-menu__panel absolute right-0 z-30 mt-1 min-w-[13.5rem] rounded-lg border py-1 shadow-lg"
          style={{
            background: "var(--panel)",
            borderColor: "var(--border)",
          }}
        >
          {syncState === "off" ? (
            <button type="button" role="menuitem" className="library-actions-menu__item" onClick={() => { setOpen(false); onChooseFolder(); }}>
              Set auto-save folder
            </button>
          ) : null}
          {syncState === "needs-permission" && onReconnect ? (
            <button type="button" role="menuitem" className="library-actions-menu__item" onClick={() => { setOpen(false); onReconnect(); }}>
              Re-enable auto-save
            </button>
          ) : null}
          {syncState === "on" ? (
            <>
              <button type="button" role="menuitem" className="library-actions-menu__item" onClick={() => { setOpen(false); onChooseFolder(); }}>
                Change auto-save folder
              </button>
              {onDisconnect ? (
                <button type="button" role="menuitem" className="library-actions-menu__item" onClick={() => { setOpen(false); onDisconnect(); }}>
                  Turn off auto-save
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" role="menuitem" className="library-actions-menu__item" onClick={() => { setOpen(false); onExport(); }}>
            Export backup
          </button>
          <label className="library-actions-menu__item cursor-pointer" role="menuitem">
            Restore backup
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                setOpen(false);
                onRestoreFile(event);
              }}
            />
          </label>
          {extraItems}
        </div>
      ) : null}
    </div>
  );
}
