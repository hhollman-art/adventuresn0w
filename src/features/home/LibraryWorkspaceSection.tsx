"use client";

import type { ReactNode } from "react";

export type LibraryWorkspaceSectionProps = {
  resultsPanel: ReactNode;
  scryingPanel: ReactNode;
};

/** Library workspace — 60/40 split: dense results left, inline Scrying panel right. */
export function LibraryWorkspaceSection({ resultsPanel, scryingPanel }: LibraryWorkspaceSectionProps) {
  return (
    <section
      className="library-split-workspace panel-scroll fantasy-panel no-print flex min-h-0 flex-1 flex-col rounded-xl border p-2 sm:p-3"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
      aria-label="Library workspace"
    >
      <div className="library-split-workspace__grid grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-10 lg:gap-3">
        <div className="library-split-workspace__results flex min-h-0 min-w-0 flex-col lg:col-span-6">
          {resultsPanel}
        </div>
        <aside
          className="library-split-workspace__scrying flex min-h-0 min-w-0 flex-col lg:col-span-4"
          aria-label="Scrying window panel"
        >
          {scryingPanel}
        </aside>
      </div>
    </section>
  );
}
