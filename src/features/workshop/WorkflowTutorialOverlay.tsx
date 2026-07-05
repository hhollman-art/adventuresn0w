"use client";

import Link from "next/link";
import {
  findWorkflowTutorial,
  WORKFLOW_TUTORIALS,
  type WorkflowStep,
  type WorkflowStepAction,
  type WorkflowTutorial,
} from "@/lib/workshop/workflowTutorials";

export type TutorialNavigateHandlers = {
  onSelectMode: (
    mode: "realm" | "adventure" | "characters" | "maps" | "props" | "library",
  ) => void;
  onLibraryCategory: (
    category: "all" | "seeds" | "results" | "parties",
  ) => void;
  onOpenSrdBrowser: () => void;
  onOpenSeedEditor: () => void;
};

type WorkflowTutorialPickerProps = {
  onStart: (workflowId: string) => void;
  onClose: () => void;
};

export function WorkflowTutorialPicker({ onStart, onClose }: WorkflowTutorialPickerProps) {
  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-picker-title"
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-lg"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <h2
            id="workflow-picker-title"
            className="font-display text-lg font-bold text-[var(--text)]"
          >
            Workflow guides
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick a prep path — step-by-step pop-ups will walk you through the Workshop. Every guide
            includes manual (no-AI) options.
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          {WORKFLOW_TUTORIALS.map((workflow) => (
            <li key={workflow.id} className="mb-2 last:mb-0">
              <button
                type="button"
                onClick={() => onStart(workflow.id)}
                className="tutorial-workflow-card w-full rounded-lg border p-4 text-left transition hover:border-[var(--accent-dim)]"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold text-[var(--text)]">
                    {workflow.title}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {workflow.aiLabel}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">{workflow.estimatedTime}</span>
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{workflow.subtitle}</span>
                <span className="mt-2 block text-xs font-semibold text-[var(--accent)]">
                  {workflow.steps.length} steps →
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div
          className="flex justify-end border-t px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <button type="button" onClick={onClose} className="btn btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function runStepAction(action: WorkflowStepAction, handlers: TutorialNavigateHandlers) {
  switch (action.type) {
    case "mode":
      handlers.onSelectMode(action.mode);
      break;
    case "library-category":
      handlers.onSelectMode("library");
      handlers.onLibraryCategory(action.category);
      break;
    case "library-srd":
      handlers.onSelectMode("library");
      handlers.onOpenSrdBrowser();
      break;
    case "open-seed-editor":
      handlers.onSelectMode("library");
      handlers.onOpenSeedEditor();
      break;
    case "link":
      window.location.href = action.href;
      break;
  }
}

function WorkflowStepModal({
  workflow,
  step,
  stepIndex,
  totalSteps,
  handlers,
  onBack,
  onNext,
  onClose,
  isLast,
}: {
  workflow: WorkflowTutorial;
  step: WorkflowStep;
  stepIndex: number;
  totalSteps: number;
  handlers: TutorialNavigateHandlers;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  isLast: boolean;
}) {
  const action = step.action;

  return (
    <div
      className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-step-title"
    >
      <div
        className="tutorial-step-panel w-full max-w-lg rounded-xl border p-5 shadow-xl sm:p-6"
        style={{ background: "var(--surface)", borderColor: "var(--accent-dim)" }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
            {workflow.title} · Step {stepIndex + 1} of {totalSteps}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-[var(--muted)] underline hover:text-[var(--text)]"
          >
            Exit guide
          </button>
        </div>
        <div
          className="mb-4 h-1.5 overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((stepIndex + 1) / totalSteps) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <h2 id="workflow-step-title" className="font-display text-xl font-bold text-[var(--text)]">
          {step.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text)]/90">{step.body}</p>
        {step.tip ? (
          <p
            className="mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed"
            style={{
              borderColor: "var(--accent-dim)",
              background: "rgba(201,162,39,0.1)",
              color: "var(--text)",
            }}
          >
            <strong>Tip:</strong> {step.tip}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {stepIndex > 0 ? (
            <button type="button" onClick={onBack} className="btn btn-sm">
              Back
            </button>
          ) : null}
          {action?.type === "link" ? (
            <Link
              href={action.href}
              className="btn btn-sm btn-accent"
              onClick={() => {
                onClose();
              }}
            >
              {step.actionLabel ?? "Go there"}
            </Link>
          ) : action ? (
            <button
              type="button"
              className="btn btn-sm btn-accent"
              onClick={() => {
                runStepAction(action, handlers);
                onNext();
              }}
            >
              {step.actionLabel ?? "Go there"}
            </button>
          ) : null}
          <button type="button" onClick={onNext} className="btn btn-sm btn-primary">
            {isLast ? "Finish" : action ? "Next" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

type WorkflowTutorialOverlayProps = {
  workflowId: string | null;
  stepIndex: number;
  showPicker: boolean;
  handlers: TutorialNavigateHandlers;
  onWorkflowChange: (id: string | null) => void;
  onStepChange: (index: number) => void;
  onShowPickerChange: (open: boolean) => void;
};

export default function WorkflowTutorialOverlay({
  workflowId,
  stepIndex,
  showPicker,
  handlers,
  onWorkflowChange,
  onStepChange,
  onShowPickerChange,
}: WorkflowTutorialOverlayProps) {
  const workflow = workflowId ? findWorkflowTutorial(workflowId) : undefined;

  const closeAll = () => {
    onWorkflowChange(null);
    onStepChange(0);
    onShowPickerChange(false);
  };

  if (showPicker) {
    return (
      <WorkflowTutorialPicker
        onStart={(id) => {
          onWorkflowChange(id);
          onStepChange(0);
          onShowPickerChange(false);
        }}
        onClose={() => onShowPickerChange(false)}
      />
    );
  }

  if (!workflow) return null;

  const step = workflow.steps[stepIndex];
  if (!step) {
    closeAll();
    return null;
  }

  const isLast = stepIndex >= workflow.steps.length - 1;

  return (
    <WorkflowStepModal
      workflow={workflow}
      step={step}
      stepIndex={stepIndex}
      totalSteps={workflow.steps.length}
      handlers={handlers}
      isLast={isLast}
      onBack={() => onStepChange(Math.max(0, stepIndex - 1))}
      onNext={() => {
        if (isLast) closeAll();
        else onStepChange(stepIndex + 1);
      }}
      onClose={closeAll}
    />
  );
}
