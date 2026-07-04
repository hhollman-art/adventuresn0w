"use client";

import Link from "next/link";
import { WORKFLOW_TUTORIALS } from "@/lib/workshop/workflowTutorials";

export default function WorkflowTutorialLauncher() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {WORKFLOW_TUTORIALS.map((workflow) => (
        <Link
          key={workflow.id}
          href={`/?workflow=${workflow.id}`}
          className="tutorial-workflow-card rounded-lg border p-4 no-underline transition hover:border-[var(--accent-dim)]"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold text-[var(--text)]">{workflow.title}</span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {workflow.aiLabel}
            </span>
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">{workflow.subtitle}</span>
          <span className="mt-2 block text-xs font-semibold text-[var(--accent)]">
            Start {workflow.steps.length}-step guide →
          </span>
        </Link>
      ))}
    </div>
  );
}
