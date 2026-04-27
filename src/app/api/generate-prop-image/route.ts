import { NextResponse } from "next/server";
import { buildPropImagePrompt, type PropImageInput, type PropItemCategory } from "@/lib/propImagePrompt";
import {
  formatImageApiErrorForClient,
  parseOpenAIImageApiFailure,
} from "@/lib/openaiImagePrompt";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

const LEGACY_PROP_TYPE: Record<string, PropItemCategory> = {
  letter: "paper",
  scroll: "paper",
  journal: "paper",
  notice: "paper",
  map_handout: "paper",
  rune_tablet: "relic",
  book_of_hours: "paper",
  indenture: "paper",
  court_writ: "paper",
  broadsheet: "paper",
  heraldic_grant: "paper",
  merchants_ledger: "paper",
};

function parseItemCategory(value: unknown): PropItemCategory {
  const raw = String(value ?? "").trim();
  if (LEGACY_PROP_TYPE[raw]) {
    return LEGACY_PROP_TYPE[raw]!;
  }
  if (
    raw === "paper" ||
    raw === "potion" ||
    raw === "weapon" ||
    raw === "armor" ||
    raw === "tool" ||
    raw === "container" ||
    raw === "wearable" ||
    raw === "food_drink" ||
    raw === "relic" ||
    raw === "other"
  ) {
    return raw;
  }
  return "paper";
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

  const b = body as { description?: string; bodyText?: string; itemCategory?: string; propType?: string };
  const desc = String(b.description ?? b.bodyText ?? "").trim();

  const input: PropImageInput = {
    itemCategory: parseItemCategory(b.itemCategory ?? b.propType),
    title: String(body.title ?? "").trim(),
    description: desc,
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
      images: [{ kind: input.itemCategory, imageDataUrl: `data:image/png;base64,${b64}` }],
      model,
      size,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
