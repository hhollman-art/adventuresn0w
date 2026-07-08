import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateSandboxEmail, isSandboxAuthEnabled } from "@/lib/auth/sandboxAccounts";
import { issueAuthenticatedResponse } from "@/lib/auth/issueSession";

const devLoginSchema = z.object({
  email: z.string().min(1),
  returnTo: z.string().optional(),
});

/** Dev-only one-click login for alpha testers — disabled in production builds. */
export async function POST(request: Request) {
  if (!isSandboxAuthEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = devLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const account = authenticateSandboxEmail(parsed.data.email);
  if (!account) {
    return NextResponse.json({ error: "Unknown sandbox account." }, { status: 400 });
  }

  return issueAuthenticatedResponse(account, { returnTo: parsed.data.returnTo ?? null });
}
