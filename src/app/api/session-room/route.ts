import { z } from "zod";
import { NextResponse } from "next/server";
import { isDmHostingEnabled, requireDmSession } from "@/lib/auth";
import { createSessionRoom } from "@/lib/session-room/serverStore";

const createRoomSchema = z.object({
  transport: z.enum(["local", "relay"]).optional(),
});

/** Authenticated DM creates a new SessionRoom and receives a room code. */
export async function POST(request: Request) {
  if (!isDmHostingEnabled()) {
    return NextResponse.json({ error: "DM hosting is not configured." }, { status: 503 });
  }

  const dmSession = await requireDmSession();
  if (!dmSession) {
    return NextResponse.json({ error: "DM authentication required." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await createSessionRoom(
    dmSession.dm.id,
    parsed.data.transport ?? "relay",
  );

  return NextResponse.json({
    roomId: result.room.id,
    code: result.room.code,
    transport: result.room.transport,
    expiresAt: result.room.expiresAt,
    joinUrl: result.joinUrl,
  });
}
