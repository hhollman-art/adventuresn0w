import { describe, expect, it } from "vitest";
import { formatSseFrame } from "./sseStream";

describe("formatSseFrame", () => {
  it("emits named event + JSON data lines", () => {
    expect(formatSseFrame("message", { type: "chunk", text: "Hi" })).toBe(
      'event: message\ndata: {"type":"chunk","text":"Hi"}\n\n',
    );
  });

  it("formats error frames for client disconnect paths", () => {
    const frame = formatSseFrame("error", { type: "error", error: "boom" });
    expect(frame.startsWith("event: error\n")).toBe(true);
    expect(frame).toContain('"error":"boom"');
    expect(frame.endsWith("\n\n")).toBe(true);
  });

  it("formats done frames", () => {
    const frame = formatSseFrame("done", {
      type: "done",
      markdown: "# Title",
      model: "test",
    });
    expect(frame.startsWith("event: done\n")).toBe(true);
    expect(frame).toContain('"markdown":"# Title"');
  });
});
