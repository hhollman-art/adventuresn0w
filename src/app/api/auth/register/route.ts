import { z } from "zod";
import { NextResponse } from "next/server";
import {
  createDmSessionToken,
  createFreeAccount,
  emailAlreadyRegistered,
  getPostLoginRedirect,
  isAuthEnabled,
  isRegistrationOpen,
  registerAccount,
  setSessionCookie,
  storedAccountToDmAccount,
  validateAuthFields,
} from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json(
      { error: "Authentication is not configured on this server." },
      { status: 503 },
    );
  }

  if (!isRegistrationOpen()) {
    return NextResponse.json({ error: "Registration is closed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const fieldErrors = validateAuthFields(parsed.data.email, parsed.data.password, "sign-up");
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  if (emailAlreadyRegistered(parsed.data.email)) {
    return NextResponse.json(
      { error: "An account with this email already exists.", fieldErrors: { email: "Email already registered." } },
      { status: 409 },
    );
  }

  let stored;
  try {
    stored = registerAccount(parsed.data.email, parsed.data.password);
  } catch {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  const account = storedAccountToDmAccount(stored) ?? createFreeAccount({
    id: stored.id,
    email: stored.email,
  });

  const token = createDmSessionToken(account);
  const session = {
    dm: account,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
  const redirectTo = getPostLoginRedirect(account);

  const response = NextResponse.json({ token, session, redirectTo });
  setSessionCookie(response, token);
  return response;
}
