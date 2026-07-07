"use client";

import FantasyTooltipWrap from "@/features/ui/FantasyTooltipWrap";

type ToolButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
};

export function ToolButton({ label, active, onClick, title }: ToolButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-sm${active ? " btn-tool-active" : ""}`}
      aria-pressed={active}
      aria-label={title ?? label}
    >
      {label}
    </button>
  );

  if (!title) return button;

  return (
    <FantasyTooltipWrap label={label} hint={title} block>
      {button}
    </FantasyTooltipWrap>
  );
}

type ToggleChipProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Plain-language hover explanation of what the toggle controls. */
  title?: string;
};

export function ToggleChip({ label, checked, onChange, title }: ToggleChipProps) {
  const button = (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`btn btn-sm${checked ? " btn-tool-active" : ""}`}
      aria-pressed={checked}
      aria-label={title ? `${label}: ${title}` : label}
    >
      {label} {checked ? "on" : "off"}
    </button>
  );

  if (!title) return button;

  return (
    <FantasyTooltipWrap label={label} hint={title} block>
      {button}
    </FantasyTooltipWrap>
  );
}
