import { NextResponse } from "next/server";
import { z } from "zod";
import { formatAnthropicError, generateMarkdown } from "@/lib/anthropicGenerate";
import { badRequest } from "@/lib/apiSchemas";
import { parseImageDataUrlForVision } from "@/lib/parseDataUrl";
import { logApiError } from "@/lib/serverLog";
import { recordTextGenerationUsage } from "@/lib/usageMetering";
import {
  CF_SCHEMA_MAP_SYSTEM_PROMPT,
  buildCfMapUserMessage,
  extractJsonPayload,
  mapRawJsonToCfDraft,
  type CfMappedKind,
} from "@/lib/workshop/cfSchemaMapper";

const targetKindSchema = z.enum([
  "item",
  "npc",
  "character",
  "spell",
  "location",
  "realm",
]);

const homebrewCfPostSchema = z.object({
  targetKind: targetKindSchema,
  extractedText: z.string().optional(),
  fileName: z.string().optional(),
  /** Optional image data URL — client already read the file locally. */
  imageDataUrl: z.string().optional(),
  completeMissing: z.boolean().optional(),
  partial: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Homebrew → Creation File schema mapper.
 * Receives client-extracted text / optional image metadata only — never a
 * raw file upload stream from disk.
 */
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

  const parsed = homebrewCfPostSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.",
    );
  }

  const targetKind = parsed.data.targetKind as CfMappedKind;
  const extractedText = String(parsed.data.extractedText ?? "").trim();
  const imageDataUrl = parsed.data.imageDataUrl?.trim() || undefined;

  if (!extractedText && !imageDataUrl) {
    return badRequest("Provide extractedText and/or imageDataUrl from a local file read.");
  }

  // Cap image payload size (~1.5MB base64) to protect the API key budget.
  if (imageDataUrl && imageDataUrl.length > 2_000_000) {
    return badRequest("Image payload too large. Use a smaller image or paste text instead.");
  }

  const userText = buildCfMapUserMessage({
    targetKind,
    extractedText,
    fileName: parsed.data.fileName,
    imageDataUrl: imageDataUrl ?? null,
    completeMissing: parsed.data.completeMissing ?? false,
    partial: parsed.data.partial,
  });

  try {
    // Vision: Anthropic multimodal when an image data URL is present.
    let markdown: string;
    let model: string;
    let usage: { inputTokens: number; outputTokens: number };

    if (imageDataUrl?.startsWith("data:image/")) {
      const vision = parseImageDataUrlForVision(imageDataUrl);
      if ("error" in vision) {
        return badRequest(vision.error);
      }
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });
      const preferred =
        process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
      const message = await client.messages.create({
        model: preferred,
        max_tokens: 4096,
        system: CF_SCHEMA_MAP_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: vision.mediaType,
                  data: vision.data,
                },
              },
              { type: "text", text: userText },
            ],
          },
        ],
      });
      markdown = message.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n")
        .trim();
      model = preferred;
      usage = {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
      };
    } else if (imageDataUrl) {
      return badRequest("imageDataUrl must be a data:image/...;base64,... URL.");
    } else {
      const result = await generateMarkdown({
        apiKey,
        system: CF_SCHEMA_MAP_SYSTEM_PROMPT,
        user: userText,
      });
      markdown = result.markdown;
      model = result.model;
      usage = result.usage;
    }

    if (!markdown) {
      return NextResponse.json({ error: "Model returned no text." }, { status: 502 });
    }

    const rawJson = extractJsonPayload(markdown);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      logApiError("homebrew_cf_json_parse_failed", { snippet: rawJson.slice(0, 200) });
      return NextResponse.json(
        { error: "Model did not return valid JSON for the Creation File schema." },
        { status: 502 },
      );
    }

    const mapped = mapRawJsonToCfDraft(targetKind, parsedJson);
    recordTextGenerationUsage({
      feature: "homebrew-cf-map",
      model,
      ...usage,
    });
    return NextResponse.json({ mapped, model, rawJson });
  } catch (err) {
    const { message, status } = formatAnthropicError(err);
    logApiError("homebrew_cf_map_failed", { status: String(status), message });
    return NextResponse.json({ error: message }, { status });
  }
}
