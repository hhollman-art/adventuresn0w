import type { DmAccount, UserTier } from "./types";
import { tierToLicenseTier } from "./tiers";
import { normalizeEmail } from "./validation";

/** Shared password for all sandbox accounts in local development. */
const DEFAULT_SANDBOX_PASSWORD = "alpha-test";

type SandboxAccountSeed = {
  id: string;
  email: string;
  tier: UserTier;
  label: string;
  description: string;
};

const SANDBOX_ACCOUNT_SEEDS: SandboxAccountSeed[] = [
  {
    id: "sandbox-admin",
    email: "admin@dmms.test",
    tier: "admin",
    label: "Admin",
    description: "Admin UI panel and site banners",
  },
  {
    id: "sandbox-dm1",
    email: "dm1@dmms.test",
    tier: "free",
    label: "Free DM",
    description: "Standard free-tier profile",
  },
  {
    id: "sandbox-dm2",
    email: "dm2@dmms.test",
    tier: "premium",
    label: "Premium DM",
    description: "Premium-tier preview profile",
  },
];

export type SandboxAccountSummary = {
  email: string;
  tier: UserTier;
  label: string;
  description: string;
};

/**
 * Sandbox auth is strictly local-dev only.
 * Production builds never enable this path, even if env vars are mis-set.
 */
export function isSandboxAuthEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.AUTH_SANDBOX === "false") return false;
  return true;
}

export function getSandboxPassword(): string {
  return process.env.AUTH_SANDBOX_PASSWORD?.trim() || DEFAULT_SANDBOX_PASSWORD;
}

export function listSandboxAccountSummaries(): SandboxAccountSummary[] {
  if (!isSandboxAuthEnabled()) return [];
  return SANDBOX_ACCOUNT_SEEDS.map(({ email, tier, label, description }) => ({
    email,
    tier,
    label,
    description,
  }));
}

function findSandboxSeed(email: string): SandboxAccountSeed | null {
  if (!isSandboxAuthEnabled()) return null;
  const normalized = normalizeEmail(email);
  return SANDBOX_ACCOUNT_SEEDS.find((seed) => normalizeEmail(seed.email) === normalized) ?? null;
}

export function sandboxSeedToDmAccount(seed: SandboxAccountSeed): DmAccount {
  const email = normalizeEmail(seed.email);
  return {
    id: seed.id,
    email,
    username: email.split("@")[0] ?? "dm",
    role: "dm",
    tier: seed.tier,
    licenseTier: tierToLicenseTier(seed.tier),
    licenseExpiresAt: null,
  };
}

/** Password-based sandbox login — used by the standard `/api/auth/login` route. */
export function authenticateSandboxCredentials(email: string, password: string): DmAccount | null {
  const seed = findSandboxSeed(email);
  if (!seed) return null;
  if (password !== getSandboxPassword()) return null;
  return sandboxSeedToDmAccount(seed);
}

/** One-click dev login — no password required; route must guard with {@link isSandboxAuthEnabled}. */
export function authenticateSandboxEmail(email: string): DmAccount | null {
  const seed = findSandboxSeed(email);
  if (!seed) return null;
  return sandboxSeedToDmAccount(seed);
}

export function isSandboxEmail(email: string): boolean {
  return findSandboxSeed(email) !== null;
}
