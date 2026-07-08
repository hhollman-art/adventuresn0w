import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateSandboxCredentials,
  authenticateSandboxEmail,
  isSandboxAuthEnabled,
  isSandboxEmail,
  listSandboxAccountSummaries,
} from "./sandboxAccounts";

describe("sandboxAccounts", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSandboxFlag = process.env.AUTH_SANDBOX;
  const originalPassword = process.env.AUTH_SANDBOX_PASSWORD;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.AUTH_SANDBOX;
    delete process.env.AUTH_SANDBOX_PASSWORD;
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
    if (originalSandboxFlag === undefined) delete process.env.AUTH_SANDBOX;
    else process.env.AUTH_SANDBOX = originalSandboxFlag;
    if (originalPassword === undefined) delete process.env.AUTH_SANDBOX_PASSWORD;
    else process.env.AUTH_SANDBOX_PASSWORD = originalPassword;
  });

  it("enables sandbox auth only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isSandboxAuthEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    expect(isSandboxAuthEnabled()).toBe(false);
  });

  it("can be disabled in development via AUTH_SANDBOX=false", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SANDBOX", "false");
    expect(isSandboxAuthEnabled()).toBe(false);
    expect(listSandboxAccountSummaries()).toEqual([]);
  });

  it("lists the three alpha test accounts", () => {
    const accounts = listSandboxAccountSummaries();
    expect(accounts.map((row) => row.email)).toEqual([
      "admin@dmms.test",
      "dm1@dmms.test",
      "dm2@dmms.test",
    ]);
    expect(accounts.find((row) => row.email === "admin@dmms.test")?.tier).toBe("admin");
    expect(accounts.find((row) => row.email === "dm2@dmms.test")?.tier).toBe("premium");
  });

  it("authenticates sandbox credentials with the shared dev password", () => {
    const admin = authenticateSandboxCredentials("admin@dmms.test", "alpha-test");
    expect(admin?.tier).toBe("admin");
    expect(admin?.id).toBe("sandbox-admin");

    const free = authenticateSandboxCredentials("dm1@dmms.test", "alpha-test");
    expect(free?.tier).toBe("free");

    expect(authenticateSandboxCredentials("admin@dmms.test", "wrong")).toBeNull();
  });

  it("supports passwordless dev quick login by email", () => {
    const premium = authenticateSandboxEmail("dm2@dmms.test");
    expect(premium?.tier).toBe("premium");
    expect(authenticateSandboxEmail("unknown@dmms.test")).toBeNull();
  });

  it("marks sandbox emails as reserved", () => {
    expect(isSandboxEmail("dm1@dmms.test")).toBe(true);
    expect(isSandboxEmail("real@example.com")).toBe(false);
  });

  it("returns no sandbox data in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authenticateSandboxCredentials("admin@dmms.test", "alpha-test")).toBeNull();
    expect(authenticateSandboxEmail("admin@dmms.test")).toBeNull();
  });
});
