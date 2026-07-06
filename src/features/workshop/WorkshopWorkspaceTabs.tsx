"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  activeWorkshopNavId,
  WORKSHOP_NAV_ITEMS,
  type WorkshopCreationId,
} from "@/lib/workplace/workshopNav";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";

type WorkshopWorkspaceTabsProps = {
  /** Home route workspace selection; other routes default to welcome. */
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
  /** Extra controls pinned at the end of the row (e.g. workflow guides). */
  trailing?: ReactNode;
};

/** Horizontal Fantasy Forge workspace tabs — sits under the banner so content gets full width. */
export default function WorkshopWorkspaceTabs({
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
  trailing,
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
          const className = `workshop-workspace-tab${
            active ? " workshop-workspace-tab-active" : ""
          }${item.id === "library" ? " workshop-workspace-tab--library" : ""}`;
          const inner = (
            <>
              <span className="workshop-workspace-tab-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="workshop-workspace-tab-label font-display">{item.label}</span>
            </>
          );

          if (item.id === "welcome") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={goWelcome}
                className={className}
                title={item.hint}
                aria-current={active ? "page" : undefined}
              >
                {inner}
              </button>
            );
          }
          if (item.creation) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goCreation(item.creation!)}
                className={className}
                title={item.hint}
                aria-current={active ? "page" : undefined}
              >
                {inner}
              </button>
            );
          }
          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={className}
                title={item.hint}
                aria-current={active ? "page" : undefined}
              >
                {inner}
              </Link>
            );
          }
          return null;
        })}
      </div>
      {trailing ? <div className="workshop-workspace-tabs-trailing">{trailing}</div> : null}
    </nav>
  );
}
