"use client";

import type { ReactNode } from "react";

type LibraryTwoPaneBrowseProps = {
  navPane: ReactNode;
  listPane: ReactNode;
};

/** Folder/tag browser | dense searchable list — Library split layout (no detail column). */
export default function LibraryTwoPaneBrowse({ navPane, listPane }: LibraryTwoPaneBrowseProps) {
  return (
    <div className="library-two-pane min-h-0 flex-1 gap-2">
      <aside
        className="library-two-pane__nav flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-lg border p-1.5"
        style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.04)" }}
      >
        {navPane}
      </aside>
      <section className="library-two-pane__list flex min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden">
        {listPane}
      </section>
    </div>
  );
}
