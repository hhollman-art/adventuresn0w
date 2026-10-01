/**
 * Vitest setup — load the SRD Asset tables from `public/srd/*.json` before any
 * test file runs, so synchronous SRD lookups (`getSrdEntity`,
 * `findSpellIndexEntry`, `lookupSrdDocumentMarkdown`, …) see data exactly as
 * they did when the tables were compiled into the bundle.
 */
import { ensureSrdAssetsOnServer } from "./src/lib/srd/srdAssets.node";

await ensureSrdAssetsOnServer();
