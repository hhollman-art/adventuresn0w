import { NextResponse } from "next/server";
import { isSandboxAuthEnabled, listSandboxAccountSummaries, getSandboxPassword } from "@/lib/auth/sandboxAccounts";

/** Dev-only: expose sandbox account metadata (no passwords) for the quick-login panel. */
export async function GET() {
  if (!isSandboxAuthEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    enabled: true,
    accounts: listSandboxAccountSummaries(),
    passwordHint: getSandboxPassword(),
  });
}
