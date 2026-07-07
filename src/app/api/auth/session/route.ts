import { NextResponse } from "next/server";
import { isAuthEnabled, isDmHostingEnabled, requireDmSession } from "@/lib/auth";

export async function GET() {
  const authEnabled = isAuthEnabled();
  const hostingEnabled = isDmHostingEnabled();

  if (!authEnabled) {
    return NextResponse.json({ authenticated: false, hostingEnabled, authEnabled: false });
  }

  const session = await requireDmSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, hostingEnabled, authEnabled: true });
  }

  return NextResponse.json({
    authenticated: true,
    hostingEnabled,
    authEnabled: true,
    session,
  });
}
