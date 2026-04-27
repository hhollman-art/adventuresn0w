import { NextResponse } from "next/server";
import {
  buildRealmCartographyImagePrompt,
  type RealmImageInput,
} from "@/lib/realmImagePrompt";
import type { RealmSize } from "@/lib/realmPrompt";
import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

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

function parseSize(value: unknown): "1024x1024" | "1536x1024" | "1024x1536" {
  const raw = String(value ?? "").trim();
  if (raw === "1536x1024" || raw === "1024x1536" || raw === "1024x1024") {
    return raw;
  }
  return "1536x1024";
}

function parseQuality(value: unknown): "medium" | "high" {
  const raw = String(value ?? "").trim();
  return raw === "medium" ? "medium" : "high";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in environment." },
      { status: 500 },
    );
  }

  let body: Partial<RealmImageInput> & {
    imageSize?: string;
    imageQuality?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const realmMarkdown = String(body.realmMarkdown ?? "").trim();
  if (!realmMarkdown) {
    return NextResponse.json(
      { error: "Realm text is required to build the map image." },
      { status: 400 },
    );
  }

  const input: RealmImageInput = {
    realmSize: parseRealmSize(body.realmSize),
    titleHint: String(body.titleHint ?? "").trim(),
    realmMarkdown,
  };

  const size = parseSize(body.imageSize);
  const quality = parseQuality(body.imageQuality);
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: buildRealmCartographyImagePrompt(input),
        size,
        quality,
      }),
    });

    const payload = (await response.json()) as OpenAIImageResponse;
    if (!response.ok) {
      const parsed = parseOpenAIImageApiFailure(response, payload);
      return NextResponse.json(
        {
          error: formatImageApiErrorForClient(parsed),
          requestId: parsed.requestId,
        },
        { status: 502 },
      );
    }

    const b64 = payload.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: "Image API returned no image data." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      images: [
        {
          kind: "realm",
          imageDataUrl: `data:image/png;base64,${b64}`,
        },
      ],
      model,
      size,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
