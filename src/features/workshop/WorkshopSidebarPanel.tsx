"use client";



import type { ReactNode } from "react";

import WorkshopWorkspaceNav from "@/features/workshop/WorkshopWorkspaceNav";

import type { WorkshopCreationId, WorkshopNavId } from "@/lib/workplace/workshopNav";



type WorkshopSidebarPanelProps = {

  activeId: WorkshopNavId | null;

  onSelectWelcome: () => void;

  onSelectCreation: (mode: WorkshopCreationId) => void;

  footer?: ReactNode;

  className?: string;

};



/** Left workspace pane — menu under the banner; content + preview live on the right. */

export default function WorkshopSidebarPanel({

  activeId,

  onSelectWelcome,

  onSelectCreation,

  footer,

  className = "",

}: WorkshopSidebarPanelProps) {

  return (

    <aside

      className={`workshop-workspace-nav-panel forge-forest-panel no-print shrink-0 ${className}`.trim()}

    >

      <WorkshopWorkspaceNav

        activeId={activeId}

        onSelectWelcome={onSelectWelcome}

        onSelectCreation={onSelectCreation}

      />

      {footer ? <div className="workshop-nav-footer">{footer}</div> : null}

    </aside>

  );

}

