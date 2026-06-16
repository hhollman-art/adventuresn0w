import { NextResponse } from "next/server";
import { buildPropImagePrompt, type PropImageInput, type PropItemCategory } from "@/lib/propImagePrompt";
import {
  defaultOpenAIImageModel,
  openAIImageErrorNextResponse,
  parseImageQuality,
  parseImageSize,
  requestOpenAIImagePng,
} from "@/lib/openaiImageClient";
import { propImagePostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError, logApiWarning } from "@/lib/serverLog";
import { createHeartbeatJsonResponse } from "@/lib/sseStream";

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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in environment." },
      { status: 500 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const parsed = propImagePostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const desc = String(body.description ?? body.bodyText ?? "").trim();

  const input: PropImageInput = {
    itemCategory: parseItemCategory(body.itemCategory ?? body.propType),
    title: String(body.title ?? "").trim(),
    description: desc,
    style: String(body.style ?? "").trim(),
    ageWear: String(body.ageWear ?? "").trim(),
    settingHint: String(body.settingHint ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
  };

  const size = parseImageSize(body.imageSize, "1024x1536");
  const quality = parseImageQuality(body.imageQuality);
  const model = defaultOpenAIImageModel();

  const work = async (): Promise<{ status: number; body: unknown }> => {
    const gen = await requestOpenAIImagePng({
      apiKey,
      model,
      prompt: buildPropImagePrompt(input),
      size,
      quality,
    });
    if (!gen.ok) {
      const err = openAIImageErrorNextResponse(gen.response, gen.payload);
      logApiWarning("prop_image_openai_failed", {
        model,
        status: String(gen.response.status),
      });
      return { status: err.status, body: err.body };
    }

    return {
      status: 200,
      body: {
        images: [
          {
            kind: input.itemCategory,
            imageDataUrl: `data:image/png;base64,${gen.b64}`,
          },
        ],
        model,
        size,
        quality,
      },
    };
  };

  if (body.stream) {
    return createHeartbeatJsonResponse({
      work,
      logTag: "prop_image_route_failed",
    });
  }

  try {
    const { status, body: out } = await work();
    return NextResponse.json(out, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logApiError("prop_image_route_failed", { message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
