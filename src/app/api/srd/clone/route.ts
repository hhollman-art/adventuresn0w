import { NextResponse } from "next/server";
import { requireDmSession } from "@/lib/auth";
import { buildSrdClonePayload } from "@/lib/srd/cloneSrdEntity";
import { listSrdEntities, parseSrdEntityId } from "@/lib/srd/corpus";
import { ensureSrdAssetsOnServer } from "@/lib/srd/srdAssets.node";
import type { SrdEntityKind } from "@/lib/srd/types";

type CloneBody =
  | { entityId: string }
  | { kind: SrdEntityKind; bulk: true };

function parseBody(body: unknown): CloneBody | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  if (typeof o.entityId === "string") return { entityId: o.entityId };
  if (o.bulk === true && typeof o.kind === "string") {
    return { kind: o.kind as SrdEntityKind, bulk: true };
  }
  return null;
}

/**
 * POST /api/srd/clone
 *
 * Validates an SRD clone request and returns the prepared payload.
 * Persistence happens client-side (IndexedDB) today; this route is the
 * server-side contract for a future multi-tenant database.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Provide { entityId } or { kind, bulk: true }." },
      { status: 400 },
    );
  }

  const session = await requireDmSession();
  const userId = session?.dm.id ?? null;

  // SRD tables are on-demand assets (public/srd/*.json); load them before any lookup.
  await ensureSrdAssetsOnServer();

  if ("bulk" in parsed && parsed.bulk) {
    const count = listSrdEntities(parsed.kind).length;
    if (count === 0) {
      return NextResponse.json({ error: "No entities in that category." }, { status: 404 });
    }
    return NextResponse.json({
      mode: "bulk",
      kind: parsed.kind,
      count,
      userId,
      message:
        "Bulk clone must be completed in the browser workspace (IndexedDB). Use the client clone helper.",
    });
  }

  if ("entityId" in parsed) {
    const entityId = parseSrdEntityId(parsed.entityId);
    if (!entityId) {
      return NextResponse.json({ error: "Invalid SRD entity id." }, { status: 400 });
    }

    try {
      const payload = await buildSrdClonePayload(entityId, { userId, syncOnly: true });
      return NextResponse.json({
        mode: "single",
        userId,
        entityId,
        targetStorage: payload.targetStorage,
        clone: {
          sourceSrdEntityId: entityId,
          kind: payload.entity.kind,
          name: payload.entity.name,
          subtitle: payload.entity.subtitle ?? null,
          markdown: payload.markdown,
          isReadOnly: false,
          provenance: "user",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Clone failed.";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Invalid clone request." }, { status: 400 });
}
