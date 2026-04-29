import { NextResponse } from "next/server";
import {
  buildRealmCartographyImagePrompt,
  type RealmImageInput,
} from "@/lib/realmImagePrompt";
import type { RealmSize } from "@/lib/realmPrompt";
import {
  defaultOpenAIImageModel,
  openAIImageErrorNextResponse,
  parseImageQuality,
  parseImageSize,
  requestOpenAIImagePng,
} from "@/lib/openaiImageClient";
import { realmImagePostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError, logApiWarning } from "@/lib/serverLog";

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

  const parsed = realmImagePostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const realmMarkdown = String(body.realmMarkdown ?? "").trim();
  if (!realmMarkdown) {
    return badRequest("Realm text is required to build the map image.");
  }

  const input: RealmImageInput = {
    realmSize: parseRealmSize(body.realmSize),
    titleHint: String(body.titleHint ?? "").trim(),
    realmMarkdown,
  };

  const size = parseImageSize(body.imageSize);
  const quality = parseImageQuality(body.imageQuality);
  const model = defaultOpenAIImageModel();

  try {
    const gen = await requestOpenAIImagePng({
      apiKey,
      model,
      prompt: buildRealmCartographyImagePrompt(input),
      size,
      quality,
    });
    if (!gen.ok) {
      const err = openAIImageErrorNextResponse(gen.response, gen.payload);
      logApiWarning("realm_image_openai_failed", { model, status: String(gen.response.status) });
      return NextResponse.json(err.body, { status: err.status });
    }

    return NextResponse.json({
      images: [
        {
          kind: "realm",
          imageDataUrl: `data:image/png;base64,${gen.b64}`,
        },
      ],
      model,
      size,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logApiError("realm_image_route_failed", { message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
