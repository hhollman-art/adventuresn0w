import { z } from "zod";
import { NextResponse } from "next/server";
import { requireDmSession } from "@/lib/auth";
import { syncDmMasterState } from "@/lib/session-room/serverStore";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/session-room";
import type { TabletopSession } from "@/lib/tabletop/types";

type RouteContext = { params: Promise<{ code: string }> };

const hostSyncSchema = z.object({
  state: z.object({ version: z.literal(1) }).passthrough(),
});

/** DM host pushes master TabletopSession to the relay (online mode). */
export async function POST(request: Request, context: RouteContext) {
  const dmSession = await requireDmSession();
  if (!dmSession) {
    return NextResponse.json({ error: "DM authentication required." }, { status: 401 });
  }

  const { code } = await context.params;
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(normalized)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = hostSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }

  const room = await syncDmMasterState(
    normalized,
    dmSession.dm.id,
    parsed.data.state as TabletopSession,
  );
  if (!room) {
    return NextResponse.json({ error: "Room not found or access denied." }, { status: 404 });
  }

  return NextResponse.json({ revision: room.revision, ok: true });
}
