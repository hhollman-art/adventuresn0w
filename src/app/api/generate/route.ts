import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  adventureLengthFromSessionCount,
  buildUserMessage,
  formatSessionLengthField,
  type AdventureInput,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import {
  formatAnthropicError,
  generateMarkdown,
} from "@/lib/anthropicGenerate";
import { createMarkdownSseResponse } from "@/lib/sseStream";
import { parseRealmSeedMarkdown } from "@/lib/requestLimits";
import { adventurePostSchema, badRequest } from "@/lib/apiSchemas";
import { parseHoursPerSession } from "@/lib/parseHoursPerSession";
import { logApiError } from "@/lib/serverLog";
import { recordTextGenerationUsage } from "@/lib/usageMetering";

function parseAdventureLength(value: unknown): AdventureLength {
  const raw = String(value ?? "").trim();
  if (raw === "one_night" || raw === "one-night" || raw === "onenight") {
    return "one_night";
  }
  if (raw === "campaign") {
    return "one_night";
  }
  return "short";
}

function parseSessionCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const parsed = adventurePostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const realmSeedMarkdown = parseRealmSeedMarkdown(body.realmSeedMarkdown);

  const sessionCount = parseSessionCount(body.sessionCount ?? 1);
  const hoursPerSession = parseHoursPerSession(body.hoursPerSession ?? 3);
  const adventureLength = body.adventureLength
    ? parseAdventureLength(body.adventureLength)
    : adventureLengthFromSessionCount(sessionCount);

  const input: AdventureInput = {
    adventureLength,
    sessionCount,
    hoursPerSession,
    combatIntensity: parseCombatIntensity(body.combatIntensity),
    titleHint: String(body.titleHint ?? "").trim(),
    levelRange: String(body.levelRange ?? "3–4").trim(),
    tone: String(body.tone ?? "heroic fantasy").trim(),
    setting: String(body.setting ?? "").trim() || "wilderness borderland",
    villainOrThreat: String(body.villainOrThreat ?? "").trim() || "a rising local threat",
    partySize: String(body.partySize ?? "4").trim(),
    sessionLength:
      String(body.sessionLength ?? "").trim() ||
      formatSessionLengthField(sessionCount, hoursPerSession),
    extraNotes: String(body.extraNotes ?? "").trim(),
    ...(realmSeedMarkdown ? { realmSeedMarkdown } : {}),
  };

  try {
    const userMessage = buildUserMessage(input);
    if (!body.stream) {
      const { markdown, model, usage } = await generateMarkdown({
        apiKey,
        system: SYSTEM_PROMPT,
        user: userMessage,
      });
      recordTextGenerationUsage({ feature: "adventure", model, ...usage });
      return NextResponse.json({ markdown, model });
    }

    return createMarkdownSseResponse({
      apiKey,
      system: SYSTEM_PROMPT,
      user: userMessage,
      feature: "adventure",
      logTag: "adventure_stream_failed",
      signal: request.signal,
    });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("adventure_generate_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
