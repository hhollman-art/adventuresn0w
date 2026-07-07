"use client";

import Link from "next/link";
import {
  findVttGridPreset,
  MAX_VTT_GRID_SIDE,
  MIN_VTT_GRID_SIDE,
  VTT_GRID_PRESETS,
} from "@/lib/tabletop/gridPresets";
import type { GenerateMode, MapFormState, ProgressStage } from "./homeTypes";

export function AutoGenerateToggle({
  checked,
  onChange,
  icon,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition hover:border-[var(--accent)]"
      style={{
        borderColor: checked ? "var(--accent)" : "var(--border)",
        background: checked ? "rgba(201, 162, 39, 0.14)" : "rgba(201, 162, 39, 0.07)",
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        style={{
          background: "rgba(201, 162, 39, 0.28)",
        }}
        title="Auto-generate"
      >
        {icon}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-2.5 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0 flex-1 pt-2 font-medium text-[var(--text)]">
        {children}
      </span>
    </label>
  );
}

export function BattleMapGridFieldset({
  mapForm,
  compactLegend,
  embedded = false,
  onApplyPreset,
  onCustomSize,
}: {
  mapForm: MapFormState;
  compactLegend?: string;
  embedded?: boolean;
  onApplyPreset: (cols: number, rows: number) => void;
  onCustomSize: (cols: number, rows: number) => void;
}) {
  const presetMatch = findVttGridPreset(mapForm.battleGridCols, mapForm.battleGridRows);
  const legend = compactLegend ?? "VTT battle map grid";

  const body = (
    <>
      <p className="text-xs text-[var(--muted)]">
        {compactLegend
          ? "One battle map per scene uses these settings so art aligns on the VTT overlay grid."
          : (
            <>
              Battle maps are generated <strong className="font-medium text-[var(--text)]/90">without printed grid lines</strong>—load on{" "}
              <Link href="/table" className="text-[var(--accent)] underline-offset-2 hover:underline">
                /table
              </Link>{" "}
              and the Virtual Table draws the grid. Pick dimensions so the overlay aligns with the art.
            </>
          )}
      </p>

      <div>
        <p className="mb-1 text-xs font-medium text-[var(--text)]">VTT presets</p>
        <div className="flex flex-wrap gap-1">
          {VTT_GRID_PRESETS.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => onApplyPreset(g.cols, g.rows)}
              className="rounded border px-2 py-1 text-xs"
              style={{
                borderColor:
                  mapForm.battleGridCols === g.cols && mapForm.battleGridRows === g.rows
                    ? "var(--accent)"
                    : "var(--border)",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-[var(--text)]">Custom grid size</p>
        <p className="mb-1.5 text-[11px] text-[var(--muted)]">
          Columns × rows ({MIN_VTT_GRID_SIDE}–{MAX_VTT_GRID_SIDE} each). Values clamp on change.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--muted)]">Columns</span>
            <input
              type="number"
              min={MIN_VTT_GRID_SIDE}
              max={MAX_VTT_GRID_SIDE}
              value={mapForm.battleGridCols}
              onChange={(e) =>
                onCustomSize(Number(e.target.value), mapForm.battleGridRows)
              }
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-[var(--muted)]">Rows</span>
            <input
              type="number"
              min={MIN_VTT_GRID_SIDE}
              max={MAX_VTT_GRID_SIDE}
              value={mapForm.battleGridRows}
              onChange={(e) =>
                onCustomSize(mapForm.battleGridCols, Number(e.target.value))
              }
              className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>
        {!presetMatch ? (
          <p className="mt-1 text-[11px]" style={{ color: "var(--accent)" }}>
            Custom size: {mapForm.battleGridCols} × {mapForm.battleGridRows}
          </p>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--text)]">{legend}</p>
        {body}
      </div>
    );
  }

  return (
    <fieldset
      className="flex flex-col gap-2 rounded-lg border p-3 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <legend className="text-sm font-medium text-[var(--muted)]">{legend}</legend>
      {body}
    </fieldset>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProgressPanel({
  mode,
  stage,
  loading,
  imageLoading,
  autoMapEnabled,
  autoPropsEnabled,
}: {
  mode: GenerateMode;
  stage: ProgressStage;
  loading: boolean;
  imageLoading: boolean;
  autoMapEnabled: boolean;
  autoPropsEnabled: boolean;
}) {
  const items = getProgressItems(mode, stage, autoMapEnabled, autoPropsEnabled);
  if (items.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Progress
      </p>
      <div className="mt-2 grid gap-1">
        {items.map((item) => (
          <p
            key={item.label}
            className={
              item.state === "done"
                ? "text-xs font-medium text-emerald-700"
                : item.state === "active"
                  ? "text-xs text-[var(--text)]"
                  : "text-xs text-[var(--muted)]"
            }
          >
            {item.state === "done"
              ? "✓ Complete"
              : item.state === "active"
                ? "… In progress"
                : "○ Pending"}{" "}
            — {item.label}
          </p>
        ))}
      </div>
      {(loading || imageLoading) && stage !== "error" ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Working… this can take a minute.</p>
      ) : null}
    </div>
  );
}

function getProgressItems(
  mode: GenerateMode,
  stage: ProgressStage,
  autoMapEnabled: boolean,
  autoPropsEnabled: boolean,
): Array<{ label: string; state: "pending" | "active" | "done" }> {
  if (mode === "characters") {
    return [
      { label: "Generate heroes", state: stateFor(stage, "adventure_generating", "complete") },
    ];
  }

  if (mode === "maps") {
    return [
      { label: "Generate locale map image", state: stateFor(stage, "map_locale_generating", "map_done") },
      { label: "Generate battle map image", state: stateFor(stage, "map_battle_generating", "map_done") },
    ];
  }

  if (mode === "props") {
    return [
      {
        label: "Generate item handout image",
        state: stateFor(stage, "prop_generating", "complete"),
      },
    ];
  }

  if (mode === "realm") {
    return [
      {
        label: "Generate realm",
        state: stateFor(stage, "realm_generating", "complete"),
      },
    ];
  }

  const items: Array<{ label: string; state: "pending" | "active" | "done" }> = [
    { label: "Generate adventure text", state: stateFor(stage, "adventure_generating", "adventure_done") },
  ];

  if (autoMapEnabled) {
    items.push(
      { label: "Generate locale map image", state: stateFor(stage, "map_locale_generating", "map_done") },
      { label: "Generate battle map image", state: stateFor(stage, "map_battle_generating", "map_done") },
    );
  }
  if (autoPropsEnabled) {
    items.push({
      label: "Generate written item handout",
      state: stateFor(stage, "prop_generating", "complete"),
    });
  }

  return items;
}

function stateFor(
  stage: ProgressStage,
  activeStage: ProgressStage,
  doneStage: ProgressStage | "complete",
): "pending" | "active" | "done" {
  if (stage === activeStage) return "active";
  if (stage === doneStage || stage === "complete" || stage === "map_done") return "done";
  if (stage === "adventure_done" && activeStage === "adventure_generating") return "done";
  return "pending";
}
