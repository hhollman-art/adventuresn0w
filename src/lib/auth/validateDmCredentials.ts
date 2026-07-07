import type { DmAccount } from "./types";

/**
 * Dev/staging credential check — swap for a database lookup in production.
 * Configure via DM_AUTH_USERNAME and DM_AUTH_PASSWORD (or DM_AUTH_PASSWORD_HASH later).
 */
export function validateDmCredentials(
  username: string,
  password: string,
): DmAccount | null {
  const expectedUser = process.env.DM_AUTH_USERNAME?.trim();
  const expectedPassword = process.env.DM_AUTH_PASSWORD?.trim();
  if (!expectedUser || !expectedPassword) return null;
  if (username.trim() !== expectedUser) return null;
  if (password !== expectedPassword) return null;

  return {
    id: `dm-${expectedUser.toLowerCase()}`,
    username: expectedUser,
    licenseTier: "dm",
    licenseExpiresAt: null,
  };
}

export function isDmHostingEnabled(): boolean {
  return Boolean(process.env.DM_AUTH_SECRET?.trim() && process.env.DM_AUTH_USERNAME?.trim());
}
