import { NextResponse } from "next/server";
import {
  buildRealmCartographyImagePrompt,
  type RealmImageInput,
} from "@/lib/realmImagePrompt";
import { parseRealmSize } from "@/lib/realmPrompt";
import {
  defaultOpenAIImageModel,
  openAIImageErrorNextResponse,
  parseImageQuality,
  parseImageSize,
  requestOpenAIImagePng,
} from "@/lib/openaiImageClient";
import { realmImagePostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError, logApiWarning } from "@/lib/serverLog";
import { parseMapDistanceUnits } from "@/lib/mapDistanceUnits";
import { createHeartbeatJsonResponse } from "@/lib/sseStream";

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
    mapDistanceUnits: parseMapDistanceUnits(body.mapDistanceUnits),
    titleHint: String(body.titleHint ?? "").trim(),
    realmMarkdown,
  };

  const size = parseImageSize(body.imageSize);
  const quality = parseImageQuality(body.imageQuality);
  const model = defaultOpenAIImageModel();

  const work = async (): Promise<{ status: number; body: unknown }> => {
    const gen = await requestOpenAIImagePng({
      apiKey,
      model,
      prompt: buildRealmCartographyImagePrompt(input),
      size,
      quality,
    });
    if (!gen.ok) {
      const err = openAIImageErrorNextResponse(gen.response, gen.payload);
      logApiWarning("realm_image_openai_failed", {
        model,
        status: String(gen.response.status),
      });
      return { status: err.status, body: err.body };
    }

    return {
      status: 200,
      body: {
        images: [
          { kind: "realm", imageDataUrl: `data:image/png;base64,${gen.b64}` },
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
      logTag: "realm_image_route_failed",
    });
  }

  try {
    const { status, body: out } = await work();
    return NextResponse.json(out, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logApiError("realm_image_route_failed", { message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
