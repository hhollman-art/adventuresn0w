import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/** Static SRD Assets served from `public/srd/` (see `src/lib/srd/srdAssets.ts`). */
const SRD_ASSET_FILES = ["entities.json", "document-index.json", "spell-index.json", "document.json"];

/**
 * Content hash of every SRD Asset. The client fetches `/srd/<file>.json?v=<hash>`,
 * so a rules update changes the URL and the year-long immutable cache can never
 * serve stale tables.
 */
function srdAssetVersion(): string {
  const hash = createHash("sha256");
  for (const file of SRD_ASSET_FILES) {
    hash.update(file);
    hash.update(readFileSync(path.join(process.cwd(), "public", "srd", file)));
  }
  return hash.digest("hex").slice(0, 16);
}

const SRD_ASSET_VERSION = srdAssetVersion();

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` (which owns `.next/`).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // gzip for every response from `next start`, including `public/` JSON.
  // Brotli is negotiated by the CDN / reverse proxy in front of Next.
  compress: true,
  env: {
    NEXT_PUBLIC_SRD_ASSET_VERSION: SRD_ASSET_VERSION,
  },
  async headers() {
    return [
      // Non-versioned (or stale-version) requests: always revalidate. The
      // static file server answers with an ETag, so a warm repeat is a 304.
      {
        source: "/srd/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Vary", value: "Accept-Encoding" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // Current content version: cache for a year, never revalidate. Listed
      // last so its Cache-Control overrides the rule above.
      {
        source: "/srd/:path*",
        has: [{ type: "query", key: "v", value: SRD_ASSET_VERSION }],
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
