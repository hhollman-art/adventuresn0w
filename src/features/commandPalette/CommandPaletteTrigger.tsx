"use client";

import { openCommandPalette } from "@/lib/commandPalette/commandPaletteEvents";

const SHORTCUT =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "\u2318K" : "Ctrl K";

export default function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      className="command-palette-trigger"
      onClick={openCommandPalette}
      aria-label="Open command palette"
      title="Jump anywhere (Ctrl+K)"
    >
      <span className="command-palette-trigger-label">Jump to…</span>
      <kbd className="command-palette-trigger-kbd">{SHORTCUT}</kbd>
    </button>
  );
}
