import { NextResponse } from "next/server";
import { buildPropImagePrompt, type PropImageInput, type PropType } from "@/lib/propImagePrompt";
import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

function parsePropType(value: unknown): PropType {
  const raw = String(value ?? "").trim();
  if (
    raw === "letter" ||
    raw === "scroll" ||
    raw === "journal" ||
    raw === "notice" ||
    raw === "map_handout" ||
    raw === "rune_tablet"
  ) {
    return raw;
  }
  return "letter";
}

function parseSize(value: unknown): "1024x1024" | "1536x1024" | "1024x1536" {
  const raw = String(value ?? "").trim();
  if (raw === "1536x1024" || raw === "1024x1536" || raw === "1024x1024") {
    return raw;
  }
  return "1024x1536";
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

  let body: Partial<PropImageInput> & {
    imageSize?: string;
    imageQuality?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: PropImageInput = {
    propType: parsePropType(body.propType),
    title: String(body.title ?? "").trim(),
    bodyText: String(body.bodyText ?? "").trim(),
    style: String(body.style ?? "").trim(),
    ageWear: String(body.ageWear ?? "").trim(),
    settingHint: String(body.settingHint ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
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
        prompt: buildPropImagePrompt(input),
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
      images: [{ kind: input.propType, imageDataUrl: `data:image/png;base64,${b64}` }],
      model,
      size,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
