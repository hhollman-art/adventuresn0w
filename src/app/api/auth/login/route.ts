import { z } from "zod";
import { NextResponse } from "next/server";
import {
  authenticateCredentials,
  isAuthEnabled,
  validateAuthFields,
} from "@/lib/auth";
import { issueAuthenticatedResponse } from "@/lib/auth/issueSession";

const loginSchema = z.object({
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const fieldErrors = validateAuthFields(parsed.data.email, parsed.data.password, "sign-in");
  if (fieldErrors.email || fieldErrors.password) {
    return NextResponse.json(
      { error: "Check your email and password.", fieldErrors },
      { status: 400 },
    );
  }

  const account = authenticateCredentials(parsed.data.email, parsed.data.password);
  if (!account) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  return issueAuthenticatedResponse(account);
}
