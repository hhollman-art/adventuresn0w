import type { DmAccount } from "./types";
import { findAccountByEmail, verifyAccountPassword } from "./accountStore";
import { normalizeEmail } from "./validation";
import { createFreeAccount, tierToLicenseTier } from "./tiers";

function envAdminEmail(): string {
  const explicit = process.env.DM_AUTH_EMAIL?.trim();
  if (explicit) return normalizeEmail(explicit);
  const username = process.env.DM_AUTH_USERNAME?.trim() ?? "";
  if (username.includes("@")) return normalizeEmail(username);
  return normalizeEmail(`${username || "admin"}@dm.local`);
}

/** Build a DmAccount from a stored row or env admin match. */
export function storedAccountToDmAccount(stored: {
  id: string;
  email: string;
  tier: DmAccount["tier"];
}): DmAccount {
  const username = stored.email.split("@")[0] ?? "dm";
  return {
    id: stored.id,
    email: stored.email,
    username,
    role: "dm",
    tier: stored.tier,
    licenseTier: tierToLicenseTier(stored.tier),
    licenseExpiresAt: null,
  };
}

/**
 * Validate email/password against registered accounts and env admin bootstrap.
 * Returns null when credentials are invalid.
 */
export function authenticateCredentials(email: string, password: string): DmAccount | null {
  const normalized = normalizeEmail(email);

  const stored = verifyAccountPassword(normalized, password);
  if (stored) return storedAccountToDmAccount(stored);

  const expectedUser = process.env.DM_AUTH_USERNAME?.trim();
  const expectedPassword = process.env.DM_AUTH_PASSWORD?.trim();
  if (!expectedUser || !expectedPassword) return null;

  const adminEmail = envAdminEmail();
  const usernameMatch =
    normalized === adminEmail ||
    normalized === normalizeEmail(expectedUser) ||
    normalized === normalizeEmail(`${expectedUser}@dm.local`);

  if (!usernameMatch || password !== expectedPassword) return null;

  return {
    ...createFreeAccount({ id: `dm-${expectedUser.toLowerCase()}`, email: adminEmail, username: expectedUser }),
    tier: "admin",
    licenseTier: "dm",
  };
}

export function emailAlreadyRegistered(email: string): boolean {
  return findAccountByEmail(email) !== null;
}

/** @deprecated Use authenticateCredentials — kept for session-room bootstrap. */
export function validateDmCredentials(username: string, password: string): DmAccount | null {
  return authenticateCredentials(username.includes("@") ? username : `${username}@dm.local`, password);
}

export function isDmHostingEnabled(): boolean {
  return Boolean(
    process.env.DM_AUTH_SECRET?.trim() &&
      process.env.DM_AUTH_USERNAME?.trim() &&
      process.env.DM_AUTH_PASSWORD?.trim(),
  );
}
