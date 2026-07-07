"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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

type TooltipPoint = {
  left: number;
  top: number;
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

function tooltipPointForElement(el: HTMLElement): TooltipPoint {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + rect.width / 2,
    top: rect.top - 8,
  };
}

function WorkshopWorkspaceIconGlyph({ icon }: { icon: string }) {
  return (
    <span className="workshop-workspace-icon-glyph" aria-hidden="true">
      {icon}
    </span>
  );
}

/** Inline tooltip used by the welcome dock — same markup/CSS as always. */
function WorkshopWorkspaceIconContent({ item }: { item: WorkshopNavItem }) {
  return (
    <>
      <WorkshopWorkspaceIconGlyph icon={item.icon} />
      <FantasyTooltip
        label={item.label}
        hint={item.hint}
        dmTip={item.dmTip}
        className="workshop-workspace-icon-tooltip"
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
  const ariaLabel = size === "tab" ? item.label : `${item.label}: ${item.hint}`;
  const usePortaledTooltip = size === "tab";
  const triggerRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const [tooltipPoint, setTooltipPoint] = useState<TooltipPoint | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showTooltip = useCallback(() => {
    if (!usePortaledTooltip) return;
    const el = triggerRef.current;
    if (!el) return;
    setTooltipPoint(tooltipPointForElement(el));
  }, [usePortaledTooltip]);

  const hideTooltip = useCallback(() => {
    if (!usePortaledTooltip) return;
    setTooltipPoint(null);
  }, [usePortaledTooltip]);

  const portaledTooltip =
    usePortaledTooltip && mounted && tooltipPoint
      ? createPortal(
          <FantasyTooltip
            label={item.label}
            labelOnly
            className="workshop-workspace-icon-tooltip workshop-workspace-icon-tooltip--portaled workshop-workspace-icon-tooltip--label-only"
            style={{
              left: tooltipPoint.left,
              top: tooltipPoint.top,
            }}
          />,
          document.body,
        )
      : null;

  const hoverHandlers = usePortaledTooltip
    ? {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      }
    : undefined;

  const iconContent = usePortaledTooltip ? (
    <WorkshopWorkspaceIconGlyph icon={item.icon} />
  ) : (
    <WorkshopWorkspaceIconContent item={item} />
  );

  if (href) {
    return (
      <>
        <Link
          ref={triggerRef as RefObject<HTMLAnchorElement>}
          href={href}
          className={className}
          aria-label={ariaLabel}
          aria-current={active ? "page" : undefined}
          {...hoverHandlers}
        >
          {iconContent}
        </Link>
        {portaledTooltip}
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef as RefObject<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
        {...hoverHandlers}
      >
        {iconContent}
      </button>
      {portaledTooltip}
    </>
  );
}
