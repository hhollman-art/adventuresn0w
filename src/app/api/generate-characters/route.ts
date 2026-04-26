import { NextResponse } from "next/server";
import {
  CHARACTER_SYSTEM_PROMPT,
  buildPremadeCharactersMessage,
  type PremadeCharacterInput,
} from "@/lib/characterPrompt";
import { formatAnthropicError, generateMarkdown } from "@/lib/anthropicGenerate";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY in environment." },
      { status: 500 },
    );
  }

  let body: Partial<PremadeCharacterInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: PremadeCharacterInput = {
    partyConcept: String(body.partyConcept ?? "").trim(),
    levelRange: String(body.levelRange ?? "3").trim(),
    tone: String(body.tone ?? "heroic fantasy").trim(),
    setting: String(body.setting ?? "").trim(),
    characterCount: String(body.characterCount ?? "4").trim() || "4",
    extraNotes: String(body.extraNotes ?? "").trim(),
  };

  try {
    const { markdown, model } = await generateMarkdown({
      apiKey,
      system: CHARACTER_SYSTEM_PROMPT,
      user: buildPremadeCharactersMessage(input),
    });
    return NextResponse.json({ markdown, model });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
