/**
 * OpenAI image models apply a safety filter to prompts and outputs.
 * We prepend a clear content policy and clamp user-provided text to reduce
 * false rejections when adventure prose is pasted into map/prop prompts.
 */

export const IMAGE_PROMPT_SAFETY_PREAMBLE =
  "Policy-aligned output: stylized illustrated fantasy art for a tabletop roleplaying game " +
  "(painted / digital illustration, not photorealistic). " +
  "Show only environments, architecture, terrain, readable props, symbols, or abstract marks. " +
  "Do not depict graphic violence, gore, wounded or suffering people or animals, cruelty, " +
  "sexual content, hate symbols, or real-world identifiable people. ";

export function clampImagePromptText(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

type OpenAIErrorBody = {
  error?: { message?: string; code?: string; type?: string };
};

function extractRequestIdFromText(text: string): string | undefined {
  const m = text.match(/\breq_[a-zA-Z0-9]+\b/);
  return m?.[0];
}

export function parseOpenAIImageApiFailure(
  response: Response,
  payload: unknown,
): { message: string; requestId?: string; code?: string } {
  const headerRequestId =
    response.headers.get("x-request-id") ??
    response.headers.get("openai-request-id") ??
    undefined;

  const err =
    payload && typeof payload === "object"
      ? (payload as OpenAIErrorBody).error
      : undefined;

  const message =
    err?.message?.trim() ||
    `Image API request failed (${response.status})`;

  const fromBody = extractRequestIdFromText(message);

  return {
    message,
    requestId: headerRequestId ?? fromBody,
    code: err?.code,
  };
}

export function formatImageApiErrorForClient(parsed: {
  message: string;
  requestId?: string;
  code?: string;
}): string {
  let out = parsed.message;
  const lower = out.toLowerCase();
  if (lower.includes("safety") || lower.includes("content_policy") || parsed.code === "content_policy_violation") {
    out +=
      " Try shortening or softening scene text (less graphic violence or horror), then generate again.";
    out += " If you think this is a mistake, contact OpenAI at https://help.openai.com/ and include your request ID.";
  }
  if (parsed.requestId) {
    out += ` Request ID: ${parsed.requestId}`;
  }
  return out;
}
