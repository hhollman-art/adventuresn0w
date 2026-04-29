import { describe, expect, it } from "vitest";
import { fixLibraryItem, type LibraryItem } from "@/lib/generationLibrary";

describe("fixLibraryItem", () => {
  it("accepts a valid row", () => {
    const row = {
      id: "1",
      createdAt: "2020-01-01",
      kind: "maps",
      title: "T",
      markdown: "",
      textModel: null,
      imageModel: null,
      images: [{ kind: "battle", imageDataUrl: "data:image/png;base64,xx" }],
    };
    const item = fixLibraryItem(row);
    expect(item).toMatchObject({ id: "1", kind: "maps" } satisfies Partial<LibraryItem>);
  });

  it("rejects bad kind", () => {
    expect(fixLibraryItem({ ...minimal(), kind: "nope" })).toBeNull();
  });
});

function minimal(): Record<string, unknown> {
  return {
    id: "1",
    createdAt: "x",
    kind: "maps",
    title: "t",
    markdown: "",
    textModel: null,
    imageModel: null,
    images: [],
  };
}
