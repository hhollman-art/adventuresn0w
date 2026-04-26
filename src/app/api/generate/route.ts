import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  type AdventureInput,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import { formatAnthropicError, generateMarkdown } from "@/lib/anthropicGenerate";

function parseAdventureLength(value: unknown): AdventureLength {
  const raw = String(value ?? "").trim();
  if (raw === "one_night" || raw === "one-night" || raw === "onenight") {
    return "one_night";
  }
  if (raw === "campaign") {
    return "campaign";
  }
  return "short";
}

function parseCombatIntensity(value: unknown): CombatIntensity {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 3;
  }
  const clamped = Math.min(5, Math.max(1, Math.round(n)));
  return clamped as CombatIntensity;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY in environment." },
      { status: 500 },
    );
  }

  let body: Partial<AdventureInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: AdventureInput = {
    adventureLength: parseAdventureLength(body.adventureLength),
    combatIntensity: parseCombatIntensity(body.combatIntensity),
    titleHint: String(body.titleHint ?? "").trim(),
    levelRange: String(body.levelRange ?? "3–4").trim(),
    tone: String(body.tone ?? "heroic fantasy").trim(),
    setting: String(body.setting ?? "").trim() || "wilderness borderland",
    villainOrThreat: String(body.villainOrThreat ?? "").trim() || "a rising local threat",
    partySize: String(body.partySize ?? "4").trim(),
    sessionLength: String(body.sessionLength ?? "3–4 hours").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
  };

  try {
    const { markdown, model } = await generateMarkdown({
      apiKey,
      system: SYSTEM_PROMPT,
      user: buildUserMessage(input),
    });
    return NextResponse.json({ markdown, model });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
