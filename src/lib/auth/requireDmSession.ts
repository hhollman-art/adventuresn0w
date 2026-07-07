import { cookies } from "next/headers";
import type { DmAuthSession } from "./types";
import { DM_SESSION_COOKIE, verifyDmSessionToken } from "./dmSession";

/** Read the authenticated DM session from the HttpOnly cookie (server routes only). */
export async function requireDmSession(): Promise<DmAuthSession | null> {
  const jar = await cookies();
  const token = jar.get(DM_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyDmSessionToken(token);
}
