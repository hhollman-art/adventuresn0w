import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-sonnet-4-6";

export const FALLBACK_MODELS = [
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-1",
  "claude-opus-4-1-20250805",
  "claude-opus-4-6",
];

export type GenerateMarkdownParams = {
  apiKey: string;
  system: string;
  user: string;
};

export async function generateMarkdown({
  apiKey,
  system,
  user,
}: GenerateMarkdownParams): Promise<{ markdown: string; model: string }> {
  const preferredModel = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const modelsToTry = [
    preferredModel,
    ...FALLBACK_MODELS.filter((name) => name !== preferredModel),
  ];
  let selectedModel = preferredModel;
  let message: Awaited<ReturnType<typeof client.messages.create>> | null = null;
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      message = await client.messages.create({
        model,
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: user }],
      });
      selectedModel = model;
      break;
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      const notFound =
        text.includes('"type":"not_found_error"') || text.includes("not_found_error");
      if (!notFound) {
        throw err;
      }
      lastError = err;
    }
  }

  if (!message) {
    throw lastError ?? new Error("No available Claude model found for this account.");
  }

  const markdown = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  if (!markdown) {
    throw new Error("Model returned no text content.");
  }

  return { markdown, model: selectedModel };
}

export function formatAnthropicError(err: unknown): { message: string; status: number } {
  const message = err instanceof Error ? err.message : "Unknown error";
  const notFound =
    message.includes('"type":"not_found_error"') || message.includes("not_found_error");
  if (notFound) {
    return {
      message:
        "Claude model not found. Set ANTHROPIC_MODEL in .env to a model your account can access (for example: claude-sonnet-4-6).",
      status: 502,
    };
  }
  return { message, status: 502 };
}
