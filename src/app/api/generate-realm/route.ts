import { NextResponse } from "next/server";
import {
  buildRealmUserMessage,
  REALM_SYSTEM_PROMPT,
  type RealmInput,
  type RealmSize,
} from "@/lib/realmPrompt";
import {
  formatAnthropicError,
  generateMarkdown,
  generateMarkdownStream,
} from "@/lib/anthropicGenerate";

function parseRealmSize(value: unknown): RealmSize {
  const raw = String(value ?? "").trim();
  if (
    raw === "world" ||
    raw === "continent" ||
    raw === "country" ||
    raw === "region" ||
    raw === "local"
  ) {
    return raw;
  }
  return "country";
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY in environment." },
      { status: 500 },
    );
  }

  let body: Partial<RealmInput> & { stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: RealmInput = {
    realmSize: parseRealmSize(body.realmSize),
    titleHint: String(body.titleHint ?? "").trim(),
    description: String(body.description ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
  };

  if (!input.description) {
    return NextResponse.json(
      { error: "Describe what you want in the realm (description is required)." },
      { status: 400 },
    );
  }

  try {
    const user = buildRealmUserMessage(input);
    if (!body.stream) {
      const { markdown, model } = await generateMarkdown({
        apiKey,
        system: REALM_SYSTEM_PROMPT,
        user,
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
            system: REALM_SYSTEM_PROMPT,
            user,
            onModel: (model) => write({ type: "meta", model }),
            onText: (chunk) => write({ type: "chunk", text: chunk }),
          });
          write({ type: "done", markdown: result.markdown, model: result.model });
          controller.close();
        } catch (err) {
          const { message, status } = formatAnthropicError(err);
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
    return NextResponse.json({ error: message }, { status });
  }
}
