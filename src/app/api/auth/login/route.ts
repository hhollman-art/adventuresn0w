import { z } from "zod";
import { NextResponse } from "next/server";
import {
  createDmSessionToken,
  DM_SESSION_COOKIE,
  isDmHostingEnabled,
  validateDmCredentials,
} from "@/lib/auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isDmHostingEnabled()) {
    return NextResponse.json(
      { error: "DM hosting is not configured on this server." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const dm = validateDmCredentials(parsed.data.username, parsed.data.password);
  if (!dm) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createDmSessionToken(dm);
  const response = NextResponse.json({
    token,
    session: {
      dm,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    },
  });
  response.cookies.set(DM_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
