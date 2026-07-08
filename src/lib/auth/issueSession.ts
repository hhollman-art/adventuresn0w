import { NextResponse } from "next/server";
import type { DmAccount, DmLoginResponse } from "./types";
import { createDmSessionToken, setSessionCookie } from "./dmSession";
import { getPostLoginRedirect } from "./tiers";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Issue a signed session cookie and JSON payload after successful authentication. */
export function issueAuthenticatedResponse(
  account: DmAccount,
  options?: { returnTo?: string | null },
): NextResponse<DmLoginResponse> {
  const token = createDmSessionToken(account);
  const issuedAt = new Date();
  const session = {
    dm: account,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + SESSION_TTL_MS).toISOString(),
  };
  const redirectTo =
    options?.returnTo && options.returnTo.startsWith("/")
      ? options.returnTo
      : getPostLoginRedirect(account);

  const response = NextResponse.json({ token, session, redirectTo });
  setSessionCookie(response, token);
  return response;
}
