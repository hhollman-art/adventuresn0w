import { NextResponse } from "next/server";
import { getPlayerVisibleState } from "@/lib/session-room/serverStore";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/session-room";

type RouteContext = { params: Promise<{ code: string }> };

/** Poll player-visible session state (relay / online mode). */
export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCodeFormat(normalized)) {
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  }

  const result = await getPlayerVisibleState(normalized);
  if (!result) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
