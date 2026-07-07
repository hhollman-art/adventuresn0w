type FantasyTooltipProps = {
  label: string;
  hint: string;
  dmTip?: string;
  className?: string;
};

/** Parchment-styled rich tooltip — label, plain hint, optional DM tip. */
export default function FantasyTooltip({
  label,
  hint,
  dmTip,
  className = "",
}: FantasyTooltipProps) {
  return (
    <span className={`fantasy-tooltip ${className}`.trim()} role="tooltip">
      <span className="workshop-workspace-icon-tooltip-label">{label}</span>
      <span className="workshop-workspace-icon-tooltip-hint">{hint}</span>
      {dmTip ? (
        <span className="fantasy-tooltip-dm-tip">
          <strong>DM tip:</strong> {dmTip}
        </span>
      ) : null}
    </span>
  );
}
