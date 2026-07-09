import { randomUUID } from "crypto";

/**
 * Usage metering — the chargeback boundary for the future SaaS tier.
 *
 * Every request that spends provider money (Anthropic text, OpenAI images)
 * emits exactly one usage event through this module. Events carry the raw
 * billable units (tokens, images) plus a billing account key, so per-account
 * chargeback is definable the day accounts exist: populate `billingAccountId`
 * from the session and swap `emitUsageEvent` for a DB/queue sink — nothing
 * else changes.
 *
 * Metering is fire-and-forget: it must never fail or slow a generation.
 */

/** Which product feature spent the money — per-feature margins need this. */
export type GenerationFeature =
  | "adventure"
  | "realm"
  | "characters"
  | "character-sheet"
  | "homebrew-cf-map"
  | "map-image"
  | "realm-image"
  | "prop-image";

export type TextUsageEvent = {
  kind: "text";
  id: string;
  at: string;
  billingAccountId: string;
  feature: GenerationFeature;
  provider: "anthropic";
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Convenience only — billing recomputes from raw units. */
  estimatedCostUsd: number;
};

export type ImageUsageEvent = {
  kind: "image";
  id: string;
  at: string;
  billingAccountId: string;
  feature: GenerationFeature;
  provider: "openai";
  model: string;
  imageCount: number;
  size: string;
  quality: string;
  estimatedCostUsd: number;
};

export type UsageEvent = TextUsageEvent | ImageUsageEvent;

/* ---- Pricing (USD) — defaults, overridable without a deploy ---- */

type PricingTable = {
  /** Per million tokens, matched by model name prefix. */
  textPerMTok: Record<string, { input: number; output: number }>;
  /** Per image, matched by `quality:size`. */
  imagePerUnit: Record<string, number>;
};

const DEFAULT_PRICING: PricingTable = {
  textPerMTok: {
    "claude-opus": { input: 15, output: 75 },
    "claude-sonnet": { input: 3, output: 15 },
    "claude-haiku": { input: 0.8, output: 4 },
  },
  imagePerUnit: {
    "high:1024x1024": 0.167,
    "high:1536x1024": 0.25,
    "high:1024x1536": 0.25,
    "medium:1024x1024": 0.042,
    "medium:1536x1024": 0.063,
    "medium:1024x1536": 0.063,
  },
};

let cachedPricing: PricingTable | null = null;

/** Merge `USAGE_PRICING_JSON` env (same shape, partial) over the defaults. */
function pricing(): PricingTable {
  if (cachedPricing) return cachedPricing;
  let merged = DEFAULT_PRICING;
  const raw = process.env.USAGE_PRICING_JSON?.trim();
  if (raw) {
    try {
      const override = JSON.parse(raw) as Partial<PricingTable>;
      merged = {
        textPerMTok: { ...DEFAULT_PRICING.textPerMTok, ...override.textPerMTok },
        imagePerUnit: { ...DEFAULT_PRICING.imagePerUnit, ...override.imagePerUnit },
      };
    } catch {
      console.warn("[usage] invalid USAGE_PRICING_JSON — using default pricing");
    }
  }
  cachedPricing = merged;
  return merged;
}

/** Reset the pricing cache (env changes between tests). */
export function resetUsagePricingForTests(): void {
  cachedPricing = null;
}

export function estimateTextCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const table = pricing().textPerMTok;
  const key = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => model.startsWith(prefix));
  if (!key) return 0;
  const rate = table[key]!;
  const usd = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export function estimateImageCostUsd(
  quality: string,
  size: string,
  imageCount: number,
): number {
  const perUnit = pricing().imagePerUnit[`${quality}:${size}`] ?? 0;
  return Math.round(perUnit * imageCount * 1_000_000) / 1_000_000;
}

/* ---- Billing account ---- */

/**
 * Chargeback key. Single-user deployments identify themselves via env;
 * the hosted tier will resolve this from the authenticated session instead.
 */
export function resolveBillingAccountId(): string {
  return process.env.BILLING_ACCOUNT_ID?.trim() || "unbilled-local";
}

/* ---- Sink ---- */

/**
 * Single swap point for where usage events go. Today: one structured log
 * line per event (grep `[usage]`). Hosted tier: replace the body with a DB
 * insert or metering queue publish — callers don't change.
 */
function emitUsageEvent(event: UsageEvent): void {
  try {
    console.info(`[usage] generation_usage ${JSON.stringify(event)}`);
  } catch {
    /* metering must never break a generation */
  }
}

/* ---- Recorders (call on success, fire-and-forget) ---- */

export function recordTextGenerationUsage(params: {
  feature: GenerationFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): TextUsageEvent {
  const event: TextUsageEvent = {
    kind: "text",
    id: randomUUID(),
    at: new Date().toISOString(),
    billingAccountId: resolveBillingAccountId(),
    feature: params.feature,
    provider: "anthropic",
    model: params.model,
    inputTokens: Math.max(0, Math.round(params.inputTokens)),
    outputTokens: Math.max(0, Math.round(params.outputTokens)),
    estimatedCostUsd: estimateTextCostUsd(
      params.model,
      params.inputTokens,
      params.outputTokens,
    ),
  };
  emitUsageEvent(event);
  return event;
}

export function recordImageGenerationUsage(params: {
  feature: GenerationFeature;
  model: string;
  size: string;
  quality: string;
  imageCount?: number;
}): ImageUsageEvent {
  const imageCount = Math.max(1, Math.round(params.imageCount ?? 1));
  const event: ImageUsageEvent = {
    kind: "image",
    id: randomUUID(),
    at: new Date().toISOString(),
    billingAccountId: resolveBillingAccountId(),
    feature: params.feature,
    provider: "openai",
    model: params.model,
    imageCount,
    size: params.size,
    quality: params.quality,
    estimatedCostUsd: estimateImageCostUsd(params.quality, params.size, imageCount),
  };
  emitUsageEvent(event);
  return event;
}
