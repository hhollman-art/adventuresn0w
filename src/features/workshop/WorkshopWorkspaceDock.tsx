"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  activeWorkshopNavId,
  WORKSHOP_NAV_ITEMS,
  type WorkshopCreationId,
} from "@/lib/workplace/workshopNav";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";
import WorkshopWorkspaceIconControl from "@/features/workshop/WorkshopWorkspaceIconControl";

type WorkshopWorkspaceDockProps = {
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

/** Center-screen workspace launcher for the welcome hearth. */
export default function WorkshopWorkspaceDock({
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
}: WorkshopWorkspaceDockProps) {
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

  const dockItems = WORKSHOP_NAV_ITEMS.filter((item) => item.id !== "welcome");

  return (
    <nav
      className="workshop-workspace-dock"
      aria-label="Choose a Fantasy Forge workspace"
    >
      <p className="workshop-workspace-dock-kicker">Choose your workspace</p>
      <ul className="workshop-workspace-dock-grid" role="list">
        {dockItems.map((item) => {
          const active = activeId === item.id;

          if (item.creation) {
            return (
              <li key={item.id}>
                <WorkshopWorkspaceIconControl
                  item={item}
                  active={active}
                  size="dock"
                  onClick={() => goCreation(item.creation!)}
                />
              </li>
            );
          }

          if (item.href) {
            return (
              <li key={item.id}>
                <WorkshopWorkspaceIconControl
                  item={item}
                  active={active}
                  size="dock"
                  href={item.href}
                />
              </li>
            );
          }

          return null;
        })}
      </ul>
      <button
        type="button"
        onClick={goWelcome}
        className="workshop-workspace-dock-home mt-4 text-xs font-semibold text-[var(--accent-dim)] underline-offset-2 hover:underline"
      >
        Return to welcome hearth
      </button>
    </nav>
  );
}
