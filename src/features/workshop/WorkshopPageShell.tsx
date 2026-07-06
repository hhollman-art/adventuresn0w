"use client";

import type { ReactNode } from "react";
import WorkshopWorkspaceTabs from "@/features/workshop/WorkshopWorkspaceTabs";
import ForgeContentShell from "@/features/workshop/ForgeContentShell";

type WorkshopPageShellProps = {
  children: ReactNode;
};

/**
 * Fantasy Forge layout: workspace tabs on top, then full-width workspace content.
 * Output review lives in the separate Preview Window tab.
 */
export default function WorkshopPageShell({ children }: WorkshopPageShellProps) {
  return (
    <main className="app-main app-main--workshop app-main--workplace-page mx-auto flex w-full max-w-[110rem] flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:gap-5">
      <WorkshopWorkspaceTabs />
      <ForgeContentShell>
        <div className="workshop-page-main min-w-0">{children}</div>
      </ForgeContentShell>
    </main>
  );
}
