"use client";

import { WORKFLOW_TUTORIALS } from "@/lib/workshop/workflowTutorials";

type WorkflowGuideListProps = {
  onSelect: (workflowId: string) => void;
  /** Tighter cards for the welcome hearth panel. */
  compact?: boolean;
};

export default function WorkflowGuideList({ onSelect, compact = false }: WorkflowGuideListProps) {
  return (
    <ul className={`workshop-workflow-list${compact ? " workshop-workflow-list--compact" : ""}`}>
      {WORKFLOW_TUTORIALS.map((workflow) => (
        <li key={workflow.id}>
          <button
            type="button"
            onClick={() => onSelect(workflow.id)}
            className="tutorial-workflow-card workshop-workflow-card w-full rounded-lg border p-3 text-left transition sm:p-4"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-[var(--text)] sm:text-base">
                {workflow.title}
              </span>
              <span className="workflow-badge">{workflow.aiLabel}</span>
              <span className="text-[10px] text-[var(--muted)]">{workflow.estimatedTime}</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
              {workflow.subtitle}
            </span>
            <span className="mt-2 block text-[11px] font-semibold text-[var(--accent)]">
              {workflow.steps.length} steps — start guide
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
