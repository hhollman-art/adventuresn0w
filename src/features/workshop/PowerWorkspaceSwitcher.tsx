"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  POWER_WORKSPACE_CORE_META,
  coreFromPathname,
  type PowerWorkspaceCore,
} from "@/lib/workshop/powerWorkspaceMachine";
import { usePowerWorkspaceOptional } from "@/features/workshop/PowerWorkspaceProvider";

const CORES: PowerWorkspaceCore[] = ["library", "campaign", "character"];

/**
 * Primary 3-core Power Workspace switcher.
 * Legacy forge/tend tabs remain available via WorkshopWorkspaceTabs.
 */
export default function PowerWorkspaceSwitcher({
  onCreateNew,
}: {
  onCreateNew?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const power = usePowerWorkspaceOptional();
  const active = power?.state.core ?? coreFromPathname(pathname);

  return (
    <div
      className="power-workspace-switcher flex flex-wrap items-center gap-2 border-b px-3 py-2"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      role="navigation"
      aria-label="Power Workspaces"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
        Workspaces
      </span>
      {CORES.map((core) => {
        const meta = POWER_WORKSPACE_CORE_META[core];
        const isActive = active === core;
        return (
          <Link
            key={core}
            href={meta.href}
            onClick={() => power?.selectCore(core)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition"
            style={{
              borderColor: isActive ? "var(--accent)" : "var(--border)",
              background: isActive ? "var(--accent-dim)" : "var(--bg)",
              color: "var(--text)",
            }}
            title={meta.hint}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden>{meta.icon}</span>
            {meta.label}
          </Link>
        );
      })}
      {onCreateNew || power ? (
        <button
          type="button"
          className="btn btn-sm btn-accent ml-auto"
          onClick={() => {
            if (onCreateNew) onCreateNew();
            else power?.openCreateHub(undefined, true);
          }}
        >
          Create New…
        </button>
      ) : null}
    </div>
  );
}
