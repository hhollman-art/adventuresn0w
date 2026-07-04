import { describe, expect, it } from "vitest";
import {
  findWorkflowTutorial,
  isWorkflowTutorialId,
  WORKFLOW_TUTORIALS,
} from "@/lib/workshop/workflowTutorials";

describe("workflowTutorials", () => {
  it("defines six unique workflow guides", () => {
    expect(WORKFLOW_TUTORIALS).toHaveLength(6);
    const ids = WORKFLOW_TUTORIALS.map((w) => w.id);
    expect(new Set(ids).size).toBe(6);
  });

  it("includes the owned-books legal workflow", () => {
    const ownedBooks = findWorkflowTutorial("owned-books");
    expect(ownedBooks?.title).toMatch(/books you own/i);
    expect(
      ownedBooks?.steps.some((s) => s.action?.type === "link" && s.action.href === "/legal"),
    ).toBe(true);
  });

  it("each workflow has at least four steps with titles", () => {
    for (const workflow of WORKFLOW_TUTORIALS) {
      expect(workflow.steps.length).toBeGreaterThanOrEqual(4);
      expect(workflow.steps.every((s) => s.title.trim() && s.body.trim())).toBe(true);
    }
  });

  it("finds workflows by id", () => {
    expect(findWorkflowTutorial("one-nighter-manual")?.title).toMatch(/One-nighter/i);
    expect(isWorkflowTutorialId("mini-arc")).toBe(true);
    expect(isWorkflowTutorialId("nope")).toBe(false);
  });
});
