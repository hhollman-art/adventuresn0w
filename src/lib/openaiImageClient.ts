import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQuality = "medium" | "high";

export type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

export function parseImageSize(value: unknown, fallback: ImageSize = "1536x1024"): ImageSize {
  const raw = String(value ?? "").trim();
  if (raw === "1536x1024" || raw === "1024x1536" || raw === "1024x1024") {
    return raw;
  }
  return fallback;
}

export function parseImageQuality(value: unknown): ImageQuality {
  const raw = String(value ?? "").trim();
  return raw === "medium" ? "medium" : "high";
}

export function defaultOpenAIImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

/**
 * Calls OpenAI Images API; returns base64 PNG or structured failure for route handlers.
 */
export async function requestOpenAIImagePng(params: {
  apiKey: string;
  model: string;
  prompt: string;
  size: ImageSize;
  quality: ImageQuality;
}): Promise<
  | { ok: true; b64: string }
  | { ok: false; response: Response; payload: OpenAIImageResponse }
> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      quality: params.quality,
    }),
  });
  const payload = (await response.json()) as OpenAIImageResponse;
  if (!response.ok) {
    return { ok: false, response, payload };
  }
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) {
    return { ok: false, response, payload };
  }
  return { ok: true, b64 };
}

export function openAIImageErrorNextResponse(
  response: Response,
  payload: OpenAIImageResponse,
) {
  const parsed = parseOpenAIImageApiFailure(response, payload);
  return {
    status: 502 as const,
    body: {
      error: formatImageApiErrorForClient(parsed),
      requestId: parsed.requestId,
    },
  };
}
