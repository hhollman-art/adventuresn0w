"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import WorkshopWorkspaceTabs from "@/features/workshop/WorkshopWorkspaceTabs";
import ForgeContentShell from "@/features/workshop/ForgeContentShell";
import ForgeLayoutWithSidebar from "@/features/workshop/ForgeLayoutWithSidebar";
import { buildWorkshopBreadcrumbs } from "@/lib/workshop/workshopBreadcrumbs";

type WorkshopPageShellProps = {
  children: ReactNode;
};

/** Fantasy Forge layout: workspace tabs, breadcrumbs, then page content. */
export default function WorkshopPageShell({ children }: WorkshopPageShellProps) {
  const pathname = usePathname() ?? "/";
  const breadcrumbs = useMemo(
    () => buildWorkshopBreadcrumbs({ pathname, workspace: "welcome" }),
    [pathname],
  );

  return (
    <main className="app-main app-main--workshop app-main--workplace-page mx-auto flex w-full max-w-[110rem] flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:gap-5">
      <WorkshopWorkspaceTabs />
      <ForgeContentShell>
        <ForgeLayoutWithSidebar breadcrumbs={breadcrumbs} showSidebar={false}>
          <div className="workshop-page-main min-w-0">{children}</div>
        </ForgeLayoutWithSidebar>
      </ForgeContentShell>
    </main>
  );
}
