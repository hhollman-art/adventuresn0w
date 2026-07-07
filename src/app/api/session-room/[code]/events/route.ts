import { z } from "zod";
import { NextResponse } from "next/server";
import { applyRoomMutation } from "@/lib/session-room/serverStore";
import { isValidRoomCodeFormat, normalizeRoomCode } from "@/lib/session-room";

type RouteContext = { params: Promise<{ code: string }> };

const mutationPostSchema = z.object({
  seatId: z.string(),
  playerToken: z.string(),
  baseRevision: z.number().int().min(0),
  mutation: z.object({
    type: z.string(),
  }).passthrough(),
});

/** Player posts a lightweight mutation event to the DM host state. */
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

  const parsed = mutationPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mutation envelope." }, { status: 400 });
  }

  const result = applyRoomMutation(
    normalized,
    parsed.data.seatId,
    parsed.data.playerToken,
    {
      baseRevision: parsed.data.baseRevision,
      mutation: parsed.data.mutation as never,
    },
  );

  if (!result) {
    return NextResponse.json({ error: "Mutation rejected." }, { status: 403 });
  }

  return NextResponse.json(result);
}
