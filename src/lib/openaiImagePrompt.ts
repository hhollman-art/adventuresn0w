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

/**
 * For map image prompts: favor hand-inked cartography on parchment/scroll, not illustrative or painterly art.
 */
export const MAP_CARTOGRAPHER_HAND_LOOK =
  "Look and media: the image must read as a cartographer’s hand-drawn map—quill or pen line on parchment, laid paper, or an unrolled scroll—not a poster, landscape painting, concept-art scene, or glossy illustration. " +
  "Favor iron-gall/ink line, controlled cross-hatch, stipple, and flat or nearly flat tone; avoid airbrush, cinematic lighting, 3D-render gloss, or thick painterly impasto. " +
  "It should feel as if the map were inked for use at a table: clear cartographic marks, not a picture you hang for mood. " +
  "Short inked or printed-style **labels** for important places belong on a working map—keep them few and legible, not a wall of text. " +
  "**Avoid redundant labeling:** name each place or feature **at most once** on the map; do not repeat the same name in multiple callouts, do not place the map title and an identical near-title label, and do not use two labels for the same landmark (e.g. full name + nickname pointing to the same spot).";

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
