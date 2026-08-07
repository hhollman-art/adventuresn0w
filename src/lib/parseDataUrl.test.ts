import { describe, expect, it } from "vitest";
import {
  parseDataUrl,
  parseImageDataUrlForVision,
} from "./parseDataUrl";

describe("parseDataUrl", () => {
  it("parses simple PNG data URLs", () => {
    const parsed = parseDataUrl("data:image/png;base64,iVBOR");
    expect(parsed).toEqual({
      mediaType: "image/png",
      isBase64: true,
      data: "iVBOR",
    });
  });

  it("parses image/svg+xml with + in the MIME subtype", () => {
    const parsed = parseDataUrl("data:image/svg+xml;base64,PHN2Zy");
    expect(parsed?.mediaType).toBe("image/svg+xml");
    expect(parsed?.isBase64).toBe(true);
    expect(parsed?.data).toBe("PHN2Zy");
  });

  it("tolerates charset and name parameters before base64", () => {
    const parsed = parseDataUrl(
      "data:image/png;charset=utf-8;name=map.v1.png;base64,abc+/=",
    );
    expect(parsed?.mediaType).toBe("image/png");
    expect(parsed?.isBase64).toBe(true);
    expect(parsed?.data).toBe("abc+/=");
  });

  it("parses jpeg with dotted vendor-ish type characters", () => {
    const parsed = parseDataUrl("data:image/jpeg;base64,/9j/");
    expect(parsed?.mediaType).toBe("image/jpeg");
    expect(parsed?.data).toBe("/9j/");
  });

  it("returns null for non-data URLs", () => {
    expect(parseDataUrl("https://example.com/x.png")).toBeNull();
    expect(parseDataUrl("data:image/png;base64")).toBeNull();
  });
});

describe("parseImageDataUrlForVision", () => {
  it("accepts Anthropic-supported types even with extra params", () => {
    const result = parseImageDataUrlForVision(
      "data:image/webp;name=token.webp;base64,UklGRg==",
    );
    expect(result).toEqual({ mediaType: "image/webp", data: "UklGRg==" });
  });

  it("rejects svg+xml for Anthropic vision with a clear error", () => {
    const result = parseImageDataUrlForVision("data:image/svg+xml;base64,PHN2Zy");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toMatch(/Unsupported image type/i);
    }
  });

  it("rejects non-base64 image payloads", () => {
    const result = parseImageDataUrlForVision("data:image/png,not-base64");
    expect("error" in result).toBe(true);
  });
});
