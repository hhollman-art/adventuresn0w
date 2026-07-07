"use client";

import type { ReactNode } from "react";
import type { WorkshopCreationId } from "@/lib/workplace/workshopNav";
import type { BreadcrumbSegment } from "@/lib/workshop/workshopBreadcrumbs";
import CollapsibleWorkspaceSidebar from "@/features/workshop/CollapsibleWorkspaceSidebar";
import WorkshopBreadcrumbs from "@/features/workshop/WorkshopBreadcrumbs";

type ForgeLayoutWithSidebarProps = {
  children: ReactNode;
  showSidebar?: boolean;
  breadcrumbs: BreadcrumbSegment[];
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

export default function ForgeLayoutWithSidebar({
  children,
  showSidebar = false,
  breadcrumbs,
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
}: ForgeLayoutWithSidebarProps) {
  return (
    <div
      className="forge-layout-with-sidebar min-h-0 flex-1 data-[welcome=true]:min-h-auto data-[welcome=true]:flex-none"
      data-welcome={workspace === "welcome" ? "true" : undefined}
    >
      {showSidebar ? (
        <CollapsibleWorkspaceSidebar
          workspace={workspace}
          onSelectWelcome={onSelectWelcome}
          onSelectCreation={onSelectCreation}
        />
      ) : null}
      <div className="forge-layout-main min-h-0 min-w-0 flex flex-1 flex-col gap-3">
        <WorkshopBreadcrumbs segments={breadcrumbs} />
        {children}
      </div>
    </div>
  );
}
