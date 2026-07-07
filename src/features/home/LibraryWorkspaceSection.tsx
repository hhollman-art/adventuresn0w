"use client";

import { APP_ICONS } from "@/lib/ui/appIcons";
import { PREVIEW_WINDOW } from "@/lib/ui/labels";
import type { ReactNode } from "react";

export type LibraryWorkspaceSectionProps = {
  libraryPanel: ReactNode;
};

export function LibraryWorkspaceSection({ libraryPanel }: LibraryWorkspaceSectionProps) {
  return (
    <section
      className="library-workshop-browse panel-scroll fantasy-panel no-print flex min-h-0 flex-1 flex-col rounded-xl border p-4"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mb-3 shrink-0 space-y-2">
        <h2 className="font-display text-base font-bold text-[var(--text)]">
          <span aria-hidden="true">{APP_ICONS.library} </span>
          Search the stacks
        </h2>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Pick a shelf, narrow by kind, then choose a tome — the {PREVIEW_WINDOW} opens
          automatically for reading and export.
        </p>
      </div>
      {libraryPanel}
    </section>
  );
}
