"use client";

type ToolButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
};

export function ToolButton({ label, active, onClick, title }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`btn btn-sm${active ? " btn-tool-active" : ""}`}
      aria-pressed={active}
    >
      {label}
    </button>
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
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={title}
      className={`btn btn-sm${checked ? " btn-tool-active" : ""}`}
      aria-pressed={checked}
    >
      {label} {checked ? "on" : "off"}
    </button>
  );
}
