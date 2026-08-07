import { NextResponse } from "next/server";
import { getSessionRoomByCode } from "@/lib/session-room/serverStore";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/session-room";

type RouteContext = { params: Promise<{ code: string }> };

/** Public room lookup — validates code without exposing master state. */
export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(normalized)) {
    return NextResponse.json({ valid: false, error: "Invalid room code format." }, { status: 400 });
  }

  const room = await getSessionRoomByCode(normalized);
  if (!room) {
    return NextResponse.json({ valid: false, error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    code: room.code,
    status: room.status,
    transport: room.transport,
    playerCount: room.players.length,
    expiresAt: room.expiresAt,
  });
}
