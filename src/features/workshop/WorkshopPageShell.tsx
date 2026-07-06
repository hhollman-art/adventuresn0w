"use client";

import type { ReactNode } from "react";
import WorkshopWorkspaceTabs from "@/features/workshop/WorkshopWorkspaceTabs";
import ForgeContentShell from "@/features/workshop/ForgeContentShell";

type WorkshopPageShellProps = {
  children: ReactNode;
  /** When set, stacks workspace content above a preview pane on the right. */
  preview?: ReactNode;
};

/**
 * Fantasy Forge layout: workspace tabs on top, then workspace content and an
 * optional preview/output pane below.
 */
export default function WorkshopPageShell({ children, preview }: WorkshopPageShellProps) {
  return (
    <main className="app-main app-main--workshop app-main--workplace-page mx-auto flex w-full max-w-[110rem] flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:gap-5">
      <WorkshopWorkspaceTabs />
      <ForgeContentShell bodyClassName={preview ? "forge-content-body--split" : undefined}>
        <div className="workshop-page-main min-w-0">{children}</div>
        {preview ? (
          <div className="workshop-page-preview min-w-0">{preview}</div>
        ) : null}
      </ForgeContentShell>
    </main>
  );
}
