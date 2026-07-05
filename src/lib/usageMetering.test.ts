import { afterEach, describe, expect, it } from "vitest";
import {
  estimateImageCostUsd,
  estimateTextCostUsd,
  recordImageGenerationUsage,
  recordTextGenerationUsage,
  resetUsagePricingForTests,
  resolveBillingAccountId,
} from "./usageMetering";

afterEach(() => {
  delete process.env.USAGE_PRICING_JSON;
  delete process.env.BILLING_ACCOUNT_ID;
  resetUsagePricingForTests();
});

describe("usageMetering", () => {
  it("estimates text cost from model prefix and token counts", () => {
    // Sonnet: $3/M input, $15/M output.
    expect(estimateTextCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBe(18);
    expect(estimateTextCostUsd("claude-opus-4-1", 1_000_000, 0)).toBe(15);
    expect(estimateTextCostUsd("unknown-model", 1_000_000, 1_000_000)).toBe(0);
  });

  it("estimates image cost from quality and size", () => {
    expect(estimateImageCostUsd("high", "1536x1024", 2)).toBe(0.5);
    expect(estimateImageCostUsd("medium", "1024x1024", 1)).toBe(0.042);
    expect(estimateImageCostUsd("high", "999x999", 1)).toBe(0);
  });

  it("honors USAGE_PRICING_JSON overrides", () => {
    process.env.USAGE_PRICING_JSON = JSON.stringify({
      textPerMTok: { "claude-sonnet": { input: 1, output: 2 } },
    });
    resetUsagePricingForTests();
    expect(estimateTextCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBe(3);
  });

  it("records complete text events with a chargeback key", () => {
    const event = recordTextGenerationUsage({
      feature: "adventure",
      model: "claude-sonnet-4-6",
      inputTokens: 500,
      outputTokens: 4000,
    });
    expect(event).toMatchObject({
      kind: "text",
      provider: "anthropic",
      feature: "adventure",
      billingAccountId: "unbilled-local",
      inputTokens: 500,
      outputTokens: 4000,
    });
    expect(event.id).toBeTruthy();
    expect(event.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("records image events and uses BILLING_ACCOUNT_ID when set", () => {
    process.env.BILLING_ACCOUNT_ID = "dm-42";
    expect(resolveBillingAccountId()).toBe("dm-42");
    const event = recordImageGenerationUsage({
      feature: "map-image",
      model: "gpt-image-1",
      size: "1536x1024",
      quality: "high",
    });
    expect(event).toMatchObject({
      kind: "image",
      provider: "openai",
      billingAccountId: "dm-42",
      imageCount: 1,
      estimatedCostUsd: 0.25,
    });
  });
});
