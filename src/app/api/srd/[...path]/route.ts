import { NextResponse } from "next/server";

const UPSTREAM = "https://www.dnd5eapi.co/api";

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { path } = await params;
  if (!path?.length) {
    return NextResponse.json({ error: "Missing API path" }, { status: 400 });
  }

  const upstreamUrl = `${UPSTREAM}/${path.map(encodeURIComponent).join("/")}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const body = await upstream.json();
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream fetch failed" },
      { status: 502 },
    );
  }
}
