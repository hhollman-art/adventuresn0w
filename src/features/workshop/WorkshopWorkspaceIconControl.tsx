"use client";

import Link from "next/link";
import type { WorkshopNavItem } from "@/lib/workplace/workshopNav";
import FantasyTooltip from "@/features/ui/FantasyTooltip";

type WorkshopWorkspaceIconControlProps = {
  item: WorkshopNavItem;
  active?: boolean;
  size?: "dock" | "tab";
  onClick?: () => void;
  href?: string;
};

function iconClassName(item: WorkshopNavItem, active: boolean, size: "dock" | "tab"): string {
  const root = "workshop-workspace-icon";
  return [
    root,
    size === "tab" ? `${root}--tab` : `${root}--dock`,
    active ? `${root}--active` : "",
    item.id === "library" ? `${root}--library` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function WorkshopWorkspaceIconContent({
  item,
  size,
}: {
  item: WorkshopNavItem;
  size: "dock" | "tab";
}) {
  return (
    <>
      <span className="workshop-workspace-icon-glyph" aria-hidden="true">
        {item.icon}
      </span>
      <FantasyTooltip
        label={item.label}
        hint={item.hint}
        dmTip={item.dmTip}
        className={`workshop-workspace-icon-tooltip${
          size === "tab" ? " workshop-workspace-icon-tooltip--below" : ""
        }`}
      />
    </>
  );
}

/** Shared workspace icon button/link with hover scale + rich tooltip. */
export default function WorkshopWorkspaceIconControl({
  item,
  active = false,
  size = "tab",
  onClick,
  href,
}: WorkshopWorkspaceIconControlProps) {
  const className = iconClassName(item, active, size);
  const ariaLabel = `${item.label}: ${item.hint}`;

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
      >
        <WorkshopWorkspaceIconContent item={item} size={size} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
    >
      <WorkshopWorkspaceIconContent item={item} size={size} />
    </button>
  );
}
