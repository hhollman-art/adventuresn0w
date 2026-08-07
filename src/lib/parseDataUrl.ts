/**
 * RFC 2397 data-URL parsing — tolerant of modern MIME types (`image/svg+xml`)
 * and optional parameters (`charset=utf-8`, `name=foo.png`) before `;base64,`.
 */

export type ParsedDataUrl = {
  /** Full media type without parameters, e.g. `image/svg+xml`. */
  mediaType: string;
  /** True when the payload is base64-encoded (vs URL-encoded). */
  isBase64: boolean;
  /** Raw payload after the comma (base64 string or percent-encoded data). */
  data: string;
};

/**
 * Parse a `data:` URL into media type + payload.
 * Returns null when the string is not a well-formed data URL.
 */
export function parseDataUrl(input: string): ParsedDataUrl | null {
  const raw = input.trim();
  if (!raw.toLowerCase().startsWith("data:")) return null;

  const comma = raw.indexOf(",");
  if (comma < 0) return null;

  const meta = raw.slice(5, comma); // after "data:"
  const data = raw.slice(comma + 1);
  if (!data) return null;

  const parts = meta.split(";").map((p) => p.trim()).filter(Boolean);
  let mediaType = "text/plain";
  let isBase64 = false;

  if (parts.length === 0) {
    // `data:,payload` — defaults per RFC 2397
  } else {
    const first = parts[0]!;
    // First token is the media type unless it is only `base64` or a parameter (`key=value`).
    if (first.toLowerCase() === "base64") {
      isBase64 = true;
    } else if (first.includes("=")) {
      // Unusual but legal: `data:;charset=utf-8;base64,...`
      mediaType = "text/plain";
      for (const part of parts) {
        if (part.toLowerCase() === "base64") isBase64 = true;
      }
    } else {
      mediaType = first.toLowerCase();
      for (let i = 1; i < parts.length; i++) {
        if (parts[i]!.toLowerCase() === "base64") isBase64 = true;
      }
    }
  }

  // Catch `base64` when media type was empty / default path with only params.
  if (!isBase64) {
    isBase64 = parts.some((p) => p.toLowerCase() === "base64");
  }

  return { mediaType, isBase64, data };
}

/** Anthropic Messages API vision-supported image media types. */
export const ANTHROPIC_VISION_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export type AnthropicVisionMediaType = (typeof ANTHROPIC_VISION_MEDIA_TYPES)[number];

export function isAnthropicVisionMediaType(
  mediaType: string,
): mediaType is AnthropicVisionMediaType {
  return (ANTHROPIC_VISION_MEDIA_TYPES as readonly string[]).includes(mediaType);
}

/**
 * Parse an image data URL for Anthropic vision.
 * Requires `image/*` media type, base64 encoding, and a supported subtype.
 */
export function parseImageDataUrlForVision(
  input: string,
): { mediaType: AnthropicVisionMediaType; data: string } | { error: string } {
  const parsed = parseDataUrl(input);
  if (!parsed) {
    return { error: "imageDataUrl must be a data:image/...;base64,... URL." };
  }
  if (!parsed.mediaType.startsWith("image/")) {
    return { error: "imageDataUrl must use an image/* media type." };
  }
  if (!parsed.isBase64) {
    return { error: "imageDataUrl must use base64 encoding (;base64,)." };
  }
  if (!isAnthropicVisionMediaType(parsed.mediaType)) {
    return {
      error: `Unsupported image type “${parsed.mediaType}”. Use PNG, JPEG, GIF, or WebP.`,
    };
  }
  return { mediaType: parsed.mediaType, data: parsed.data };
}
