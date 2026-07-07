import { createHmac, timingSafeEqual } from "crypto";
import type { DmAccount, DmAuthSession } from "./types";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function signingSecret(): string {
  const secret = process.env.DM_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("DM_AUTH_SECRET is not configured.");
  }
  return secret;
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromB64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", signingSecret()).update(payloadB64).digest("base64url");
}

/** Issue a stateless signed DM session token (JWT-style, no external deps). */
export function createDmSessionToken(dm: DmAccount, ttlMs = TOKEN_TTL_MS): string {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ttlMs);
  const payload: DmAuthSession = {
    dm,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify a DM session token; returns null when invalid or expired. */
export function verifyDmSessionToken(token: string): DmAuthSession | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const session = JSON.parse(fromB64url(payloadB64)) as DmAuthSession;
    if (!session?.dm?.id || !session.expiresAt) return null;
    if (Date.now() > Date.parse(session.expiresAt)) return null;
    return session;
  } catch {
    return null;
  }
}

export const DM_SESSION_COOKIE = "ddeasy-dm-session";
