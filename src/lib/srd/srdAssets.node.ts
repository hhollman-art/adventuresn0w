/**
 * Node transport for SRD Assets — reads `public/srd/*.json` from disk.
 *
 * Covers every entry in `SRD_ASSET_FILES` (entities, document-index,
 * spell-index, document) by mapping its public URL onto `public/`.
 *
 * Import this (not `srdAssets.ts` alone) from server-side code paths that
 * need the SRD tables: API routes, server actions, and the vitest setup file.
 * Never import it from client components — it pulls in `node:fs`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureSrdAssets, setSrdAssetReader } from "./srdAssets";

let registered = false;

/** Resolve a public URL path (`/srd/x.json`) to the file under `public/`. */
export function srdAssetDiskPath(url: string, root: string = process.cwd()): string {
  const relative = url.split("?")[0]!.replace(/^\/+/, "").split("/").join(path.sep);
  return path.join(root, "public", relative);
}

/** Point the shared loader at the filesystem. Idempotent. */
export function registerNodeSrdAssetReader(root?: string): void {
  if (registered) return;
  registered = true;
  setSrdAssetReader((url) => readFile(srdAssetDiskPath(url, root), "utf8"));
}

/** Register the disk reader and load every table. Call at the top of a server handler. */
export async function ensureSrdAssetsOnServer(): Promise<void> {
  registerNodeSrdAssetReader();
  await ensureSrdAssets();
}
