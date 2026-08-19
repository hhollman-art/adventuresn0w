"use client";

import type { ReactNode } from "react";

export type LibraryWorkspaceSectionProps = {
  resultsPanel: ReactNode;
  /** @deprecated Scrying lives on the command-center right rail. Kept so callers can omit it. */
  scryingPanel?: ReactNode;
};

/** Library workspace — center pane (≥60% of the command center). */
export function LibraryWorkspaceSection({ resultsPanel }: LibraryWorkspaceSectionProps) {
  return (
    <section
      className="library-split-workspace fantasy-panel no-print flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border p-1.5 sm:p-2"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
      aria-label="Library workspace"
    >
      <div className="library-split-workspace__results flex min-h-0 min-w-0 flex-1 flex-col">
        {resultsPanel}
      </div>
    </section>
  );
}
