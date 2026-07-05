import { NextResponse } from "next/server";
import {
  buildRealmUserMessage,
  parseRealmSize,
  REALM_SYSTEM_PROMPT,
  type RealmInput,
} from "@/lib/realmPrompt";
import {
  formatAnthropicError,
  generateMarkdown,
} from "@/lib/anthropicGenerate";
import { createMarkdownSseResponse } from "@/lib/sseStream";
import { parseRealmSeedMarkdown } from "@/lib/requestLimits";
import { realmPostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError } from "@/lib/serverLog";
import { recordTextGenerationUsage } from "@/lib/usageMetering";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY in environment." },
      { status: 500 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const parsed = realmPostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const realmSeedMarkdown = parseRealmSeedMarkdown(body.realmSeedMarkdown);

  const input: RealmInput = {
    realmSize: parseRealmSize(body.realmSize),
    titleHint: String(body.titleHint ?? "").trim(),
    description: String(body.description ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
    ...(realmSeedMarkdown ? { realmSeedMarkdown } : {}),
  };

  if (!input.description) {
    return badRequest("Describe what you want in the realm (description is required).");
  }

  try {
    const user = buildRealmUserMessage(input);
    if (!body.stream) {
      const { markdown, model, usage } = await generateMarkdown({
        apiKey,
        system: REALM_SYSTEM_PROMPT,
        user,
      });
      recordTextGenerationUsage({ feature: "realm", model, ...usage });
      return NextResponse.json({ markdown, model });
    }

    return createMarkdownSseResponse({
      apiKey,
      system: REALM_SYSTEM_PROMPT,
      user,
      feature: "realm",
      logTag: "realm_stream_failed",
    });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("realm_generate_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
