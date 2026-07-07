import { NextResponse } from "next/server";
import { isDmHostingEnabled, requireDmSession } from "@/lib/auth";

export async function GET() {
  if (!isDmHostingEnabled()) {
    return NextResponse.json({ authenticated: false, hostingEnabled: false });
  }
  const session = await requireDmSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, hostingEnabled: true });
  }
  return NextResponse.json({
    authenticated: true,
    hostingEnabled: true,
    session,
  });
}
