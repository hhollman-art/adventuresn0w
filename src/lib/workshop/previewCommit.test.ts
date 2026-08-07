import { describe, expect, it } from "vitest";
import { libraryKindFromWorkspace, planPreviewCommit } from "./previewCommit";
import { buildDmmsCreationFileExport } from "./previewExport";

describe("planPreviewCommit", () => {
  it("hides commit while loading or recruiting heroes", () => {
    expect(
      planPreviewCommit({
        hasContent: true,
        loading: true,
        isSrdPreview: false,
        showHeroRecruit: false,
        isLibraryView: false,
        hasViewingResult: false,
        committedLibraryId: null,
      }).show,
    ).toBe(false);
    expect(
      planPreviewCommit({
        hasContent: true,
        loading: false,
        isSrdPreview: false,
        showHeroRecruit: true,
        isLibraryView: false,
        hasViewingResult: false,
        committedLibraryId: null,
      }).show,
    ).toBe(false);
  });

  it("offers Save to Library for a fresh forge result", () => {
    const plan = planPreviewCommit({
      hasContent: true,
      loading: false,
      isSrdPreview: false,
      showHeroRecruit: false,
      isLibraryView: false,
      hasViewingResult: false,
      committedLibraryId: null,
    });
    expect(plan.show).toBe(true);
    expect(plan.kind).toBe("save-library");
    expect(plan.label).toBe("Save to Library");
  });
});

describe("libraryKindFromWorkspace", () => {
  it("maps forge workspaces to library kinds", () => {
    expect(libraryKindFromWorkspace("adventure")).toBe("adventure");
    expect(libraryKindFromWorkspace("maps")).toBe("maps");
  });
});

describe("buildDmmsCreationFileExport", () => {
  it("builds a portable Creation File envelope", () => {
    const payload = buildDmmsCreationFileExport({
      markdown: "# Misty Vale\n\nA river shrine.",
      images: [],
      textModel: "test-model",
      imageModel: null,
      mode: "adventure",
      ciClass: "result.adventure",
    });
    expect(payload.format).toBe("ddeasy-creation-file");
    expect(payload.version).toBe(1);
    expect(payload.title).toBe("Misty Vale");
    expect(payload.ciClass).toBe("result.adventure");
  });
});
