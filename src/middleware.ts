import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function maxBodyBytes(): number {
  const raw = process.env.MAX_API_BODY_BYTES?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2_000_000;
}

function rateLimitMax(): number {
  const raw = process.env.API_RATE_LIMIT_MAX?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 60;
}

function rateLimitWindowMs(): number {
  const raw = process.env.API_RATE_LIMIT_WINDOW_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "unknown";
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const allowed =
    path === "/api/generate" ||
    path === "/api/generate-realm" ||
    path === "/api/generate-characters" ||
    path === "/api/generate-map-image" ||
    path === "/api/generate-prop-image" ||
    path === "/api/generate-realm-image";
  if (!allowed) {
    return NextResponse.next();
  }
  if (req.method !== "POST") {
    return NextResponse.next();
  }

  const maxBytes = maxBodyBytes();
  const cl = req.headers.get("content-length");
  if (cl) {
    const size = Number(cl);
    if (Number.isFinite(size) && size > maxBytes) {
      return NextResponse.json(
        { error: `Request body too large (max ${maxBytes} bytes).` },
        { status: 413 },
      );
    }
  }

  const key = clientKey(req);
  const now = Date.now();
  const windowMs = rateLimitWindowMs();
  const maxReq = rateLimitMax();

  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > maxReq) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/generate",
    "/api/generate-realm",
    "/api/generate-characters",
    "/api/generate-map-image",
    "/api/generate-prop-image",
    "/api/generate-realm-image",
  ],
};
