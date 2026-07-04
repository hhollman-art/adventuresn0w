import { NextResponse } from "next/server";
import {
  buildMapImagePrompt,
  type MapImageInput,
  type MapPackKind,
} from "@/lib/mapImagePrompt";
import {
  defaultOpenAIImageModel,
  openAIImageErrorNextResponse,
  parseImageQuality,
  parseImageSize,
  requestOpenAIImagePng,
} from "@/lib/openaiImageClient";
import { parseLibraryReferenceMarkdown } from "@/lib/requestLimits";
import { mapImagePostSchema, badRequest } from "@/lib/apiSchemas";
import { logApiError, logApiWarning } from "@/lib/serverLog";
import { parseMapDistanceUnits } from "@/lib/mapDistanceUnits";
import { createHeartbeatJsonResponse } from "@/lib/sseStream";

function parseMapKind(value: unknown): MapPackKind {
  const raw = String(value ?? "").trim();
  if (raw === "overland") return "overland";
  if (raw === "battle") return "battle";
  return "both";
}

function parseBattleGridDimension(value: unknown): number | undefined {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : Math.round(Number(String(value ?? "").trim()));
  if (!Number.isFinite(n) || n < 4 || n > 100) return undefined;
  return n;
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

  const parsed = mapImagePostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.");
  }

  const body = parsed.data;
  const libraryReferenceMarkdown = parseLibraryReferenceMarkdown(
    body.libraryReferenceMarkdown,
  );

  const battleGridCols = parseBattleGridDimension(body.battleGridCols);
  const battleGridRows = parseBattleGridDimension(body.battleGridRows);

  const input: MapImageInput = {
    mapKind: parseMapKind(body.mapKind),
    mapDistanceUnits: parseMapDistanceUnits(body.mapDistanceUnits),
    locationName: String(body.locationName ?? "").trim(),
    levelRange: String(body.levelRange ?? "3–4").trim(),
    partySize: String(body.partySize ?? "4").trim(),
    tone: String(body.tone ?? "").trim(),
    context: String(body.context ?? "").trim(),
    gridNotes: String(body.gridNotes ?? "").trim(),
    extraNotes: String(body.extraNotes ?? "").trim(),
    ...(battleGridCols !== undefined ? { battleGridCols } : {}),
    ...(battleGridRows !== undefined ? { battleGridRows } : {}),
    ...(libraryReferenceMarkdown ? { libraryReferenceMarkdown } : {}),
  };

  const size = parseImageSize(body.imageSize);
  const quality = parseImageQuality(body.imageQuality);
  const model = defaultOpenAIImageModel();
  const variants: Array<"locale" | "battle"> =
    input.mapKind === "overland"
      ? ["locale"]
      : input.mapKind === "battle"
        ? ["battle"]
        : ["locale", "battle"];

  const work = async (): Promise<{ status: number; body: unknown }> => {
    const images: Array<{ kind: "locale" | "battle"; imageDataUrl: string }> = [];
    for (const variant of variants) {
      const gen = await requestOpenAIImagePng({
        apiKey,
        model,
        prompt: buildMapImagePrompt(input, variant),
        size,
        quality,
      });
      if (!gen.ok) {
        const err = openAIImageErrorNextResponse(gen.response, gen.payload);
        logApiWarning("map_image_openai_failed", {
          variant,
          model,
          status: String(gen.response.status),
        });
        return { status: err.status, body: err.body };
      }

      images.push({ kind: variant, imageDataUrl: `data:image/png;base64,${gen.b64}` });
    }

    return { status: 200, body: { images, model, size, quality } };
  };

  if (body.stream) {
    return createHeartbeatJsonResponse({ work, logTag: "map_image_route_failed" });
  }

  try {
    const { status, body: out } = await work();
    return NextResponse.json(out, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logApiError("map_image_route_failed", { message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
