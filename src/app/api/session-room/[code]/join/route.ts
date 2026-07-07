import { NextResponse } from "next/server";
import { playerJoinRequestSchema } from "@/lib/session-room";
import { joinSessionRoom } from "@/lib/session-room/serverStore";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/session-room";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * Unauthenticated player join handshake.
 * Tablet sends BYOD character JSON; gateway merges into DM master state.
 */
export async function POST(request: Request, context: RouteContext) {
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

  const parsed = playerJoinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid join payload." }, { status: 400 });
  }

  const result = joinSessionRoom(normalized, parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Room not found or closed." }, { status: 404 });
  }

  return NextResponse.json(result);
}
