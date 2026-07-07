"use client";

import type { ReactElement } from "react";
import FantasyTooltip from "./FantasyTooltip";

type FantasyTooltipWrapProps = {
  /** Primary tooltip title — usually matches the control label. */
  label: string;
  /** Plain-language explanation shown under the label. */
  hint?: string;
  /** Optional advanced DM guidance. */
  dmTip?: string;
  children: ReactElement;
  /** Stretch wrapper for full-width buttons in flex/grid layouts. */
  block?: boolean;
  /** Drop tooltip below the trigger (for top-edge controls). */
  placement?: "above" | "below";
  className?: string;
};

/**
 * Hover/focus tooltip wrapper using the same {@link FantasyTooltip} markup and CSS
 * as workspace icon controls — keeps DMMS tooltip styling consistent app-wide.
 */
export default function FantasyTooltipWrap({
  label,
  hint,
  dmTip,
  children,
  block = false,
  placement = "above",
  className = "",
}: FantasyTooltipWrapProps) {
  const labelOnly = !hint && !dmTip;
  const tooltipClass = [
    "workshop-workspace-icon-tooltip",
    "fantasy-tooltip-wrap__tooltip",
    placement === "below" ? "workshop-workspace-icon-tooltip--below" : "",
    labelOnly ? "workshop-workspace-icon-tooltip--label-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={`fantasy-tooltip-wrap${block ? " fantasy-tooltip-wrap--block" : ""} ${className}`.trim()}
    >
      {children}
      <FantasyTooltip
        label={label}
        hint={hint}
        dmTip={dmTip}
        labelOnly={labelOnly}
        className={tooltipClass}
      />
    </span>
  );
}
