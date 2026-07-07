import { describe, expect, it } from "vitest";
import { validateAuthFields, validateEmail, validatePassword } from "./validation";
import { canAccessPremiumFeature, createFreeAccount, getPostLoginRedirect } from "./tiers";

describe("auth validation", () => {
  it("rejects invalid email", () => {
    expect(validateEmail("not-an-email")).toBeTruthy();
    expect(validateEmail("dm@example.com")).toBeNull();
  });

  it("enforces sign-up password rules", () => {
    expect(validatePassword("short", "sign-up")).toBeTruthy();
    expect(validatePassword("longenough1", "sign-up")).toBeNull();
    expect(validatePassword("any", "sign-in")).toBeNull();
  });

  it("returns field errors object", () => {
    const errors = validateAuthFields("bad", "x", "sign-up");
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });
});

describe("auth tiers", () => {
  it("defaults new accounts to free tier redirect", () => {
    const account = createFreeAccount({ id: "u1", email: "dm@example.com" });
    expect(account.tier).toBe("free");
    expect(getPostLoginRedirect(account)).toBe("/dashboard");
  });

  it("gates premium features", () => {
    const free = createFreeAccount({ id: "u1", email: "a@b.com" });
    const premium = { ...free, tier: "premium" as const };
    expect(canAccessPremiumFeature(free)).toBe(false);
    expect(canAccessPremiumFeature(premium)).toBe(true);
  });
});
