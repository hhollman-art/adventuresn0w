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
      aria-label="Search Creation Files and included rules"
      title="Search Creation Files and included rules (Ctrl+K)"
    >
      <span className="command-palette-trigger-label">Search CFs &amp; rules</span>
      <kbd className="command-palette-trigger-kbd">{SHORTCUT}</kbd>
    </button>
  );
}
