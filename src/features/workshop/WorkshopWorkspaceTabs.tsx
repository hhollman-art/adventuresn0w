"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  activeWorkshopNavId,
  WORKSHOP_NAV_ITEMS,
  type WorkshopCreationId,
} from "@/lib/workplace/workshopNav";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";
import WorkshopWorkspaceIconControl from "@/features/workshop/WorkshopWorkspaceIconControl";

type WorkshopWorkspaceTabsProps = {
  /** Home route workspace selection; other routes default to welcome. */
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

/** Horizontal Fantasy Forge workspace tabs — icon-only with hover tips. */
export default function WorkshopWorkspaceTabs({
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
}: WorkshopWorkspaceTabsProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const activeId = activeWorkshopNavId({ pathname, workspace });

  const goWelcome =
    onSelectWelcome ??
    (() => {
      router.push("/");
      dispatchWorkshopWelcome();
    });

  const goCreation =
    onSelectCreation ??
    ((creation: WorkshopCreationId) => {
      router.push(`/?mode=${creation}`);
    });

  return (
    <nav
      className="workshop-workspace-tabs forge-forest-panel no-print shrink-0"
      aria-label="Fantasy Forge workspaces"
    >
      <div className="workshop-workspace-tabs-scroll" role="tablist">
        {WORKSHOP_NAV_ITEMS.map((item) => {
          const active = activeId === item.id;

          if (item.id === "welcome") {
            return (
              <WorkshopWorkspaceIconControl
                key={item.id}
                item={item}
                active={active}
                size="tab"
                onClick={goWelcome}
              />
            );
          }
          if (item.creation) {
            return (
              <WorkshopWorkspaceIconControl
                key={item.id}
                item={item}
                active={active}
                size="tab"
                onClick={() => goCreation(item.creation!)}
              />
            );
          }
          if (item.href) {
            return (
              <WorkshopWorkspaceIconControl
                key={item.id}
                item={item}
                active={active}
                size="tab"
                href={item.href}
              />
            );
          }
          return null;
        })}
      </div>
    </nav>
  );
}
