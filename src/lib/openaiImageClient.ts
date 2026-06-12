import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";
import { logApiWarning } from "@/lib/serverLog";

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageQuality = "medium" | "high";

export type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

/** Avoid oversized prompts that can destabilize gpt-image models. */
const MAX_IMAGE_PROMPT_CHARS = 10_000;

export function parseImageSize(value: unknown, fallback: ImageSize = "1536x1024"): ImageSize {
  const raw = String(value ?? "").trim();
  if (raw === "1536x1024" || raw === "1024x1536" || raw === "1024x1024") {
    return raw as ImageSize;
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

function isGptImageModel(model: string): boolean {
  return /^gpt-image-/i.test(model.trim());
}

/** gpt-image-* supports moderation: auto | low (less input filtering). */
function moderationForGptImageModel(model: string): "low" | "auto" | undefined {
  if (!isGptImageModel(model)) return undefined;
  const raw = process.env.OPENAI_IMAGE_MODERATION?.trim().toLowerCase();
  if (raw === "auto") return "auto";
  return "low";
}

function clampPrompt(prompt: string): string {
  const p = prompt.replace(/\s+/g, " ").trim();
  if (p.length <= MAX_IMAGE_PROMPT_CHARS) return p;
  logApiWarning("openai_image_prompt_clamped", {
    before: String(p.length),
    after: String(MAX_IMAGE_PROMPT_CHARS),
  });
  return `${p.slice(0, Math.max(0, MAX_IMAGE_PROMPT_CHARS - 1)).trimEnd()}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readImageApiPayload(response: Response): Promise<OpenAIImageResponse> {
  const text = await response.text();
  if (!text.trim()) {
    return { error: { message: `Empty body (HTTP ${response.status})` } };
  }
  try {
    return JSON.parse(text) as OpenAIImageResponse;
  } catch {
    return {
      error: { message: `Invalid JSON from image API (HTTP ${response.status}): ${text.slice(0, 200)}` },
    };
  }
}

function isRetryableOpenAiImageFailure(
  status: number,
  payload: OpenAIImageResponse,
): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 529)
    return true;
  const msg = payload.error?.message?.toLowerCase() ?? "";
  if (msg.includes("server had an error")) return true;
  if (msg.includes("the server is busy")) return true;
  if (msg.includes("timeout")) return true;
  if (msg.includes("overloaded")) return true;
  if (msg.includes("try again")) return true;
  return false;
}

function buildGenerationJsonBody(params: {
  model: string;
  prompt: string;
  size: ImageSize;
  quality: ImageQuality;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    size: params.size,
    quality: params.quality,
    n: 1,
  };
  const mod = moderationForGptImageModel(params.model);
  if (mod) body.moderation = mod;
  return body;
}

/**
 * Calls OpenAI Images API; returns base64 PNG or structured failure for route handlers.
 * Retries transient OpenAI failures and may downgrade quality high→medium on the last attempt.
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
  const prompt = clampPrompt(params.prompt);
  let quality = params.quality;
  const maxAttempts = 3;
  let lastResponse: Response | null = null;
  let lastPayload: OpenAIImageResponse | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(800 * attempt);
      logApiWarning("openai_image_retry", {
        attempt: String(attempt + 1),
        quality,
        status: lastResponse ? String(lastResponse.status) : "",
      });
    }
    if (attempt === maxAttempts - 1 && params.quality === "high" && quality === "high") {
      quality = "medium";
      logApiWarning("openai_image_quality_downgrade", { to: "medium" });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildGenerationJsonBody({
          model: params.model,
          prompt,
          size: params.size,
          quality,
        }),
      ),
    });

    const payload = await readImageApiPayload(response);
    lastResponse = response;
    lastPayload = payload;

    if (response.ok) {
      const b64 = payload.data?.[0]?.b64_json;
      if (b64) return { ok: true, b64 };
      return { ok: false, response, payload };
    }

    const retry = attempt < maxAttempts - 1 && isRetryableOpenAiImageFailure(response.status, payload);
    if (!retry) {
      return { ok: false, response, payload };
    }
  }

  return {
    ok: false,
    response: lastResponse ?? new Response(null, { status: 502 }),
    payload: lastPayload ?? { error: { message: "Image generation failed after retries." } },
  };
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
