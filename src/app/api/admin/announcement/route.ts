import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDmSession } from "@/lib/auth/requireDmSession";
import { isAdmin } from "@/lib/auth/tiers";
import type { AnnouncementConfig } from "@/lib/admin/announcementConfig";

const patchSchema = z.object({
  active: z.boolean(),
  message: z.string().max(280),
  variant: z.enum(["arcane-amber", "abyssal-crimson", "void-purple"]),
  updatedAt: z.string().optional(),
});

/**
 * Admin-only announcement config endpoint.
 * MVP returns 501 — client falls back to localStorage via saveAnnouncementConfigRemote.
 */
export async function PATCH(request: Request) {
  const session = await requireDmSession();
  if (!session || !isAdmin(session.dm)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid announcement payload." }, { status: 400 });
  }

  const config: AnnouncementConfig = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  // TODO: persist to KV / database and invalidate edge config cache.
  return NextResponse.json({ ok: true, config }, { status: 501 });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use client storage until admin KV is wired." },
    { status: 501 },
  );
}
