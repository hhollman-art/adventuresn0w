"use client";

import type { ReactNode } from "react";
import { ToolButton, ToggleChip } from "@/features/ui/ToggleButton";
import type { TabletopSession } from "@/lib/tabletop/types";

export type VttSidePanel = "party" | "tokens" | "initiative" | "dice" | "map";

type VttControlSidebarProps = {
  session: TabletopSession;
  tool: "select" | "reveal" | "hide";
  onToolChange: (tool: "select" | "reveal" | "hide") => void;
  brushRadius: number;
  onBrushRadiusChange: (radius: number) => void;
  panel: VttSidePanel;
  onPanelChange: (panel: VttSidePanel) => void;
  onFogEnabledChange: (enabled: boolean) => void;
  onGridVisibleChange: (visible: boolean) => void;
  onGridSnapChange: (snap: boolean) => void;
  activeCombatant: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenPlayerView: () => void;
  onClearTable: () => void;
  children: ReactNode;
};

const PANEL_TABS: [VttSidePanel, string, string][] = [
  ["party", "Party", "Party roster and character sheets"],
  ["tokens", "Tokens", "Place and edit tokens on the map"],
  ["initiative", "Init.", "Initiative order and rounds"],
  ["dice", "Dice", "Roll dice and view the log"],
  ["map", "Map", "Upload map art and grid settings"],
];

/** VTT tools + panel tabs — lives in the left column so the map can fill the screen. */
export default function VttControlSidebar({
  session,
  tool,
  onToolChange,
  brushRadius,
  onBrushRadiusChange,
  panel,
  onPanelChange,
  onFogEnabledChange,
  onGridVisibleChange,
  onGridSnapChange,
  activeCombatant,
  isFullscreen,
  onToggleFullscreen,
  onOpenPlayerView,
  onClearTable,
  children,
}: VttControlSidebarProps) {
  return (
    <aside className="vtt-control-sidebar fantasy-panel no-print shrink-0">
      <header className="vtt-control-sidebar-header">
        <h1 className="vtt-control-sidebar-title font-display">Virtual Table</h1>
        <span className="zone-badge" title="Dungeon Master screen — players use the separate player view">
          DM view
        </span>
      </header>

      <section className="vtt-control-sidebar-tools" aria-label="Map tools">
        <p className="vtt-control-sidebar-section-label">Map tools</p>
        <div className="vtt-control-sidebar-tool-grid">
          <ToolButton
            label="Move"
            active={tool === "select"}
            onClick={() => onToolChange("select")}
            title="Drag tokens, drag empty ground to pan, scroll to zoom"
          />
          <ToolButton
            label="Reveal fog"
            active={tool === "reveal"}
            onClick={() => onToolChange("reveal")}
            title="Paint fog away for the players"
          />
          <ToolButton
            label="Hide fog"
            active={tool === "hide"}
            onClick={() => onToolChange("hide")}
            title="Paint fog back over the map"
          />
        </div>

        {(tool === "reveal" || tool === "hide") && (
          <label className="vtt-control-sidebar-brush flex flex-col gap-1 text-xs text-[var(--muted)]">
            Brush size
            <select
              value={brushRadius}
              onChange={(e) => onBrushRadiusChange(Number(e.target.value))}
              className="btn btn-sm w-full"
              style={{ padding: "0.35rem 0.5rem" }}
            >
              <option value={0}>1 cell</option>
              <option value={1}>3&times;3</option>
              <option value={2}>5&times;5</option>
              <option value={3}>7&times;7</option>
            </select>
          </label>
        )}

        <div className="vtt-control-sidebar-toggle-grid">
          <ToggleChip
            label="Fog"
            checked={session.fog.enabled}
            onChange={onFogEnabledChange}
            title="Fog of war — covers the map so players only see what you reveal"
          />
          <ToggleChip
            label="Grid"
            checked={session.grid.visible}
            onChange={onGridVisibleChange}
            title="Show or hide the battle grid squares"
          />
          <ToggleChip
            label="Snap"
            checked={session.grid.snap}
            onChange={onGridSnapChange}
            title="Tokens click into grid squares when you drop them"
          />
        </div>

        <button
          type="button"
          onClick={onClearTable}
          className="btn btn-sm w-full"
          style={{ color: "#b91c1c", borderColor: "rgba(248,113,113,0.45)" }}
          title="Start with a blank table — removes tokens, party, map, fog, initiative, and dice log"
        >
          Clear table
        </button>
      </section>

      <div className="panel-tabs vtt-control-sidebar-tabs" role="tablist" aria-label="Virtual Table panels">
        {PANEL_TABS.map(([id, label, title]) => (
          <button
            key={id}
            type="button"
            role="tab"
            title={title}
            onClick={() => onPanelChange(id)}
            className={`panel-tab${panel === id ? " panel-tab-active" : ""}`}
            aria-selected={panel === id}
          >
            <span className="panel-tab-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="vtt-control-sidebar-body panel-scroll">{children}</div>

      <footer className="vtt-control-sidebar-footer">
        {activeCombatant ? (
          <span
            className="zone-badge w-full justify-center"
            style={{ textTransform: "none", letterSpacing: "0.02em" }}
          >
            {activeCombatant}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="btn btn-sm w-full"
          title={isFullscreen ? "Leave full screen" : "Fill the whole screen for play"}
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
        <button type="button" onClick={onOpenPlayerView} className="btn btn-sm btn-accent w-full">
          Open player view &#8599;
        </button>
      </footer>
    </aside>
  );
}
