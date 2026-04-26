import { NextResponse } from "next/server";
import {
  buildMapImagePrompt,
  type MapImageInput,
  type MapPackKind,
} from "@/lib/mapImagePrompt";
import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

function parseMapKind(value: unknown): MapPackKind {
  const raw = String(value ?? "").trim();
  if (raw === "overland") return "overland";
  if (raw === "battle") return "battle";
  return "both";
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

  let body: Partial<MapImageInput> & {
    imageSize?: string;
    imageQuality?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input: MapImageInput = {
    mapKind: parseMapKind(body.mapKind),
    locationName: String(body.locationName ?? "").trim(),
    levelRange: String(body.levelRange ?? "3–4").trim(),
    partySize: String(body.partySize ?? "4").trim(),
    tone: String(body.tone ?? "").trim(),
    context: String(body.context ?? "").trim(),
    gridNotes: String(body.gridNotes ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
  };

  const size = parseSize(body.imageSize);
  const quality = parseQuality(body.imageQuality);
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const variants: Array<"locale" | "battle"> =
    input.mapKind === "overland"
      ? ["locale"]
      : input.mapKind === "battle"
        ? ["battle"]
        : ["locale", "battle"];

  try {
    const images: Array<{ kind: "locale" | "battle"; imageDataUrl: string }> = [];
    for (const variant of variants) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: buildMapImagePrompt(input, variant),
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
      images.push({ kind: variant, imageDataUrl: `data:image/png;base64,${b64}` });
    }

    return NextResponse.json({
      images,
      model,
      size,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
