"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  WORKSHOP_NAV_GROUPS,
  WORKSHOP_NAV_GROUP_LABEL,
  WORKSHOP_NAV_ITEMS,
  type WorkshopCreationId,
} from "@/lib/workplace/workshopNav";
import { dispatchWorkshopWelcome } from "@/lib/workshop/goWelcome";
import WorkshopWorkspaceIconControl from "@/features/workshop/WorkshopWorkspaceIconControl";
import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

const SIDEBAR_STORAGE_KEY = "ddeasy-workshop-sidebar-collapsed";

type CollapsibleWorkspaceSidebarProps = {
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

export default function CollapsibleWorkspaceSidebar({
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
}: CollapsibleWorkspaceSidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
    <aside
      className={`collapsible-workshop-sidebar fantasy-panel no-print shrink-0 rounded-xl border${
        collapsed ? " collapsible-workshop-sidebar--collapsed" : ""
      }`}
      aria-label="Workspace navigation"
    >
      <div className="collapsible-workshop-sidebar-head">
        {!collapsed ? (
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Workspaces
          </p>
        ) : null}
        <FantasyTooltipWrap
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          hint="Show or hide workspace navigation labels"
          placement="below"
        >
          <button
            type="button"
            onClick={toggle}
            className="btn btn-sm btn-ghost collapsible-workshop-sidebar-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </FantasyTooltipWrap>
      </div>

      <div className="collapsible-workshop-sidebar-body panel-scroll">
        {WORKSHOP_NAV_GROUPS.map((group) => {
          const items = WORKSHOP_NAV_ITEMS.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <section key={group} className="collapsible-workshop-sidebar-group">
              {!collapsed ? (
                <h3 className="collapsible-workshop-sidebar-group-label">
                  {WORKSHOP_NAV_GROUP_LABEL[group]}
                </h3>
              ) : null}
              <ul className="collapsible-workshop-sidebar-list" role="list">
                {items.map((item) => {
                  const active =
                    (item.href && pathname.startsWith(item.href)) ||
                    (item.creation && workspace === item.creation) ||
                    (item.id === "welcome" && pathname === "/" && workspace === "welcome");

                  if (item.id === "welcome") {
                    return (
                      <li key={item.id}>
                        <WorkshopWorkspaceIconControl
                          item={item}
                          active={active}
                          size={collapsed ? "tab" : "dock"}
                          onClick={goWelcome}
                        />
                        {!collapsed ? (
                          <span className="collapsible-workshop-sidebar-label">{item.label}</span>
                        ) : null}
                      </li>
                    );
                  }

                  if (item.creation) {
                    return (
                      <li key={item.id}>
                        <WorkshopWorkspaceIconControl
                          item={item}
                          active={active}
                          size={collapsed ? "tab" : "dock"}
                          onClick={() => goCreation(item.creation!)}
                        />
                        {!collapsed ? (
                          <span className="collapsible-workshop-sidebar-label">{item.label}</span>
                        ) : null}
                      </li>
                    );
                  }

                  if (item.href) {
                    return (
                      <li key={item.id}>
                        <WorkshopWorkspaceIconControl
                          item={item}
                          active={active}
                          size={collapsed ? "tab" : "dock"}
                          href={item.href}
                        />
                        {!collapsed ? (
                          <span className="collapsible-workshop-sidebar-label">{item.label}</span>
                        ) : null}
                      </li>
                    );
                  }

                  return null;
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
