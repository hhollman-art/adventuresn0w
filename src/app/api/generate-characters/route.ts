import { NextResponse } from "next/server";
import {
  CHARACTER_SYSTEM_PROMPT,
  buildPremadeCharactersMessage,
  type PremadeCharacterInput,
} from "@/lib/characterPrompt";
import { formatAnthropicError, generateMarkdown } from "@/lib/anthropicGenerate";
import { charactersPostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError } from "@/lib/serverLog";
import { recordTextGenerationUsage } from "@/lib/usageMetering";
import { parseRealmSeedMarkdown } from "@/lib/requestLimits";

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

  const parsed = charactersPostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const sourceSeedMarkdown = parseRealmSeedMarkdown(body.sourceSeedMarkdown);

  const input: PremadeCharacterInput = {
    partyConcept: String(body.partyConcept ?? "").trim(),
    levelRange: String(body.levelRange ?? "3").trim(),
    tone: String(body.tone ?? "heroic fantasy").trim(),
    setting: String(body.setting ?? "").trim(),
    characterCount: String(body.characterCount ?? "4").trim() || "4",
    extraNotes: String(body.extraNotes ?? "").trim(),
    characterSpecs: body.characterSpecs?.map((s) => ({
      className: s.className?.trim() || undefined,
      race: s.race?.trim() || undefined,
    })),
    ...(sourceSeedMarkdown ? { sourceSeedMarkdown } : {}),
  };

  try {
    const { markdown, model, usage } = await generateMarkdown({
      apiKey,
      system: CHARACTER_SYSTEM_PROMPT,
      user: buildPremadeCharactersMessage(input),
    });
    recordTextGenerationUsage({ feature: "characters", model, ...usage });
    return NextResponse.json({ markdown, model });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("characters_generate_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
