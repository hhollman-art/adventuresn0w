"use client";

import type { ReactNode } from "react";

type LibraryThreePaneBrowseProps = {
  navPane: ReactNode;
  listPane: ReactNode;
  detailPane: ReactNode;
};

/** Folder/tag browser | searchable list | detail — additive wide Library layout. */
export default function LibraryThreePaneBrowse({
  navPane,
  listPane,
  detailPane,
}: LibraryThreePaneBrowseProps) {
  return (
    <div className="library-three-pane min-h-0 flex-1 gap-3">
      <aside className="library-three-pane__nav flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border p-2"
        style={{ borderColor: "var(--border)", background: "rgba(154, 116, 22, 0.04)" }}
      >
        {navPane}
      </aside>
      <section className="library-three-pane__list flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
        {listPane}
      </section>
      <aside className="library-three-pane__detail flex min-h-0 min-w-0 flex-col overflow-hidden">
        {detailPane}
      </aside>
    </div>
  );
}
