import type { CSSProperties } from "react";

type FantasyTooltipProps = {
  label: string;
  hint?: string;
  dmTip?: string;
  /** Show workspace name only — for the workspace icon tab bar. */
  labelOnly?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Parchment-styled rich tooltip — label, plain hint, optional DM tip. */
export default function FantasyTooltip({
  label,
  hint,
  dmTip,
  labelOnly = false,
  className = "",
  style,
}: FantasyTooltipProps) {
  return (
    <span
      className={`fantasy-tooltip ${className}`.trim()}
      role="tooltip"
      style={style}
    >
      <span className="workshop-workspace-icon-tooltip-label">{label}</span>
      {!labelOnly && hint ? (
        <span className="workshop-workspace-icon-tooltip-hint">{hint}</span>
      ) : null}
      {!labelOnly && dmTip ? (
        <span className="fantasy-tooltip-dm-tip">
          <strong>DM tip:</strong> {dmTip}
        </span>
      ) : null}
    </span>
  );
}
