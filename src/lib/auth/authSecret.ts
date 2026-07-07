/** Signing secret for session tokens — required in production. */
export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.DM_AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "development" ? "ddeasy-dev-auth-secret" : "");
  if (!secret) {
    throw new Error("AUTH_SECRET (or DM_AUTH_SECRET) is not configured.");
  }
  return secret;
}

/** True when auth routes can issue signed session cookies. */
export function isAuthEnabled(): boolean {
  try {
    getAuthSecret();
    return true;
  } catch {
    return false;
  }
}

/** True when env-configured admin credentials exist (legacy DM hosting bootstrap). */
export function hasEnvAdminCredentials(): boolean {
  return Boolean(
    process.env.DM_AUTH_USERNAME?.trim() && process.env.DM_AUTH_PASSWORD?.trim(),
  );
}

/** Registration open during the free/open phase unless explicitly disabled. */
export function isRegistrationOpen(): boolean {
  if (process.env.AUTH_ALLOW_REGISTRATION === "false") return false;
  return true;
}
