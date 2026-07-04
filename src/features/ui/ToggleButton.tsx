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
};

export function ToggleChip({ label, checked, onChange }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`btn btn-sm${checked ? " btn-tool-active" : ""}`}
      aria-pressed={checked}
    >
      {label} {checked ? "on" : "off"}
    </button>
  );
}
