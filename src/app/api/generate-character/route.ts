import { NextResponse } from "next/server";
import {
  CHARACTER_SYSTEM_PROMPT,
  buildSingleCharacterMessage,
} from "@/lib/characterPrompt";
import { formatAnthropicError, generateMarkdown } from "@/lib/anthropicGenerate";
import { characterSheetPostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError } from "@/lib/serverLog";
import { recordTextGenerationUsage } from "@/lib/usageMetering";

/**
 * AI assist for the character library editor: generates ONE character in the
 * portable character Markdown format. Fields the user set by hand arrive as
 * locks the model must reproduce; everything else is invented from the
 * flavor text.
 */
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

  const parsed = characterSheetPostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  try {
    const { markdown, model, usage } = await generateMarkdown({
      apiKey,
      system: CHARACTER_SYSTEM_PROMPT,
      user: buildSingleCharacterMessage({
        flavor: String(parsed.data.flavor ?? "").trim(),
        locks: parsed.data.locks ?? {},
      }),
    });
    recordTextGenerationUsage({ feature: "character-sheet", model, ...usage });
    return NextResponse.json({ markdown, model });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("character_sheet_generate_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
