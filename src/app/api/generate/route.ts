import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  type AdventureInput,
  type AdventureLength,
  type CombatIntensity,
} from "@/lib/adventurePrompt";
import {
  formatAnthropicError,
  generateMarkdown,
  generateMarkdownStream,
} from "@/lib/anthropicGenerate";
import { parseRealmSeedMarkdown } from "@/lib/requestLimits";
import { adventurePostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError } from "@/lib/serverLog";

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
    ...(realmSeedMarkdown ? { realmSeedMarkdown } : {}),
  };

  try {
    const userMessage = buildUserMessage(input);
    if (!body.stream) {
      const { markdown, model } = await generateMarkdown({
        apiKey,
        system: SYSTEM_PROMPT,
        user: userMessage,
      });
      return NextResponse.json({ markdown, model });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const write = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        try {
          const result = await generateMarkdownStream({
            apiKey,
            system: SYSTEM_PROMPT,
            user: userMessage,
            onModel: (model) => write({ type: "meta", model }),
            onText: (chunk) => write({ type: "chunk", text: chunk }),
          });
          write({ type: "done", markdown: result.markdown, model: result.model });
          controller.close();
        } catch (err) {
          const { message, status } = formatAnthropicError(err);
          logApiError("adventure_stream_failed", { status: String(status), message });
          write({ type: "error", error: message, status });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("adventure_generate_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
