import { describe, expect, it } from "vitest";
import {
  fixLibraryItem,
  flattenLibraryImages,
  type LibraryItem,
} from "@/lib/generationLibrary";

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

describe("flattenLibraryImages", () => {
  it("keeps data URLs and builds stable ids", () => {
    const items: LibraryItem[] = [
      {
        id: "abc",
        createdAt: "2020-01-01",
        kind: "maps",
        title: "Dungeon",
        markdown: "",
        textModel: null,
        imageModel: null,
        images: [
          { kind: "battle", label: "Room A", imageDataUrl: "data:image/png;base64,aa" },
          { kind: "locale", imageDataUrl: "https://example.com/x.png" },
        ],
      },
    ];
    expect(flattenLibraryImages(items)).toEqual([
      {
        id: "abc-0",
        label: "Room A",
        dataUrl: "data:image/png;base64,aa",
      },
    ]);
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
