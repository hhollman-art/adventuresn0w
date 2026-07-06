"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import WorkshopSidebarPanel from "@/features/workshop/WorkshopSidebarPanel";
import {
  activeWorkshopNavId,
  type WorkshopCreationId,
} from "@/lib/workplace/workshopNav";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

type WorkshopSidebarWithRoutingProps = {
  /** Home route workspace selection; other routes default to welcome. */
  workspace?: "welcome" | WorkshopCreationId;
  footer?: ReactNode;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

export default function WorkshopSidebarWithRouting({
  workspace = "welcome",
  footer,
  onSelectWelcome,
  onSelectCreation,
}: WorkshopSidebarWithRoutingProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const activeId = activeWorkshopNavId({ pathname, workspace });

  return (
    <WorkshopSidebarPanel
      activeId={activeId}
      onSelectWelcome={
        onSelectWelcome ??
        (() => {
          router.push("/");
          dispatchWorkshopWelcome();
        })
      }
      onSelectCreation={
        onSelectCreation ??
        ((creation) => {
          router.push(`/?mode=${creation}`);
        })
      }
      footer={footer}
    />
  );
}
